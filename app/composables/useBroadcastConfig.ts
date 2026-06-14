import type { Tables } from "~/types/database.types";

type BroadcastConfigInsert = {
  character_name: string;
  passport_id: string;
  phone: string;
  title: string;
  cidade?: string | null;
};

export function useBroadcastConfig() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const config = ref<Tables<"broadcast_config"> | null>(null);
  const loading = ref(false);

  async function fetch(broadcasterId?: string) {
    const id = broadcasterId || user.value?.sub;
    if (!id) return;

    loading.value = true;
    const { data } = await supabase
      .from("broadcast_config")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();

    if (data) {
      config.value = data as Tables<"broadcast_config">;
    } else {
      config.value = null;
    }
    loading.value = false;
  }

  async function save(values: BroadcastConfigInsert) {
    if (!user.value?.sub) return;

    const payload = {
      ...values,
      user_id: user.value.sub,
      updated_by: user.value.sub,
    };

    const { data, error } = await supabase
      .from("broadcast_config")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;
    if (data) {
      config.value = data as Tables<"broadcast_config">;
    }
    return data as Tables<"broadcast_config">;
  }

  return { config, loading, fetch, save };
}
