import type { Tables } from "~/types/database.types";

type CityConfigInsert = {
  slug: string;
  cidade_nome: string;
  jornal_nome: string;
  jornal_sigla: string;
  cor_primaria: string;
  logo_url?: string | null;
};

export function useCidadeConfig() {
  const supabase = useSupabaseClient();

  const config = ref<Tables<"city_config"> | null>(null);
  const all = ref<Tables<"city_config">[]>([]);
  const seasons = ref<Tables<"city_seasons">[]>([]);
  const loading = ref(false);

  async function fetchBySlug(slug: string) {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("city_config")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw createError({ statusCode: 404, message: "Cidade não encontrada" });
      }
      config.value = data as Tables<"city_config">;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAll() {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("city_config")
        .select("*")
        .order("cidade_nome");
      if (error) throw error;
      all.value = (data ?? []) as Tables<"city_config">[];
    } finally {
      loading.value = false;
    }
  }

  async function save(values: CityConfigInsert) {
    const { data, error } = await supabase
      .from("city_config")
      .upsert(values, { onConflict: "slug" })
      .select()
      .single();
    if (error) throw error;
    config.value = data as Tables<"city_config">;
    return data as Tables<"city_config">;
  }

  async function fetchSeasons(cidade: string) {
    const { data, error } = await supabase
      .from("city_seasons")
      .select("*")
      .eq("cidade", cidade)
      .order("started_at", { ascending: false });
    if (error) throw error;
    seasons.value = (data ?? []) as Tables<"city_seasons">[];
    return seasons.value;
  }

  async function getActiveSeason(cidade: string) {
    const { data, error } = await supabase
      .from("city_seasons")
      .select("*")
      .eq("cidade", cidade)
      .is("ended_at", null)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Tables<"city_seasons"> | null;
  }

  async function setActiveSeason(cidade: string, label: string) {
    const normalizedLabel = label.trim();

    if (normalizedLabel.length > 50) {
      throw new Error("A season deve ter no máximo 50 caracteres");
    }

    const current = await getActiveSeason(cidade);

    if (current?.label === normalizedLabel) return current;

    if (current) {
      const { error } = await supabase
        .from("city_seasons")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", current.id);
      if (error) throw error;
    }

    if (!normalizedLabel) {
      await fetchSeasons(cidade);
      return null;
    }

    const { data, error } = await supabase
      .from("city_seasons")
      .insert({ cidade, label: normalizedLabel })
      .select()
      .single();
    if (error) throw error;
    await fetchSeasons(cidade);
    return data as Tables<"city_seasons">;
  }

  async function remove(slug: string) {
    const { error } = await supabase
      .from("city_config")
      .delete()
      .eq("slug", slug);
    if (error) throw error;
    all.value = all.value.filter((c) => c.slug !== slug);
  }

  return {
    config,
    all,
    seasons,
    loading,
    fetchBySlug,
    fetchAll,
    fetchSeasons,
    getActiveSeason,
    setActiveSeason,
    save,
    remove,
  };
}
