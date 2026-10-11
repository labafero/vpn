import { expect, test } from 'vitest'
import { escapeLikeSearch, recordPageRange, createLatestLoader } from '../app/utils/dbRecordQuery'

test('literal search escapes wildcards and page ranges do not overlap', () => {
  expect(escapeLikeSearch('50%_\\')).toBe('50\\%\\_\\\\')
  expect(recordPageRange(1)).toEqual([0, 24])
  expect(recordPageRange(2)).toEqual([25, 49])
  expect(() => recordPageRange(0)).toThrow()
})
test('a late search cannot replace a newer filtered result', async () => {
  let resolveOld!: (rows: number[]) => void
  const published: number[][] = []
  const load = createLatestLoader<number[]>(rows => published.push(rows))
  const old = load(() => new Promise(resolve => { resolveOld = resolve }))
  await load(async () => [2])
  resolveOld([1])
  await old
  expect(published).toEqual([[2]])
})
