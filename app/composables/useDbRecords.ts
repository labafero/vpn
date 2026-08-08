export type DbRecordType = "pessoa" | "empresa_legal" | "empresa_ilegal" | "veiculo";

export interface DbRecord {
  id: number;
  type: DbRecordType;
  nome: string;
  dados: Record<string, string>;
  cidade: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DbRecordNote {
  id: number;
  record_id: number;
  body: string;
  created_at: string;
  created_by: string;
}

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

export function useDbRecords() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const records = ref<DbRecord[]>([]);
  const loading = ref(false);

  async function fetchAll(filters?: { type?: DbRecordType; cidade?: string; search?: string }) {
    loading.value = true;
    try {
      let query = supabase.from("db_records" as never).select("*").order("updated_at", { ascending: false });
      if (filters?.type) query = query.eq("type", filters.type);
      if (filters?.cidade) query = query.eq("cidade", filters.cidade);
      if (filters?.search) query = query.ilike("nome", `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      records.value = (data ?? []) as DbRecord[];
    } finally {
      loading.value = false;
    }
  }

  async function fetchOne(id: number): Promise<DbRecord> {
    const { data, error } = await supabase.from("db_records" as never).select("*").eq("id", id).single();
    if (error) throw error;
    return data as DbRecord;
  }

  async function insert(payload: { type: DbRecordType; nome: string; dados: Record<string, string>; cidade: string | null }): Promise<DbRecord> {
    const { data, error } = await supabase
      .from("db_records" as never)
      .insert({ ...payload, created_by: user.value!.id } as never)
      .select()
      .single();
    if (error) throw error;
    return data as DbRecord;
  }

  async function update(id: number, payload: { nome?: string; dados?: Record<string, string>; cidade?: string | null }): Promise<DbRecord> {
    const { data, error } = await supabase
      .from("db_records" as never)
      .update(payload as never)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as DbRecord;
  }

  async function remove(id: number) {
    const { error } = await supabase.from("db_records" as never).delete().eq("id", id);
    if (error) throw error;
    records.value = records.value.filter((r) => r.id !== id);
  }

  async function fetchNotes(recordId: number): Promise<DbRecordNote[]> {
    const { data, error } = await supabase
      .from("db_record_notes" as never)
      .select("*")
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as DbRecordNote[];
  }

  async function addNote(recordId: number, body: string): Promise<DbRecordNote> {
    const { data, error } = await supabase
      .from("db_record_notes" as never)
      .insert({ record_id: recordId, body, created_by: user.value!.id } as never)
      .select()
      .single();
    if (error) throw error;
    return data as DbRecordNote;
  }

  async function deleteNote(noteId: number) {
    const { error } = await supabase.from("db_record_notes" as never).delete().eq("id", noteId);
    if (error) throw error;
  }

  return { records, loading, fetchAll, fetchOne, insert, update, remove, fetchNotes, addNote, deleteNote };
}
