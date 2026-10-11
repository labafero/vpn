import { escapeLikeSearch, recordPageRange } from '~/utils/dbRecordQuery'
import type { Tables } from '~/types/database.types'
import { validateRecord, validateNote } from '~/utils/dbRecordSchemas'

export type DbRecordType = "pessoa" | "empresa_legal" | "empresa_ilegal" | "veiculo";

export type DbRecord = Omit<Tables<'db_records'>, 'type' | 'dados'> & { type: DbRecordType; dados: Record<string, string> }

export type DbRecordNote = Tables<'db_record_notes'>

export const TYPE_LABELS: Record<DbRecordType, string> = {
  pessoa: "Pessoa",
  empresa_legal: "Empresa Legal",
  empresa_ilegal: "Empresa Ilegal",
  veiculo: "Veículo"
};

type BadgeColor =
  | "error"
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "warning"
  | "neutral";

export const TYPE_COLORS = {
  pessoa: "info",
  empresa_legal: "success",
  empresa_ilegal: "error",
  veiculo: "warning"
} satisfies Record<DbRecordType, BadgeColor>;

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "select";
  options?: string[];
}

export const TYPE_FIELDS: Record<DbRecordType, FieldDef[]> = {
  pessoa: [
    { key: "passaporte", label: "Passaporte / ID", type: "text" },
    { key: "telefone", label: "Telefone", type: "text" },
    { key: "profissao", label: "Profissão", type: "text" },
    { key: "endereco", label: "Endereço", type: "text" },
    { key: "status_criminal", label: "Status Criminal", type: "select", options: ["limpo", "procurado", "preso", "foragido"] }
  ],
  empresa_legal: [
    { key: "cnpj", label: "CNPJ", type: "text" },
    { key: "dono", label: "Proprietário", type: "text" },
    { key: "ramo", label: "Ramo de Atividade", type: "text" },
    { key: "endereco", label: "Endereço", type: "text" }
  ],
  empresa_ilegal: [
    { key: "lider", label: "Líder", type: "text" },
    { key: "tipo", label: "Tipo", type: "select", options: ["facção", "gang", "máfia", "cartel", "outro"] },
    { key: "territorio", label: "Território", type: "text" },
    { key: "membros_estimados", label: "Membros Estimados", type: "text" }
  ],
  veiculo: [
    { key: "placa", label: "Placa", type: "text" },
    { key: "modelo", label: "Modelo", type: "text" },
    { key: "cor", label: "Cor", type: "text" },
    { key: "ano", label: "Ano", type: "text" },
    { key: "proprietario", label: "Proprietário", type: "text" }
  ]
};

export interface DbRecordFilters { type?: DbRecordType; cidade?: string; search?: string }
export interface DbRecordPageFilters extends DbRecordFilters { sort: 'nome' | 'updated_at'; ascending: boolean; page: number }
export function useDbRecords() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const records = ref<DbRecord[]>([]);
  const loading = ref(false);

  async function fetchAll(filters?: { type?: DbRecordType; cidade?: string; search?: string }) {
    loading.value = true;
    try {
      let query = supabase.from("db_records").select("*").order("updated_at", { ascending: false });
      if (filters?.type) query = query.eq("type", filters.type);
      if (filters?.cidade) query = query.eq("cidade", filters.cidade);
      if (filters?.search) query = query.ilike("nome", `%${escapeLikeSearch(filters.search)}%`);
      const { data, error } = await query;
      if (error) throw error;
      records.value = (data ?? []) as DbRecord[];
    } finally {
      loading.value = false;
    }
  }

  async function fetchOne(id: number): Promise<DbRecord> {
    const { data, error } = await supabase.from("db_records").select("*").eq("id", id).single();
    if (error) throw error;
    return data as DbRecord;
  }

  async function insert(payload: { type: DbRecordType; nome: string; dados: Record<string, string>; cidade: string | null }): Promise<DbRecord> {
    const { data, error } = await supabase
      .from("db_records")
      .insert({ ...validateRecord(payload), created_by: user.value!.sub })
      .select()
      .single();
    if (error) throw error;
    return data as DbRecord;
  }

  async function update(id: number, payload: { nome?: string; dados?: Record<string, string>; cidade?: string | null }): Promise<DbRecord> {
    const validated = validateRecord({ ...(await fetchOne(id)), ...payload })
    const { data, error } = await supabase
      .from("db_records")
      .update({ nome: validated.nome, dados: validated.dados, cidade: validated.cidade })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as DbRecord;
  }

  async function remove(id: number) {
    const { error } = await supabase.from("db_records").delete().eq("id", id).select('id').single();
    if (error) throw error;
    records.value = records.value.filter((r) => r.id !== id);
  }

  async function fetchNotes(recordId: number): Promise<DbRecordNote[]> {
    const { data, error } = await supabase
      .from("db_record_notes")
      .select("*")
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as DbRecordNote[];
  }

  async function addNote(recordId: number, body: string): Promise<DbRecordNote> {
    const { data, error } = await supabase
      .from("db_record_notes")
      .insert({ record_id: recordId, body: validateNote(body), created_by: user.value!.sub })
      .select()
      .single();
    if (error) throw error;
    return data as DbRecordNote;
  }

  async function deleteNote(noteId: number) {
    const { error } = await supabase.from("db_record_notes").delete().eq("id", noteId).select('id').single();
    if (error) throw error;
  }

  async function updateNote(id: number, body: string) {
    const { data, error } = await supabase.from('db_record_notes').update({ body: validateNote(body) }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  async function fetchPage(filters: DbRecordPageFilters) {
    let query = supabase.from('db_records').select('*', { count: 'exact' })
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.cidade) query = query.eq('cidade', filters.cidade)
    if (filters.search) query = query.ilike('nome', `%${escapeLikeSearch(filters.search)}%`)
    const [start, end] = recordPageRange(filters.page)
    const { data, error, count } = await query.order(filters.sort, { ascending: filters.ascending }).order('id', { ascending: filters.ascending }).range(start, end)
    if (error) throw error
    return { rows: (data ?? []) as DbRecord[], total: count ?? 0 }
  }
  return { records, loading, fetchAll, fetchPage, fetchOne, insert, update, remove, fetchNotes, addNote, deleteNote, updateNote };
}
