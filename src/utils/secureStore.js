import { db } from '@/db/dexie'

export const secureStorageAvailable = Boolean(globalThis.crypto?.subtle)
const ITERATIONS = 210000
const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
const decode = value => Uint8Array.from(atob(value), character => character.charCodeAt(0))

async function pinDigest(pin, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256))
}

async function writePin(pin) {
  if (!secureStorageAvailable) {
    await db.settings.put({ key: 'pinCode', value: pin })
    return
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pinDigest(pin, salt, ITERATIONS)
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({ key: 'pinHash', value: { salt: encode(salt), iterations: ITERATIONS, hash: encode(hash) } })
    await db.settings.delete('pinCode')
  })
}

async function tokenKey() {
  const existing = await db.settings.get('tokenKey')
  if (existing?.value) return existing.value
  const candidate = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  return db.transaction('rw', db.settings, async () => {
    const saved = await db.settings.get('tokenKey')
    if (saved?.value) return saved.value
    await db.settings.put({ key: 'tokenKey', value: candidate })
    return candidate
  })
}

async function writeToken(token) {
  if (!secureStorageAvailable) {
    await db.settings.put({ key: 'apiToken', value: token })
    return
  }
  const key = await tokenKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token))
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({ key: 'apiTokenEnc', value: { iv: encode(iv), ciphertext: encode(ciphertext) } })
    await db.settings.delete('apiToken')
  })
}

let migration
export function migrateSecrets() {
  if (!secureStorageAvailable) return Promise.resolve()
  if (!migration) {
    migration = (async () => {
      const work = async () => {
        const pin = await db.settings.get('pinCode')
        if (pin?.value != null) await writePin(String(pin.value))
        else await db.settings.delete('pinCode')
        const token = await db.settings.get('apiToken')
        if (token?.value != null) await writeToken(String(token.value))
      }
      if (globalThis.navigator?.locks) await navigator.locks.request('money-secret-migration', work)
      else await work()
    })().finally(() => { migration = null })
  }
  return migration
}

export async function getApiToken() {
  await migrateSecrets()
  const encrypted = await db.settings.get('apiTokenEnc')
  if (encrypted?.value) {
    if (!secureStorageAvailable) throw new Error('Open the app over HTTPS to read your encrypted API token.')
    const key = (await db.settings.get('tokenKey'))?.value
    if (!key) throw new Error('The device encryption key is missing. Enter your API token again.')
    const value = encrypted.value
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(value.iv) }, key, decode(value.ciphertext))
    return new TextDecoder().decode(clear)
  }
  return (await db.settings.get('apiToken'))?.value || ''
}

export async function setApiToken(token) {
  await migrateSecrets()
  await writeToken(token)
}

export async function setPin(pin) {
  if (!/^\d{6}$/.test(pin)) throw new Error('Enter a six-digit PIN.')
  await migrateSecrets()
  await writePin(pin)
}

export async function verifyPin(pin) {
  await migrateSecrets()
  const saved = (await db.settings.get('pinHash'))?.value
  if (!saved) return (await db.settings.get('pinCode'))?.value === pin
  if (!secureStorageAvailable) throw new Error('Open the app over HTTPS to unlock with your PIN.')
  const actual = await pinDigest(pin, decode(saved.salt), saved.iterations)
  const expected = decode(saved.hash)
  let difference = actual.length ^ expected.length
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i]
  return difference === 0
}
