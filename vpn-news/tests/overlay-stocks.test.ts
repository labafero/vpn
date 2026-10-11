import { expect, test, vi } from 'vitest'
import { createPollingResource } from '../app/utils/pollingResource'

test('changing context discards late response and polling stops on disposal', async () => {
  vi.useFakeTimers()
  try {
    let resolveOld!: (value: string[]) => void
    const published: string[][] = []
    const resource = createPollingResource(async context => context === 'old' ? new Promise<string[]>(resolve => { resolveOld = resolve }) : ['new'], rows => published.push(rows), () => {})
    resource.setContext('old')
    resource.setContext('new')
    await vi.advanceTimersByTimeAsync(1)
    resolveOld(['old'])
    await vi.advanceTimersByTimeAsync(1)
    expect(published).toEqual([[], [], ['new']])
    await vi.advanceTimersByTimeAsync(60000)
    expect(published.at(-1)).toEqual(['new'])
    const count = published.length
    resource.dispose()
    await vi.advanceTimersByTimeAsync(120000)
    expect(published).toHaveLength(count)
  } finally { vi.useRealTimers() }
})

test('periodic failure preserves last good data and initial failure reports error', async () => {
  vi.useFakeTimers()
  try {
    let failed = false
    const rows: string[][] = []
    const errors: string[] = []
    const resource = createPollingResource(async () => { if (failed) throw new Error('network'); return ['valid'] }, data => rows.push(data), () => errors.push('error'))
    resource.setContext('city')
    await vi.advanceTimersByTimeAsync(1)
    failed = true
    await vi.advanceTimersByTimeAsync(60000)
    expect(rows.at(-1)).toEqual(['valid'])
    expect(errors).toEqual(['error'])
    resource.setContext('other')
    await vi.advanceTimersByTimeAsync(1)
    expect(rows.at(-1)).toEqual([])
    expect(errors).toHaveLength(2)
    resource.dispose()
  } finally { vi.useRealTimers() }
})
