import { expect, test } from 'vitest'
import * as crypto from '../server/utils/token-crypto'

const key = Buffer.alloc(32, 7).toString('base64')
test('credentials roundtrip without plaintext storage', () => {
  const input = { accessToken: 'private-access', refreshToken: 'private-refresh' }
  const output = crypto.encryptTokens(input, key, 'v1')
  expect(JSON.stringify(output)).not.toContain('private-')
  expect(crypto.decryptTokens(output, key, 'v1')).toEqual(input)
})
test('tampering or wrong key version fails closed', () => {
  const output = crypto.encryptTokens({ accessToken: 'a', refreshToken: 'b' }, key, 'v1')
  expect(() => crypto.decryptTokens({ ...output, tag: Buffer.alloc(16).toString('base64') }, key, 'v1')).toThrow()
  expect(() => crypto.decryptTokens(output, key, 'v2')).toThrow()
})
test('missing or short key is rejected', () => {
  for (const bad of ['', Buffer.alloc(16).toString('base64')]) expect(() => crypto.encryptTokens({ accessToken: 'a', refreshToken: 'b' }, bad, 'v1')).toThrow()
})
