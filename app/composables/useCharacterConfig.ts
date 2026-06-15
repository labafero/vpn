import type { Tables } from "~/types/database.types";

type CharacterConfigInsert = {
  cidade: string;
  character_name: string;
  passport_id: string;
  phone: string;
};

export function useCharacterConfig() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const config = ref<Tables<"character_config"> | null>(null);
  const loading = ref(false);

  async function fetch(cidade: string, userId?: string) {
    const id = userId || user.value?.sub;
    if (!id || !cidade) return;

    loading.value = true;
    const { data } = await supabase
      .from("character_config")
      .select("*")
      .eq("user_id", id)
      .eq("cidade", cidade)
      .maybeSingle();
    config.value = data ?? null;
    loading.value = false;
  }

  async function save(values: CharacterConfigInsert) {
    if (!user.value?.sub) return;

    const payload = {
      ...values,
      user_id: user.value.sub,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("character_config")
      .upsert(payload, { onConflict: "user_id,cidade" })
      .select()
      .single();

    if (error) throw error;
    config.value = data ?? null;
    return data;
  }

  return { config, loading, fetch, save };
}
