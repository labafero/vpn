import { expect, test } from 'vitest'
import { allowSentryRequest } from '../server/utils/sentry-proxy'
import * as proxy from '../server/utils/sentry-proxy'

const origin = 'https://monitor.test'
test('proxy allows only contracted routes and methods', () => {
  expect(proxy.allowSentryRequest('me', 'GET', undefined, undefined, origin)).toBe(true)
  expect(
    proxy.allowSentryRequest('me/openai-credential', 'GET', undefined, undefined, origin)
  ).toBe(true)
  expect(proxy.allowSentryRequest('me/openai-credential', 'POST', origin, '1', origin)).toBe(true)
  expect(proxy.allowSentryRequest('me/openai-credential', 'DELETE', origin, '1', origin)).toBe(true)
  expect(
    proxy.allowSentryRequest('me/openai-credential', 'DELETE', origin, undefined, origin)
  ).toBe(false)
  expect(
    proxy.allowSentryRequest(
      'provider-connections/twitch/callback',
      'GET',
      undefined,
      undefined,
      origin
    )
  ).toBe(true)
  for (const path of [
    'https://evil.test',
    '../me',
    'posts',
    'provider-connections/twitch/other',
    'me?path=evil'
  ]) {
    expect(proxy.allowSentryRequest(path, 'GET', undefined, undefined, origin)).toBe(false)
  }
  expect(proxy.allowSentryRequest('me', 'DELETE', origin, '1', origin)).toBe(false)
})
test('mutations require same origin and CSRF header', () => {
  expect(
    proxy.allowSentryRequest('provider-connections/twitch/authorize', 'POST', origin, '1', origin)
  ).toBe(true)
  expect(
    proxy.allowSentryRequest(
      'provider-connections/twitch',
      'DELETE',
      'https://evil.test',
      '1',
      origin
    )
  ).toBe(false)
  expect(
    proxy.allowSentryRequest('provider-connections/twitch', 'DELETE', origin, undefined, origin)
  ).toBe(false)
  expect(
    proxy.allowSentryRequest('provider-connections/twitch', 'DELETE', undefined, '1', origin)
  ).toBe(false)
})
test('monitoring proxy allowlist is exact and protects mutations', () => {
  expect(proxy.allowSentryRequest('channels', 'GET', undefined, undefined, origin)).toBe(true)
  expect(
    proxy.allowSentryRequest(
      'channels/20000000-0000-0000-0000-000000000001/monitoring',
      'PATCH',
      origin,
      '1',
      origin
    )
  ).toBe(true)
  expect(
    proxy.allowSentryRequest(
      'sessions/30000000-0000-0000-0000-000000000001/invites',
      'POST',
      origin,
      '1',
      origin
    )
  ).toBe(true)
  expect(proxy.allowSentryRequest('invites/accept', 'POST', origin, '1', origin)).toBe(true)
  expect(proxy.allowSentryRequest('sessions/not-a-uuid', 'GET', undefined, undefined, origin)).toBe(
    false
  )
  expect(
    proxy.allowSentryRequest(
      'sessions/30000000-0000-0000-0000-000000000001/invites',
      'POST',
      undefined,
      '1',
      origin
    )
  ).toBe(false)
  expect(
    proxy.allowSentryRequest('provider-connections/twitch/monitoring', 'PATCH', origin, '1', origin)
  ).toBe(false)
})

test('clip routes require strict UUID, method and CSRF', () => {
  const base = 'channels/00000000-0000-0000-0000-000000000001'
  expect(
    allowSentryRequest(`${base}/clips`, 'POST', 'https://monitor.test', '1', 'https://monitor.test')
  ).toBe(true)
  expect(
    allowSentryRequest(`${base}/clips`, 'GET', undefined, undefined, 'https://monitor.test')
  ).toBe(true)
  expect(
    allowSentryRequest(`${base}/clip-consent`, 'GET', undefined, undefined, 'https://monitor.test')
  ).toBe(true)
  expect(
    allowSentryRequest(
      `${base}/clip-consent`,
      'PATCH',
      'https://monitor.test',
      undefined,
      'https://monitor.test'
    )
  ).toBe(false)
  expect(
    allowSentryRequest(
      'channels/invalid/clips',
      'POST',
      'https://monitor.test',
      '1',
      'https://monitor.test'
    )
  ).toBe(false)
})
