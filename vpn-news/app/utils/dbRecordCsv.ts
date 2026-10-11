export function serializeCsv(headers: string[], rows: string[][]): string {
  function cell(value: string) {
    const safe = /^[\s]*[=+\-@]|^[\t\r\n]/.test(value) ? `'${value}` : value
    return `"${safe.replaceAll('"', '""')}"`
  }
  return '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n')
}

export async function collectKeysetPages<T extends { id: number }>(fetchPage: (afterId: number, limit: number) => Promise<T[]>, signal?: AbortSignal, progress?: (count: number) => void): Promise<T[]> {
  const result: T[] = []
  let cursor = 0
  while (true) {
    signal?.throwIfAborted()
    const rows = await fetchPage(cursor, 500)
    signal?.throwIfAborted()
    if (!rows.length) return result
    for (const row of rows) {
      if (row.id <= cursor) throw new Error('A paginação dos dados mudou. Tente novamente.')
      cursor = row.id
      result.push(row)
    }
    progress?.(result.length)
    if (rows.length < 500) return result
  }
}

