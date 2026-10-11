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
