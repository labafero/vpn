<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const route = useRoute();
const success = ref(!!route.query.success);
const error = ref(route.query.error as string | undefined);

const { data, refresh } = useFetch("/api/spotify/status");

async function connect() {
  const { url } = await $fetch<{ url: string }>("/api/spotify/auth-url");
  window.location.href = url;
}

async function disconnect() {
  await $fetch("/api/spotify/disconnect", { method: "POST" });
  refresh();
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Spotify" />
    </template>

    <template #body>
      <div class="p-4 space-y-4">
        <UAlert
          v-if="success"
          color="success"
          variant="soft"
          title="Spotify conectado!"
          description="Sua conta foi vinculada com sucesso."
          @close="success = false"
        />

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          title="Erro na conexão"
          :description="
            error === 'invalid_state'
              ? 'Sessão expirada. Tente novamente.'
              : error === 'not_authenticated'
                ? 'Você precisa estar logado para conectar o Spotify.'
                : error === 'save_failed'
                  ? 'Erro ao salvar tokens no banco. Verifique o console do servidor.'
                  : 'Falha ao obter token do Spotify. Tente novamente.'
          "
          @close="error = undefined"
        />

        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon
                name="i-simple-icons-spotify"
                class="text-2xl text-green-500"
              />
              <div>
                <div class="text-lg font-bold">Spotify</div>
                <div class="text-sm text-muted">
                  Conecte sua conta para exibir a música atual nos overlays de
                  monitoramento.
                </div>
              </div>
            </div>
          </template>

          <div v-if="data?.connected">
            <div class="flex items-center gap-2 mb-4">
              <div class="size-2 rounded-full bg-green-500" />
              <span>Conta conectada</span>
            </div>
            <UButton color="error" variant="soft" @click="disconnect">
              Desconectar
            </UButton>
          </div>

          <div v-else>
            <p class="text-muted mb-4">
              Nenhuma conta conectada. Para exibir a música atual nos overlays,
              conecte sua conta do Spotify.
            </p>
            <UButton color="success" class="cursor-pointer" @click="connect">
              <UIcon name="i-simple-icons-spotify" class="mr-2" />
              Conectar Spotify
            </UButton>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
