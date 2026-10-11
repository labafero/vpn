import type { Tables } from '~/types/database.types'

export type DbRecordRelation = Tables<'db_record_relations'>
export function useDbRecordRelations() {
  const client = useSupabaseClient()
  async function fetchRelations(recordId: number) {
    const { data, error } = await client.from('db_record_relations').select('*').or(`source_id.eq.${recordId},target_id.eq.${recordId}`).order('created_at').order('id')
    if (error) throw error
    return data ?? []
  }
  async function addRelation(input: { sourceId: number; targetId: number; kind: string }) {
    const { data, error } = await client.from('db_record_relations').insert({ source_id: input.sourceId, target_id: input.targetId, kind: input.kind.trim() }).select().single()
    if (error) throw error
    return data
  }
  async function removeRelation(id: number) {
    const { data, error } = await client.from('db_record_relations').delete().eq('id', id).select('id').single()
    if (error) throw error
    return data
  }
  return { fetchRelations, addRelation, removeRelation }
}
