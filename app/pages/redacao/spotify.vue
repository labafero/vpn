<script setup lang="ts">
definePageMeta({ middleware: "auth" });

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
      <div class="p-4">
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

          <UButton
            v-if="data?.connected"
            color="error"
            variant="soft"
            @click="disconnect"
          >
            Desconectar
          </UButton>
          <UButton
            v-else
            color="success"
            @click="connect"
          >
            <UIcon name="i-simple-icons-spotify" class="mr-2" />
            Conectar Spotify
          </UButton>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
