const assert = require('node:assert/strict')
const test = require('node:test')
const { assertLocalBrowserTargets } = require('./central-auth-browser-guards.cjs')

test('accepts three app URLs on one local hostname', () => {
  assert.doesNotThrow(() =>
    assertLocalBrowserTargets({
      site: new URL('http://localhost:3000'),
      monitor: new URL('http://localhost:3002'),
      news: new URL('http://localhost:3001')
    })
  )
})

test('rejects a remote app URL before creating auth fixtures', () => {
  assert.throws(
    () =>
      assertLocalBrowserTargets({
        site: new URL('https://vpn.labafero.com'),
        monitor: new URL('http://localhost:3002'),
        news: new URL('http://localhost:3001')
      }),
    /same local hostname/
  )
})

test('rejects different local hostnames that cannot share a host-only cookie', () => {
  assert.throws(
    () =>
      assertLocalBrowserTargets({
        site: new URL('http://localhost:3000'),
        monitor: new URL('http://127.0.0.1:3002'),
        news: new URL('http://localhost:3001')
      }),
    /same local hostname/
  )
})
