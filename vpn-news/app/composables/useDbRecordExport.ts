import type { DbRecordFilters } from '~/composables/useDbRecords'
import { collectKeysetPages, serializeCsv } from '~/utils/dbRecordCsv'
import { escapeLikeSearch } from '~/utils/dbRecordQuery'

export function useDbRecordExport() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const exporting = ref(false)
  const progress = ref(0)
  let controller: AbortController | undefined
  async function checkAccess() {
    if (!user.value?.sub) throw new Error('Sessão expirada')
    const { data, error } = await client.from('editorial_members').select('user_id').eq('user_id', user.value.sub).maybeSingle()
    if (error || !data) throw new Error('Autorização editorial indisponível')
    controller?.signal.throwIfAborted()
  }
  async function run(kind: 'records' | 'notes' | 'relations', filters: DbRecordFilters) {
    if (exporting.value) return
    exporting.value = true
    progress.value = 0
    controller = new AbortController()
    try {
      const records = await collectKeysetPages(async (cursor, limit) => {
        await checkAccess()
        let query = client.from('db_records').select('*').order('id').gt('id', cursor).limit(limit)
        if (filters.type) query = query.eq('type', filters.type)
        if (filters.cidade) query = query.eq('cidade', filters.cidade)
        if (filters.search) query = query.ilike('nome', `%${escapeLikeSearch(filters.search)}%`)
        const { data, error } = await query
        if (error) throw error
        return data ?? []
      }, controller.signal, count => { progress.value = count })
      const ids = records.map(r => r.id)
      const idSet = new Set(ids)
      let headers: string[] = []
      let rows: string[][] = []
      if (kind === 'records') {
        headers = ['ID', 'Tipo', 'Nome', 'Cidade', 'Dados', 'Autor', 'Criado em', 'Atualizado em']
        rows = records.map(r => [String(r.id), r.type, r.nome, r.cidade ?? '', JSON.stringify(r.dados), r.created_by, r.created_at, r.updated_at])
      } else {
        headers = kind === 'notes' ? ['ID', 'Registro', 'Nota', 'Autor', 'Criado em'] : ['ID', 'Origem', 'Destino', 'Relação', 'Autor', 'Criado em']
        for (let i = 0; i < ids.length; i += 100) {
          const batch = ids.slice(i, i + 100)
          if (kind === 'notes') {
            const notes = await collectKeysetPages(async (cursor, limit) => {
              await checkAccess()
              const { data, error } = await client.from('db_record_notes').select('*').in('record_id', batch).order('id').gt('id', cursor).limit(limit)
              if (error) throw error
              return data ?? []
            }, controller.signal)
            rows.push(...notes.map(n => [String(n.id), String(n.record_id), n.body, n.created_by, n.created_at]))
          } else {
            const links = await collectKeysetPages(async (cursor, limit) => {
              await checkAccess()
              const { data, error } = await client.from('db_record_relations').select('*').in('source_id', batch).order('id').gt('id', cursor).limit(limit)
              if (error) throw error
              return data ?? []
            }, controller.signal)
            rows.push(...links.filter(link => idSet.has(link.target_id)).map(link => [String(link.id), String(link.source_id), String(link.target_id), link.kind, link.created_by, link.created_at]))
          }
        }
      }
      await checkAccess()
      const csv = serializeCsv(headers, rows)
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `base-${kind}.csv`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally { exporting.value = false; controller = undefined }
  }
  function cancel() { controller?.abort() }
  onUnmounted(cancel)
  return { exporting, progress, cancel, exportRecords: (filters: DbRecordFilters) => run('records', { ...filters }), exportNotes: (filters: DbRecordFilters) => run('notes', { ...filters }), exportRelations: (filters: DbRecordFilters) => run('relations', { ...filters }) }
}
