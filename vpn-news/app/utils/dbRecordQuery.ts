export function escapeLikeSearch(input: string) {
  return input.replace(/[\\%_]/g, '\\$&')
}
export function recordPageRange(page: number): [number, number] {
  if (!Number.isInteger(page) || page < 1) throw new Error('Página inválida')
  return [(page - 1) * 25, page * 25 - 1]
}
export function createLatestLoader<T>(publish: (result: T) => void) {
  let generation = 0
  return async (fetcher: () => Promise<T>) => {
    const current = ++generation
    const result = await fetcher()
    if (current === generation) publish(result)
    return current === generation
  }
}
