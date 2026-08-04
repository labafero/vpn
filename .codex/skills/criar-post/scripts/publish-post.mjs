#!/usr/bin/env node

import { randomUUID } from "node:crypto"
import { readFile, stat } from "node:fs/promises"
import { extname, resolve } from "node:path"

const BUCKET = "post-media"
const MAX_COVER_BYTES = 10 * 1024 * 1024
const VALID_CITIES = new Set(["neon", "dallas", "nordeste", "vice"])
const MIME_BY_EXTENSION = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
])

function usage() {
  return `Uso:
  node .codex/skills/criar-post/scripts/publish-post.mjs --post <post.json> [--cover <imagem>] [--author-id <uuid>] [--dry-run]
  node .codex/skills/criar-post/scripts/publish-post.mjs --check-connection [--author-id <uuid>]

Variáveis esperadas em .env ou no ambiente:
  NUXT_PUBLIC_SUPABASE_URL
  NUXT_SUPABASE_SECRET_KEY
  SUPABASE_POST_AUTHOR_ID (opcional quando o projeto possui exatamente um usuário)`
}

function parseArgs(argv) {
  const args = { authorId: "", checkConnection: false, cover: "", dryRun: false, post: "" }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--dry-run") {
      args.dryRun = true
      continue
    }
    if (arg === "--check-connection") {
      args.checkConnection = true
      continue
    }
    if (["--author-id", "--cover", "--post"].includes(arg)) {
      const value = argv[index + 1]
      if (!value || value.startsWith("--")) throw new Error(`Valor ausente para ${arg}`)
      args[arg.slice(2).replace("author-id", "authorId")] = value
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log(usage())
      process.exit(0)
    }
    throw new Error(`Argumento desconhecido: ${arg}`)
  }

  if (!args.post && !args.checkConnection) throw new Error("Informe --post <post.json>")
  return args
}

async function loadDotEnv(filePath) {
  let contents
  try {
    contents = await readFile(filePath, "utf8")
  } catch (error) {
    if (error?.code === "ENOENT") return
    throw error
  }

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const separator = line.indexOf("=")
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue
    let value = line.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`)
  return value
}

function assertUuid(value, label) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} deve ser um UUID válido`)
  }
  return value
}

function validatePost(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("O JSON do post deve ser um objeto")
  }

  const title = typeof value.title === "string" ? value.title.trim() : ""
  const body = typeof value.body === "string" ? value.body.trim() : ""
  const cidade = typeof value.cidade === "string" ? value.cidade.trim() : ""
  const publishedAt = typeof value.published_at === "string" ? value.published_at.trim() : ""

  if (!title) throw new Error("title é obrigatório")
  if (!body) throw new Error("body é obrigatório")
  if (!VALID_CITIES.has(cidade)) throw new Error("cidade deve ser neon, dallas, nordeste ou vice")
  if (typeof value.destaque !== "boolean") throw new Error("destaque deve ser booleano")
  if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) {
    throw new Error("published_at deve ser uma data ISO 8601 válida")
  }

  return {
    body,
    cidade,
    destaque: value.destaque,
    published_at: publishedAt,
    title
  }
}

async function loadCover(filePath) {
  if (!filePath) return null
  const absolutePath = resolve(filePath)
  const extension = extname(absolutePath).toLowerCase()
  const contentType = MIME_BY_EXTENSION.get(extension)
  if (!contentType) throw new Error("A capa deve ser PNG, JPEG, GIF ou WebP")

  const metadata = await stat(absolutePath)
  if (!metadata.isFile()) throw new Error("O caminho da capa não aponta para um arquivo")
  if (metadata.size > MAX_COVER_BYTES) throw new Error("A capa excede o limite de 10 MB")

  return {
    absolutePath,
    bytes: await readFile(absolutePath),
    contentType,
    extension
  }
}

function encodeObjectPath(path) {
  return path.split("/").map(encodeURIComponent).join("/")
}

async function request(url, options, label) {
  const response = await fetch(url, options)
  const rawBody = await response.text()
  let body = null
  if (rawBody) {
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = rawBody
    }
  }

  if (!response.ok) {
    const detail = typeof body === "string" ? body : body?.message || body?.error || JSON.stringify(body)
    throw new Error(`${label} falhou (${response.status}): ${detail || "sem detalhes"}`)
  }
  return body
}

