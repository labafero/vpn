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
  const loading = ref(false);

  async function fetchBySlug(slug: string) {
    loading.value = true;
    const { data, count } = await supabase
      .from("city_config")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!data || count === 0)
      showError({ statusCode: 404, message: "Cidade não encontrada" });
    config.value = data as Tables<"city_config"> | null;
    loading.value = false;
  }

  async function fetchAll() {
    loading.value = true;
    const { data } = await supabase
      .from("city_config")
      .select("*")
      .order("cidade_nome");
    all.value = (data ?? []) as Tables<"city_config">[];
    loading.value = false;
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

  async function remove(slug: string) {
    const { error } = await supabase
      .from("city_config")
      .delete()
      .eq("slug", slug);
    if (error) throw error;
    all.value = all.value.filter((c) => c.slug !== slug);
  }

  return { config, all, loading, fetchBySlug, fetchAll, save, remove };
}
