import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import SwaggerParser from '@apidevtools/swagger-parser'
import { generateTypes } from './generate-types.mjs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const path = process.argv[2] || fileURLToPath(new URL('../openapi.yaml', import.meta.url))
const generated = process.argv[3] || fileURLToPath(new URL('../src/generated.ts', import.meta.url))
try {
  const require = createRequire(import.meta.url)
  const cli = require.resolve('@redocly/cli/bin/cli.js')
  const result = spawnSync(process.execPath, [cli, 'lint', path, '--config', 'redocly.yaml'], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
  const document = await SwaggerParser.validate(path, { resolve: { external: false } })
  const connection = document.components?.schemas?.TwitchConnection
  if (connection && /access_token|refresh_token|ciphertext|client_secret/.test(JSON.stringify(connection))) throw new Error('Credencial no contrato público')
  if (generated !== '--skip-types') {
    const expected = await generateTypes(path)
    const actual = await readFile(generated, 'utf8')
    if (actual.replaceAll('\r\n', '\n') !== expected) throw new Error('Tipos desatualizados: execute pnpm contracts:generate')
  }
  console.log('OpenAPI contracts: ok')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