function authHeaders(secretKey, extra = {}) {
  return {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    ...extra
  }
}

async function resolveAuthorId(baseUrl, secretKey, explicitAuthorId) {
  const configured = explicitAuthorId || process.env.SUPABASE_POST_AUTHOR_ID?.trim()
  if (configured) return assertUuid(configured, "author-id")

  const data = await request(
    `${baseUrl}/auth/v1/admin/users?page=1&per_page=2`,
    { headers: authHeaders(secretKey) },
    "Consulta de autores"
  )
  const users = Array.isArray(data?.users) ? data.users : []
  if (users.length === 1) return assertUuid(users[0].id, "ID do autor encontrado")
  if (users.length === 0) {
    throw new Error("Nenhum usuário foi encontrado no Supabase para assumir a autoria do post")
  }
  throw new Error(
    "Há mais de um usuário no Supabase. Configure SUPABASE_POST_AUTHOR_ID no .env ou informe --author-id"
  )
}

async function uploadCover(baseUrl, secretKey, authorId, cover) {
  const objectPath = `${authorId}/${randomUUID()}${cover.extension}`
  await request(
    `${baseUrl}/storage/v1/object/${BUCKET}/${encodeObjectPath(objectPath)}`,
    {
      body: cover.bytes,
      headers: authHeaders(secretKey, {
        "cache-control": "max-age=3600",
        "content-type": cover.contentType,
        "x-upsert": "false"
      }),
      method: "POST"
    },
    "Upload da capa"
  )
  return {
    objectPath,
    publicUrl: `${baseUrl}/storage/v1/object/public/${BUCKET}/${encodeObjectPath(objectPath)}`
  }
}

async function removeCover(baseUrl, secretKey, objectPath) {
  await request(
    `${baseUrl}/storage/v1/object/${BUCKET}`,
    {
      body: JSON.stringify({ prefixes: [objectPath] }),
      headers: authHeaders(secretKey, { "content-type": "application/json" }),
      method: "DELETE"
    },
    "Rollback da capa"
  )
}

async function insertPost(baseUrl, secretKey, authorId, post, coverUrl) {
  const data = await request(
    `${baseUrl}/rest/v1/posts?select=id,title,cover_url`,
    {
      body: JSON.stringify({ ...post, cover_url: coverUrl, user_id: authorId }),
      headers: authHeaders(secretKey, {
        "content-type": "application/json",
        Prefer: "return=representation"
      }),
      method: "POST"
    },
    "Publicação do post"
  )
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error("O Supabase não retornou o registro publicado")
  }
  return data[0]
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await loadDotEnv(resolve(".env"))

  if (args.checkConnection) {
    const baseUrl = requireEnv("NUXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "")
    const secretKey = requireEnv("NUXT_SUPABASE_SECRET_KEY")
    const authorId = await resolveAuthorId(baseUrl, secretKey, args.authorId)
    console.log(JSON.stringify({ author_id: authorId, connected: true }, null, 2))
    return
  }

  const post = validatePost(JSON.parse(await readFile(resolve(args.post), "utf8")))
  const cover = await loadCover(args.cover)

  if (args.dryRun) {
    const authorId = args.authorId || process.env.SUPABASE_POST_AUTHOR_ID?.trim() || "resolvido no envio"
    console.log(JSON.stringify({ authorId, cover: cover?.absolutePath || null, post, valid: true }, null, 2))
    return
  }

  const baseUrl = requireEnv("NUXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "")
  const secretKey = requireEnv("NUXT_SUPABASE_SECRET_KEY")
  const authorId = await resolveAuthorId(baseUrl, secretKey, args.authorId)
  let uploadedCover = null

  try {
    if (cover) uploadedCover = await uploadCover(baseUrl, secretKey, authorId, cover)
    const created = await insertPost(baseUrl, secretKey, authorId, post, uploadedCover?.publicUrl || "")
    console.log(
      JSON.stringify(
        {
          cover_path: uploadedCover?.objectPath || null,
          cover_url: created.cover_url,
          post_id: created.id,
          title: created.title
        },
        null,
        2
      )
    )
  } catch (error) {
    if (uploadedCover) {
      try {
        await removeCover(baseUrl, secretKey, uploadedCover.objectPath)
      } catch (rollbackError) {
        throw new Error(`${error.message}. O rollback da capa também falhou: ${rollbackError.message}`)
      }
    }
    throw error
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
