import { writeFile } from 'node:fs/promises'
import { pathToFileURL, fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'

export async function generateTypes(path) {
  return '// Generated from openapi.yaml. Do not edit.\n' + astToString(await openapiTS(pathToFileURL(path)))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const source = fileURLToPath(new URL('../openapi.yaml', import.meta.url))
  await writeFile(new URL('../src/generated.ts', import.meta.url), await generateTypes(source))
}
