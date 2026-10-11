import * as v from 'valibot'

const text = v.pipe(v.string(), v.maxLength(1000, 'Máximo de 1.000 caracteres'))
const base = v.object({
  type: v.picklist(['pessoa', 'empresa_legal', 'empresa_ilegal', 'veiculo']),
  nome: v.pipe(v.string(), v.trim(), v.minLength(1, 'Nome obrigatório'), v.maxLength(200)),
  cidade: v.nullable(v.string()),
  dados: v.record(v.string(), text)
})
export function validateRecord(input: unknown) {
  const result = v.parse(base, input)
  if (result.type === 'pessoa' && result.dados.status_criminal) {
    v.parse(v.picklist(['limpo', 'procurado', 'preso', 'foragido']), result.dados.status_criminal)
  }
  if (result.type === 'empresa_ilegal' && result.dados.tipo) {
    v.parse(v.picklist(['facção', 'gang', 'máfia', 'cartel', 'outro']), result.dados.tipo)
  }
  return result
}
export function validateNote(input: string) {
  return v.parse(v.pipe(v.string(), v.trim(), v.minLength(1, 'Escreva uma nota'), v.maxLength(5000)), input)
}
