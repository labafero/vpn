import assert from 'node:assert/strict'
import { test } from 'node:test'
import { selectChecks } from './affected.mjs'

const workspaces = [
  { path: 'vpn-site', name: '@vpn/site', scripts: { build: 'nuxt build' } },
  {
    path: 'vpn-news',
    name: '@vpn/news',
    scripts: { build: 'nuxt build' },
    dependencies: { '@vpn/database': 'workspace:*', '@vpn/contracts': 'workspace:*' }
  },
  {
    path: 'vpn-monitor',
    name: '@vpn/monitor',
    scripts: { build: 'nuxt build' },
    dependencies: { '@vpn/database': 'workspace:*', '@vpn/contracts': 'workspace:*' }
  },
  {
    path: 'vpn-sentry',
    name: '@vpn/sentry',
    scripts: { build: 'nuxt build' },
    dependencies: { '@vpn/contracts': 'workspace:*', '@vpn/database': 'workspace:*' }
  },
  { path: 'packages/database', name: '@vpn/database' },
  { path: 'packages/contracts', name: '@vpn/contracts' }
]
const select = (files, full = false) => selectChecks(files, workspaces, full)

test('Site-only builds Site without a database', () => {
  assert.deepEqual(select(['vpn-site/app/pages/index.vue']), {
    code: true,
    apps: ['@vpn/site'],
    database: false,
    sql: false
  })
})
test('shared package changes reach their consumers', () => {
  assert.deepEqual(select(['packages/database/src/index.ts']).apps, [
    '@vpn/news',
    '@vpn/monitor',
    '@vpn/sentry'
  ])
  assert.deepEqual(select(['packages/contracts/openapi.yaml']).apps, [
    '@vpn/news',
    '@vpn/monitor',
    '@vpn/sentry'
  ])
  assert.equal(select(['packages/contracts/openapi.yaml']).database, true)
})
test('database inputs run SQL and News prerender', () => {
  for (const path of [
    'supabase/migrations/deleted.sql',
    'supabase/tests/policy.sql',
    'supabase/config.toml'
  ]) {
    assert.equal(select([path]).sql, true)
    assert.equal(select([path]).database, true)
    assert.ok(select([path]).apps.includes('@vpn/news'))
    assert.equal(select([path]).apps.length, 4)
  }
})
test('global configuration and manual mode run everything', () => {
  for (const path of [
    'pnpm-lock.yaml',
    '.github/workflows/ci.yml',
    'scripts/ci/affected.mjs',
    'new-global-config.json'
  ]) {
    assert.equal(select([path]).apps.length, 4)
    assert.equal(select([path]).sql, true)
  }
  assert.equal(select([], true).apps.length, 4)
  assert.equal(select([], true).sql, true)
})
test('documentation-only changes skip expensive checks', () => {
  assert.deepEqual(select(['docs/notes.md', 'README.md', 'AGENTS.md']), {
    code: false,
    apps: [],
    database: false,
    sql: false
  })
})
test('dependency graph propagates transitively through packages', () => {
  const graph = [...workspaces, { path: 'packages/core', name: '@vpn/core' }].map((w) =>
    w.name === '@vpn/database' ? { ...w, devDependencies: { '@vpn/core': 'workspace:*' } } : w
  )
  assert.deepEqual(selectChecks(['packages/core/src/index.ts'], graph).apps, [
    '@vpn/news',
    '@vpn/monitor',
    '@vpn/sentry'
  ])
})
