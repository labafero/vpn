export function createPollingResource<T>(fetcher: (context: string) => Promise<T[]>, publish: (rows: T[]) => void, failure: (cause: unknown) => void, interval = 60000) {
  let context = ''
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  async function refresh() {
    if (!context || disposed) return
    const current = ++generation
    clearTimeout(timer)
    try {
      const rows = await fetcher(context)
      if (current === generation && !disposed) publish(rows)
    } catch (cause) {
      if (current === generation && !disposed) failure(cause)
    } finally {
      if (current === generation && !disposed) timer = setTimeout(refresh, interval)
    }
  }
  function setContext(next: string) {
    generation++
    clearTimeout(timer)
    context = next
    publish([])
    void refresh()
  }
  function dispose() { disposed = true; generation++; clearTimeout(timer) }
  return { refresh, setContext, dispose }
}
