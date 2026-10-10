import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { FoundationError } from './api-error'

export type Tokens = { accessToken: string; refreshToken: string }
export type EncryptedTokens = { ciphertext: string; iv: string; tag: string; keyVersion: string }

function parseKey(key: string) {
  const decoded = Buffer.from(key, 'base64')
  if (decoded.length !== 32 || decoded.toString('base64') !== key) throw new FoundationError(503)
  return decoded
}

export function encryptTokens(tokens: Tokens, key: string, keyVersion: string): EncryptedTokens {
  if (!keyVersion) throw new FoundationError(503)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', parseKey(key), iv)
  cipher.setAAD(Buffer.from(keyVersion))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()])
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), keyVersion }
}

export function decryptTokens(value: EncryptedTokens, key: string, keyVersion: string): Tokens {
  try {
    if (value.keyVersion !== keyVersion) throw new Error('version')
    const decipher = createDecipheriv('aes-256-gcm', parseKey(key), Buffer.from(value.iv, 'base64'))
    decipher.setAAD(Buffer.from(keyVersion))
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
    const tokens = JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8')) as Tokens
    if (typeof tokens.accessToken !== 'string' || typeof tokens.refreshToken !== 'string') throw new Error('tokens')
    return tokens
  } catch { throw new FoundationError(503) }
}
