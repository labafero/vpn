import { expect, test } from 'vitest'
import { validateRecord, validateNote } from '../app/utils/dbRecordSchemas'

test('record types validate fields and reject invalid values before writing', () => {
  expect(validateRecord({ type: 'pessoa', nome: ' Ana ', dados: { status_criminal: 'limpo' }, cidade: null }).nome).toBe('Ana')
  for (const invalid of [
    { type: 'pessoa', nome: ' ', dados: {}, cidade: null },
    { type: 'pessoa', nome: 'Ana', dados: { status_criminal: 'inventado' }, cidade: null },
    { type: 'veiculo', nome: 'Carro', dados: { placa: 'x'.repeat(1001) }, cidade: null },
    { type: 'invalido', nome: 'Tipo', dados: {}, cidade: null }
  ]) expect(() => validateRecord(invalid)).toThrow()
})
test('notes trim input and reject empty or oversized text', () => {
  expect(validateNote(' nota ')).toBe('nota')
  expect(() => validateNote(' ')).toThrow()
  expect(() => validateNote('x'.repeat(5001))).toThrow()
})
