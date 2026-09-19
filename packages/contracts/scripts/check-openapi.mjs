import { readFile } from "node:fs/promises"

const document = await readFile(new URL("../openapi.yaml", import.meta.url), "utf8")

for (const required of ["openapi: 3.1.0", "paths:", "/health:", "/cities:", "/posts:"]) {
  if (!document.includes(required)) {
    throw new Error(`OpenAPI inválido: trecho ausente: ${required}`)
  }
}

console.log("OpenAPI contracts: ok")
