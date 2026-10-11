export function parseAmountToCents(input: string): number {
  const text = input.trim().replace(/^R\$\s*/, '')
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) {
    throw new Error('Informe um valor válido, por exemplo 1.234,56')
  }
  const [integer = '', fraction = ''] = text.replaceAll('.', '').split(',')
  const cents = Number(integer) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 99999999999999) {
    throw new Error('Valor fora do limite permitido')
  }
  return cents
}

export function amountToDecimal(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 99999999999999) throw new Error('Valor inválido')
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

export function calculateTrend(currentCents: number, previousCents: number | null): 'up' | 'down' | 'stable' {
  if (previousCents === null || currentCents === previousCents) return 'stable'
  return currentCents > previousCents ? 'up' : 'down'
}

export function formatMarketAmount(amount: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

export function historyDirections(rows: { amount: number }[], preceding: { amount: number } | null) {
  return rows.map((row, index) => {
    const previous = rows[index + 1] ?? preceding
    return calculateTrend(Math.round(row.amount * 100), previous ? Math.round(previous.amount * 100) : null)
  })
}

export function historyChartPoints(series: { at: string; cents: number }[]) {
  if (!series.length) return []
  const times = series.map(row => new Date(row.at).getTime())
  const start = Math.min(...times)
  const end = Math.max(...times)
  const min = Math.min(...series.map(row => row.cents))
  const max = Math.max(...series.map(row => row.cents))
  return series.map((row, index) => ({
    x: 30 + ((times[index]! - start) / Math.max(1, end - start)) * 540,
    y: 170 - ((row.cents - min) / Math.max(1, max - min)) * 140
  }))
}
