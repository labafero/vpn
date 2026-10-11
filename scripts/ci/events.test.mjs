import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

test('real Git event comparisons, deletion, PR divergence and full fallback', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'vpn-ci-'))
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
  const commit = (message) => {
    git('add', '.')
    git('-c', 'user.name=CI Test', '-c', 'user.email=ci@example.invalid', 'commit', '-qm', message)
    return git('rev-parse', 'HEAD')
  }
  const select = (eventName, event) => {
    const eventPath = join(cwd, 'event.json')
    const outputPath = join(cwd, 'output.txt')
    writeFileSync(eventPath, JSON.stringify(event))
    writeFileSync(outputPath, '')
    execFileSync(process.execPath, [fileURLToPath(new URL('./affected.mjs', import.meta.url))], {
      cwd,
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: eventName,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_OUTPUT: outputPath
      },
      stdio: 'pipe'
    })
    return Object.fromEntries(
      readFileSync(outputPath, 'utf8')
        .trim()
        .split('\n')
        .map((line) => {
          const position = line.indexOf('=')
          return [line.slice(0, position), JSON.parse(line.slice(position + 1))]
        })
    )
  }
  try {
    for (const name of ['site', 'news', 'monitor', 'sentry']) {
      mkdirSync(join(cwd, `vpn-${name}`))
      writeFileSync(
        join(cwd, `vpn-${name}/package.json`),
        JSON.stringify({ name: `@vpn/${name}`, scripts: { build: 'nuxt build' } })
      )
    }
    mkdirSync(join(cwd, 'packages'))
    git('init', '-q')
    writeFileSync(join(cwd, 'vpn-site/deleted.vue'), 'template')
    const base = commit('base')
    rmSync(join(cwd, 'vpn-site/deleted.vue'))
    const head = commit('delete Site file')
    assert.deepEqual(select('push', { before: base, after: head }), {
      code: true,
      apps: ['@vpn/site'],
      database: false,
      sql: false
    })
    git('checkout', '-q', '-b', 'diverged', base)
    writeFileSync(join(cwd, 'vpn-monitor/unrelated.vue'), 'template')
    const other = commit('unrelated base advancement')
    assert.deepEqual(
      select('pull_request', { pull_request: { base: { sha: other }, head: { sha: head } } }).apps,
      ['@vpn/site']
    )
    assert.equal(select('push', { before: '0'.repeat(40), after: head }).sql, true)
    assert.equal(select('workflow_dispatch', {}).apps.length, 4)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
