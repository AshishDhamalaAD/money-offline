import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

// Uses a fresh Chrome profile and an isolated Vite origin; never opens user data.
const profile = await mkdtemp(join(tmpdir(), 'money-tests-'))
const candidates = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean)
let chromePath
for (const candidate of candidates) {
  try { await access(candidate); chromePath = candidate; break } catch { /* try next installed browser */ }
}
if (!chromePath) throw new Error('No Chromium browser found. Set CHROME_PATH to the browser executable.')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5298', '--strictPort'], { stdio: 'pipe' })
const serverReady = new Promise((resolve, reject) => {
  let output = ''
  server.stdout.on('data', chunk => { output += chunk; if (output.includes('http://127.0.0.1:5298/')) resolve() })
  server.stderr.on('data', chunk => { output += chunk })
  server.on('error', reject)
  server.on('exit', code => { if (code) reject(new Error(output || `Vite exited with ${code}`)) })
})
let chrome
let socket
const pending = new Map()
let sequence = 0
async function waitFor(read) {
  for (let i = 0; i < 100; i++) {
    try { return await read() } catch { await delay(100) }
  }
  throw new Error('Timed out waiting for browser or server')
}
function send(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)) }, 60000)
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result) }, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
try {
  await serverReady
  await waitFor(async () => { const r = await fetch('http://127.0.0.1:5298/tests/data-flows.html'); if (!r.ok) throw Error(); return r })
  chrome = spawn(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'http://127.0.0.1:5298/tests/data-flows.html'], { stdio: 'ignore' })
  const port = await waitFor(async () => Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]))
  const tabs = await waitFor(async () => { const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (!pages.find(p => p.type === 'page')) throw Error(); return pages })
  socket = new WebSocket(tabs.find(p => p.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.bindingCalled' && message.params.name === '__moneyKeyboard') {
      const request = JSON.parse(message.params.payload)
      const code = { Tab: 9, Enter: 13, Escape: 27, ' ': 32, Home: 36, End: 35, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 }[request.key]
      const params = { key: request.key, code: request.key === ' ' ? 'Space' : request.key, windowsVirtualKeyCode: code, modifiers: request.shift ? 8 : 0 }
      ;(async () => {
        await send('Input.dispatchKeyEvent', { ...params, type: 'keyDown', text: request.key === 'Enter' ? '\r' : request.key === ' ' ? ' ' : undefined })
        await send('Input.dispatchKeyEvent', { ...params, type: 'keyUp' })
        await send('Runtime.evaluate', { expression: `window.__moneyResolveKey(${request.id})` })
      })().catch(error => {
        for (const entry of pending.values()) entry.reject(error)
        pending.clear()
      })
      return
    }
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    if (message.error) entry.reject(new Error(message.error.message))
    else entry.resolve(message.result)
  })
  await waitFor(async () => {
    const state = await send('Runtime.evaluate', { expression: "document.readyState === 'complete' && location.pathname === '/tests/data-flows.html'", returnByValue: true })
    if (!state.result?.value) throw new Error('Page still loading')
    return true
  })
  await send('Runtime.addBinding', { name: '__moneyKeyboard' })
  await send('Runtime.evaluate', { expression: `(() => {
    let sequence = 0;
    const keys = new Map();
    window.moneyPressKey = (key, shift = false) => new Promise(resolve => {
      const id = ++sequence; keys.set(id, resolve); window.__moneyKeyboard(JSON.stringify({ id, key, shift }));
    });
    window.__moneyResolveKey = id => { keys.get(id)?.(); keys.delete(id); };
  })()` })
  const result = await send('Runtime.evaluate', { expression: "import('/tests/data-flows.js').then(module => module.runDataTests())", awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  for (const name of result.result.value) console.log(`PASS ${name}`)
} finally {
  socket?.close()
  chrome?.kill()
  server.kill()
  await delay(500)
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
