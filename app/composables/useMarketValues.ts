import type { Tables } from '~/types/database.types';

export type MarketValueRow = Tables<'market_values'>;

export type MarketValueInput = {
  cidade: string;
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
};

export function useMarketValues() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const latest = ref<Tables<'market_values_latest'>[]>([]);
  const history = ref<MarketValueRow[]>([]);
  const loading = ref(false);

  async function fetchLatest(broadcasterId?: string) {
    const id = broadcasterId || user.value?.sub;
    if (!id) return;
    loading.value = true;
    const { data } = await supabase
      .from('market_values_latest')
      .select('*')
      .eq('user_id', id);
    if (data) latest.value = data as Tables<'market_values_latest'>[];
    loading.value = false;
  }

  async function fetchHistory() {
    if (!user.value?.sub) return;
    const { data } = await supabase
      .from('market_values')
      .select('*')
      .eq('user_id', user.value.sub)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) history.value = data as MarketValueRow[];
  }

  async function save(entries: MarketValueInput[]) {
    if (!user.value?.sub) return;
    const rows = entries.map((e) => ({ ...e, user_id: user.value!.sub }));
    const { error } = await supabase.from('market_values').insert(rows);
    if (error) throw error;
    await fetchHistory();
  }

  return { latest, history, loading, fetchLatest, fetchHistory, save };
}
