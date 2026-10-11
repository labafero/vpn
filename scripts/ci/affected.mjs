import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function selectChecks(files, workspaces, full = false) {
  const selected = new Set()
  let code = full
  let sql = full
  for (const path of files) {
    if (path.endsWith('.md') || path.startsWith('docs/')) continue
    code = true
    const workspace = workspaces.find((w) => path.startsWith(`${w.path}/`))
    if (workspace) selected.add(workspace.name)
    else if (path.startsWith('supabase/')) {
      if (path.startsWith('supabase/operations/')) continue
      sql = true
      full = true
    } else full = true
  }
  if (full) {
    code = true
    sql = true
    for (const workspace of workspaces) selected.add(workspace.name)
  }
  let changed = true
  while (changed) {
    changed = false
    for (const workspace of workspaces) {
      const dependencies = {
        ...workspace.dependencies,
        ...workspace.devDependencies,
        ...workspace.optionalDependencies
      }
      if (
        !selected.has(workspace.name) &&
        Object.keys(dependencies).some((name) => selected.has(name))
      ) {
        selected.add(workspace.name)
        changed = true
      }
    }
  }
  const apps = workspaces.filter((w) => selected.has(w.name) && w.scripts?.build).map((w) => w.name)
  return { code, apps, database: sql || apps.includes('@vpn/news'), sql }
}

function main() {
  const directories = [
    'vpn-site',
    'vpn-news',
    'vpn-monitor',
    'vpn-sentry',
    ...readdirSync('packages', { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `packages/${entry.name}`)
  ]
  const workspaces = directories.map((path) => ({
    ...JSON.parse(readFileSync(`${path}/package.json`, 'utf8')),
    path
  }))
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  let full = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch'
  let files = []
  if (!full) {
    try {
      const head = event.pull_request?.head.sha || event.after
      let base = event.pull_request?.base.sha || event.before
      if (!base || /^0+$/.test(base) || !head) throw new Error('No comparison history')
      if (event.pull_request)
        base = execFileSync('git', ['merge-base', base, head], { encoding: 'utf8' }).trim()
      files = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head], {
        encoding: 'utf8'
      })
        .split('\0')
        .filter(Boolean)
    } catch {
      console.log('Comparison unavailable: running the complete pipeline.')
      full = true
    }
  }
  const result = selectChecks(files, workspaces, full)
  for (const [key, value] of Object.entries(result))
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${JSON.stringify(value)}\n`)
  console.log(JSON.stringify(result))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
