import {
  corClasses,
  DEFAULT_COR,
  DEFAULT_NOME,
  DEFAULT_SIGLA,
  type CorPrimaria,
} from "~/utils/cidadeColors";
import getRandomManchete from "~/utils/manchetes-random";
import type { Tables } from "~/types/database.types";

export function useOverlayState() {
  const route = useRoute();
  const user = useSupabaseUser();
  const supabase = useSupabaseClient();

  const broadcastConfig = useState<Tables<"broadcast_config"> | null>(
    "overlay:broadcast",
    () => null,
  );
  const cidadeConfig = useState<Tables<"city_config"> | null>(
    "overlay:cidade",
    () => null,
  );
  const characterConfig = useState<Tables<"character_config"> | null>(
    "overlay:character",
    () => null,
  );
  const loading = useState<boolean>("overlay:loading", () => false);

  const broadcasterId = computed(
    () => (route.query.broadcaster as string) || user.value?.sub || "",
  );

  const corKey = computed<CorPrimaria>(
    () => (cidadeConfig.value?.cor_primaria as CorPrimaria) ?? DEFAULT_COR,
  );
  const cor = computed(() => corClasses[corKey.value]);
  const cidadeSlug = computed(
    () => broadcastConfig.value?.cidade ?? undefined,
  );
  const sigla = computed(
    () => cidadeConfig.value?.jornal_sigla ?? DEFAULT_SIGLA,
  );
  const nome = computed(
    () => cidadeConfig.value?.jornal_nome ?? DEFAULT_NOME,
  );
  const broadcastTitle = computed(() => {
    const title = broadcastConfig.value?.title;
    if (!title || title === "random-found") return getRandomManchete();
    return title;
  });

  async function init(id?: string) {
    const resolvedId = id || broadcasterId.value;
    if (!resolvedId) return;

    loading.value = true;

    const { data: bcData } = await supabase
      .from("broadcast_config")
      .select("*")
      .eq("user_id", resolvedId)
      .maybeSingle();

    broadcastConfig.value = bcData ?? null;

    if (bcData?.cidade) {
      const [{ data: cityData }, { data: charData }] = await Promise.all([
        supabase
          .from("city_config")
          .select("*")
          .eq("slug", bcData.cidade)
          .maybeSingle(),
        supabase
          .from("character_config")
          .select("*")
          .eq("user_id", resolvedId)
          .eq("cidade", bcData.cidade)
          .maybeSingle(),
      ]);

      cidadeConfig.value = cityData ?? null;
      characterConfig.value = charData ?? null;
    }

    loading.value = false;
  }

  return {
    broadcastConfig,
    cidadeConfig,
    characterConfig,
    loading,
    broadcasterId,
    corKey,
    cor,
    cidadeSlug,
    sigla,
    nome,
    broadcastTitle,
    init,
  };
}
