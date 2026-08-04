import assert from "node:assert/strict"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawn } from "node:child_process"
import test from "node:test"

const ROOT = resolve(import.meta.dirname, "../../../..")
const SCRIPT = resolve(import.meta.dirname, "publish-post.mjs")
const AUTHOR_ID = "11111111-1111-4111-8111-111111111111"

async function createFixture() {
  const directory = await mkdtemp(join(tmpdir(), "criar-post-"))
  const postPath = join(directory, "post.json")
  const coverPath = join(directory, "cover.png")
  await writeFile(
    postPath,
    JSON.stringify({
      body: "Uma operação terminou sem feridos.",
      cidade: "neon",
      destaque: false,
      published_at: "2026-08-03T22:00:00-03:00",
      title: "DOIS DETIDOS"
    })
  )
  await writeFile(coverPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  return { coverPath, directory, postPath }
}

async function listen(handler) {
  const server = createServer(handler)
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen))
  const address = server.address()
  return {
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose())
    }),
    url: `http://127.0.0.1:${address.port}`
  }
}

async function readBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function runPublisher(baseUrl, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      cwd: ROOT,
      env: {
        ...process.env,
        NUXT_PUBLIC_SUPABASE_URL: baseUrl,
        NUXT_SUPABASE_SECRET_KEY: "test-secret",
        SUPABASE_POST_AUTHOR_ID: ""
      }
    })
    let stderr = ""
    let stdout = ""
    child.stderr.on("data", (chunk) => { stderr += chunk })
    child.stdout.on("data", (chunk) => { stdout += chunk })
    child.on("error", rejectRun)
    child.on("close", (code) => resolveRun({ code, stderr, stdout }))
  })
}

test("envia a capa e publica o post com o autor único", async () => {
  const fixture = await createFixture()
  const requests = []
  const server = await listen(async (request, response) => {
    const body = await readBody(request)
    requests.push({ body, method: request.method, url: request.url })
    response.setHeader("content-type", "application/json")

    if (request.method === "GET" && request.url.startsWith("/auth/v1/admin/users")) {
      response.end(JSON.stringify({ users: [{ id: AUTHOR_ID }] }))
      return
    }
    if (request.method === "POST" && request.url.startsWith("/storage/v1/object/post-media/")) {
      response.end(JSON.stringify({ Id: "cover-id", Key: "post-media/cover.png" }))
      return
    }
    if (request.method === "POST" && request.url.startsWith("/rest/v1/posts")) {
      const post = JSON.parse(body.toString("utf8"))
      response.end(JSON.stringify([{ cover_url: post.cover_url, id: 42, title: post.title }]))
      return
    }
    response.statusCode = 404
    response.end(JSON.stringify({ message: "not found" }))
  })

  try {
    const result = await runPublisher(server.url, [
      "--post",
      fixture.postPath,
      "--cover",
      fixture.coverPath
    ])
    assert.equal(result.code, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).post_id, 42)
    assert.deepEqual(requests.map(({ method }) => method), ["GET", "POST", "POST"])
    const inserted = JSON.parse(requests[2].body.toString("utf8"))
    assert.equal(inserted.user_id, AUTHOR_ID)
    assert.match(inserted.cover_url, /\/storage\/v1\/object\/public\/post-media\//)
    assert.doesNotMatch(result.stdout + result.stderr, /test-secret/)
  } finally {
    await server.close()
    await rm(fixture.directory, { force: true, recursive: true })
  }
})

test("remove a capa enviada quando a inserção do post falha", async () => {
  const fixture = await createFixture()
  const methods = []
  const server = await listen(async (request, response) => {
    await readBody(request)
    methods.push(request.method)
    response.setHeader("content-type", "application/json")

    if (request.method === "GET") {
      response.end(JSON.stringify({ users: [{ id: AUTHOR_ID }] }))
      return
    }
    if (request.method === "POST" && request.url.startsWith("/storage/v1/object/")) {
      response.end(JSON.stringify({ Id: "cover-id", Key: "post-media/cover.png" }))
      return
    }
    if (request.method === "POST" && request.url.startsWith("/rest/v1/posts")) {
      response.statusCode = 500
      response.end(JSON.stringify({ message: "insert failed" }))
      return
    }
    if (request.method === "DELETE") {
      response.end("[]")
      return
    }
    response.statusCode = 404
    response.end(JSON.stringify({ message: "not found" }))
  })

  try {
    const result = await runPublisher(server.url, [
      "--post",
      fixture.postPath,
      "--cover",
      fixture.coverPath
    ])
    assert.equal(result.code, 1)
    assert.match(result.stderr, /Publicação do post falhou/)
    assert.deepEqual(methods, ["GET", "POST", "POST", "DELETE"])
  } finally {
    await server.close()
    await rm(fixture.directory, { force: true, recursive: true })
  }
})
