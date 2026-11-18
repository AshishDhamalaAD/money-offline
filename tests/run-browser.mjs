import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

// Uses a fresh Chrome profile and an isolated Vite origin; never opens user data.
const profile = await mkdtemp(join(tmpdir(), 'money-tests-'))
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
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
