import { expect, test } from 'vitest'
import { parseAmountToCents, amountToDecimal, calculateTrend, historyDirections, historyChartPoints } from '../app/utils/marketValues'

test('parses Brazilian prices without rounding fractional cents', () => {
  expect(parseAmountToCents('1.234,56')).toBe(123456)
  expect(parseAmountToCents('R$ 3,40')).toBe(340)
  expect(parseAmountToCents('0')).toBe(0)
  expect(parseAmountToCents('999999999999,99')).toBe(99999999999999)
  for (const invalid of ['-1', '1,234', '1.23', 'NaN', 'Infinity', '', '1000000000000', '1e3']) {
    expect(() => parseAmountToCents(invalid)).toThrow()
  }
  expect(amountToDecimal(123456)).toBe('1234.56')
  expect(amountToDecimal(99999999999999)).toBe('999999999999.99')
})

test('visible period uses the preceding observation without including it in chart', () => {
  expect(historyDirections([{ amount: 120 }], { amount: 100 })).toEqual(['up'])
  expect(historyDirections([{ amount: 120 }, { amount: 100 }], { amount: 130 })).toEqual(['up', 'down'])
})

test('chart places irregular observations by elapsed time and supports coincident dates', () => {
  const points = historyChartPoints([{ at: '2026-10-01', cents: 100 }, { at: '2026-10-02', cents: 200 }, { at: '2026-10-30', cents: 300 }])
  expect(points[0]?.x).toBe(30)
  expect(points[1]?.x).toBeCloseTo(48.620689655)
  expect(points[2]?.x).toBe(570)
  expect(historyChartPoints([{ at: '2026-10-01', cents: 100 }, { at: '2026-10-01', cents: 200 }]).map(p => p.x)).toEqual([30, 30])
})

test('first quotation is stable and direction follows prior quotation', () => {
  expect(calculateTrend(100, null)).toBe('stable')
  expect(calculateTrend(100, 100)).toBe('stable')
  expect(calculateTrend(101, 100)).toBe('up')
  expect(calculateTrend(0, 100)).toBe('down')
})
