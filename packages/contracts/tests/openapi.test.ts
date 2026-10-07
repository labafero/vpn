import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, expect, test } from 'vitest'

const document = readFileSync(resolve('packages/contracts/openapi.yaml'), 'utf8')
const directories: string[] = []
afterEach(() => directories.splice(0).forEach(path => rmSync(path, { recursive: true })))

function check(source: string, generated?: string) {
  const directory = mkdtempSync(join(tmpdir(), 'vpn-contract-'))
  directories.push(directory)
  const path = join(directory, 'openapi.yaml')
  writeFileSync(path, source)
  const args = ['packages/contracts/scripts/check-openapi.mjs', path]
  if (generated !== undefined) {
    const types = join(directory, 'generated.ts')
    writeFileSync(types, generated)
    args.push(types)
  } else args.push('--skip-types')
  return spawnSync(process.execPath, args, { encoding: 'utf8' })
}

test('rejectsUnresolvedRef', () => {
  expect(check(document.replace("#/components/schemas/Post", "#/components/schemas/Missing")).status).not.toBe(0)
})
test('rejectsInvalidSchema', () => {
  expect(check(document.replace('type: integer', 'type: impossible')).status).not.toBe(0)
})
test('rejectsGeneratedTypeDrift', () => {
  expect(check(document, 'export type Incorrect = string').status).not.toBe(0)
})
test('preservesPublicContracts', () => {
  expect(check(document).status).toBe(0)
  for (const path of ['/health:', '/posts:', '/cities:']) expect(document).toContain(path)
})
test('rejectsSecretsInConnectionSchema', () => {
  expect(document).toContain('TwitchConnection:')
  expect(check(document.replaceAll('providerUserId', 'access_token')).status).not.toBe(0)
})
