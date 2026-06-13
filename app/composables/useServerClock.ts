type ClockRow = {
  id: number;
  brt_reference: string;
  ls_hours: number;
  ls_minutes: number;
  updated_at: string;
};

export function useServerClock() {
  const supabase = useSupabaseClient();

  // Unix-ms of the real-world anchor point
  const brtAnchor = ref<number | null>(null);
  const lsAnchor = ref({ hours: 0, minutes: 0 });
  const now = ref(Date.now());
  const loaded = ref(false);

  async function fetch() {
    const { data } = await supabase
      .from("server_clock")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (data) {
      const row = data as ClockRow;
      brtAnchor.value = new Date(row.brt_reference).getTime();
      lsAnchor.value = { hours: row.ls_hours, minutes: row.ls_minutes };
    }
    loaded.value = true;
  }

  async function sync(lsHours: number, lsMinutes: number) {
    const brtNow = new Date().toISOString();
    const { error } = await supabase.from("server_clock").upsert(
      {
        id: 1,
        brt_reference: brtNow,
        ls_hours: lsHours,
        ls_minutes: lsMinutes,
        updated_at: brtNow,
      },
      { onConflict: "id" },
    );

    if (!error) {
      brtAnchor.value = new Date(brtNow).getTime();
      lsAnchor.value = { hours: lsHours, minutes: lsMinutes };
    }
    return error;
  }

  const losSantos = computed(() => {
    if (brtAnchor.value === null) return { day: 1, hours: 0, minutes: 0 };
    const elapsedLSMin = ((now.value - brtAnchor.value) / 60000) * 30;
    const totalLSMin =
      lsAnchor.value.hours * 60 + lsAnchor.value.minutes + elapsedLSMin;
    const day = Math.floor(totalLSMin / 1440) + 1;
    const timeMin = ((totalLSMin % 1440) + 1440) % 1440;
    return {
      day,
      hours: Math.floor(timeMin / 60),
      minutes: Math.floor(timeMin % 60),
    };
  });

  const lsLabel = computed(() => {
    if (brtAnchor.value === null) return "--:--";
    const { hours, minutes } = losSantos.value;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  });

  onMounted(() => {
    setInterval(() => {
      now.value = Date.now();
    }, 1000);
    // Re-fetch anchor every 5 min so overlays pick up resyncs automatically.
    setInterval(fetch, 5 * 60 * 1000);
  });

  return { losSantos, lsLabel, loaded, fetch, sync };
}
