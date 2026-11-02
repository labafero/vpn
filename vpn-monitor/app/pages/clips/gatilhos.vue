<script setup lang="ts">
import * as v from 'valibot'
import type { ClipTriggerPhrase, MonitoringChannel } from '@vpn/contracts'

definePageMeta({ middleware: 'auth', colorMode: 'dark' })

const channels = ref<MonitoringChannel[]>([])
const phrases = ref<ClipTriggerPhrase[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const notice = ref('')
const state = reactive({ text: '' })
const draftById = reactive<Record<string, string>>({})
const schema = v.object({
  text: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Escreva uma frase.'),
    v.maxLength(200, 'Use até 200 caracteres.')
  )
})
const headers = { 'X-VPN-CSRF': '1' }
const channel = computed(() => channels.value[0])

async function refresh() {
  loading.value = true
  errorMessage.value = ''
  try {
    channels.value = await $fetch<MonitoringChannel[]>('/api/sentry/channels')
    phrases.value = channel.value
      ? await $fetch<ClipTriggerPhrase[]>(
          `/api/sentry/channels/${channel.value.id}/trigger-phrases`
        )
      : []
    for (const phrase of phrases.value) draftById[phrase.id] = phrase.text
  } catch {
    errorMessage.value = 'Não foi possível carregar as frases-gatilho.'
  } finally {
    loading.value = false
  }
}

async function createPhrase() {
  if (!channel.value || saving.value) return
  saving.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    await $fetch(`/api/sentry/channels/${channel.value.id}/trigger-phrases`, {
      method: 'POST',
      headers,
      body: { text: state.text.trim() }
    })
    state.text = ''
    notice.value = 'Frase salva. Clips pendentes com esta configuração podem entrar na análise.'
    await refresh()
    notice.value = 'Frase salva. Clips pendentes com esta configuração podem entrar na análise.'
  } catch (error) {
    errorMessage.value =
      (error as { statusCode?: number }).statusCode === 400
        ? 'Essa frase já está cadastrada ou não pode ficar vazia.'
        : 'Não foi possível salvar a frase. Tente novamente.'
  } finally {
    saving.value = false
  }
}

async function updatePhrase(phrase: ClipTriggerPhrase) {
  if (!channel.value || saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/sentry/channels/${channel.value.id}/trigger-phrases/${phrase.id}`, {
      method: 'PATCH',
      headers,
      body: { text: draftById[phrase.id] }
    })
    notice.value = 'Frase atualizada. Novas análises usarão a nova versão.'
    await refresh()
    notice.value = 'Frase atualizada. Novas análises usarão a nova versão.'
  } catch {
    errorMessage.value = 'Não foi possível atualizar a frase. Verifique se não existe outra igual.'
  } finally {
    saving.value = false
  }
}

async function setEnabled(phrase: ClipTriggerPhrase, enabled: boolean) {
  if (!channel.value || saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/sentry/channels/${channel.value.id}/trigger-phrases/${phrase.id}`, {
      method: 'PATCH',
      headers,
      body: { enabled }
    })
    notice.value = enabled ? 'Frase ativada.' : 'Frase desativada.'
    await refresh()
  } catch {
    errorMessage.value = 'Não foi possível atualizar o estado da frase.'
  } finally {
    saving.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <main class="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6 sm:py-12">
    <div class="mx-auto max-w-3xl space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
          <p class="text-sm uppercase tracking-[0.3em] text-primary">VPN Monitor</p>
          <h1 class="text-3xl font-semibold sm:text-4xl">Frases-gatilho</h1>
          <p class="max-w-2xl text-neutral-300">
            As frases definem o que a análise procura nos clips importados. Cada detecção preserva a
            versão usada; editar uma frase não altera evidências antigas.
          </p>
        </div>
        <UButton
          to="/clips"
          variant="outline"
        >
          Voltar aos clips
        </UButton>
      </header>

      <UAlert
        v-if="notice"
        color="success"
        :description="notice"
        role="status"
      />
      <UAlert
        v-if="errorMessage"
        color="error"
        :description="errorMessage"
        role="alert"
      />
      <p
        v-if="loading"
        role="status"
        class="text-muted"
      >
        Carregando configuração…
      </p>
      <UCard
        v-else-if="!channel"
        class="text-default"
      >
        <h2 class="text-lg font-semibold">Conecte um canal Twitch</h2>
        <p class="mt-2 text-muted">
          As frases são configuradas para o canal conectado à sua conta.
        </p>
        <UButton
          class="mt-4"
          to="/conexao"
          variant="outline"
        >
          Conectar Twitch
        </UButton>
      </UCard>
      <template v-else>
        <UCard class="text-default">
          <UForm
            :schema="schema"
            :state="state"
            class="flex flex-wrap items-end gap-3"
            @submit="createPhrase"
          >
            <UFormField
              name="text"
              label="Nova frase"
              required
              class="min-w-64 flex-1"
            >
              <UInput
                v-model="state.text"
                maxlength="200"
                placeholder="Ex.: isso foi combinado"
                class="w-full"
              />
            </UFormField>
            <UButton
              type="submit"
              :loading="saving"
            >
              Adicionar frase
            </UButton>
          </UForm>
          <p class="mt-3 text-sm text-muted">
            A primeira frase libera a análise dos clips importados que aguardam configuração.
          </p>
        </UCard>

        <p
          v-if="!phrases.length"
          class="rounded-lg border border-default p-5 text-muted"
        >
          Nenhuma frase configurada. Os clips importados continuarão listados e aguardando análise.
        </p>
        <UCard
          v-for="phrase in phrases"
          :key="phrase.id"
          class="text-default"
        >
          <div class="flex flex-wrap items-end gap-3">
            <UFormField
              :label="`Frase · versão ${phrase.version}`"
              class="min-w-64 flex-1"
            >
              <UInput
                v-model="draftById[phrase.id]"
                maxlength="200"
                :disabled="saving"
                class="w-full"
              />
            </UFormField>
            <UButton
              variant="outline"
              :loading="saving"
              @click="updatePhrase(phrase)"
            >
              Salvar edição
            </UButton>
            <UCheckbox
              :model-value="phrase.enabled"
              :disabled="saving"
              :label="phrase.enabled ? 'Ativa' : 'Inativa'"
              @update:model-value="setEnabled(phrase, Boolean($event))"
            />
          </div>
        </UCard>
      </template>
    </div>
  </main>
</template>
