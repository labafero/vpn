import { expect, test } from 'vitest'
import { serializeCsv, collectKeysetPages } from '../app/utils/dbRecordCsv'

test('CSV preserves Unicode and escapes quotes, newlines and formula prefixes', () => {
  const csv = serializeCsv(['Nome', 'Nota'], [['José, "A"', 'linha\nseguinte'], ['=SUM(A1)', '\t@cmd']])
  expect(csv).toBe('\uFEFF"Nome","Nota"\r\n"José, ""A""","linha\nseguinte"\r\n"\'=SUM(A1)","\'\t@cmd"')
  for (const unsafe of ['+cmd', '-cmd', '@cmd', '\r=cmd', '\n=cmd', '  =cmd']) {
    expect(serializeCsv(['campo'], [[unsafe]])).toContain(`"'${unsafe}"`)
  }
})

test('keyset export does not skip surviving rows deleted before the next batch', async () => {
  const records = Array.from({ length: 501 }, (_, i) => ({ id: i + 1 }))
  const exported = await collectKeysetPages(async (cursor, limit) => {
    if (cursor) records.shift()
    return records.filter(row => row.id > cursor).slice(0, limit)
  })
  expect(exported.at(-1)?.id).toBe(501)
  expect(exported).toHaveLength(501)
})

test('keyset catalog collects beyond the Data API response cap', async () => {
  const catalog = Array.from({ length: 1201 }, (_, i) => ({ id: i + 1 }))
  const rows = await collectKeysetPages(async (cursor, limit) => catalog.filter(row => row.id > cursor).slice(0, Math.min(limit, 1000)))
  expect(rows).toHaveLength(1201)
  expect(rows.at(-1)?.id).toBe(1201)
})
test('export collects over 500 rows and never returns partial result after failure', async () => {
  const records = Array.from({ length: 1101 }, (_, id) => ({ id: id + 1 }))
  const result = await collectKeysetPages(async (cursor, limit) => records.filter(row => row.id > cursor).slice(0, limit))
  expect(result).toHaveLength(1101)
  expect(result.at(-1)?.id).toBe(1101)
  await expect(collectKeysetPages(async cursor => { if (cursor >= 500) throw new Error('revoked'); return records.slice(0, 500) })).rejects.toThrow('revoked')
  const controller = new AbortController()
  controller.abort()
  await expect(collectKeysetPages(async () => records, controller.signal)).rejects.toThrow()
})

