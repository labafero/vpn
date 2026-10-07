<script setup lang="ts">
import * as v from 'valibot'

const schema = v.object({
  email: v.pipe(v.string(), v.email('Informe um e-mail válido.')),
  password: v.pipe(v.string(), v.minLength(1, 'Informe sua senha.'))
})
const state = reactive({ email: '', password: '' })
const client = useSupabaseClient()
const busy = ref(false)
const message = ref('')

async function login() {
  busy.value = true
  message.value = ''
  try {
    const { error } = await client.auth.signInWithPassword(state)
    if (error) message.value = 'Não foi possível entrar. Confira seu e-mail e senha.'
    else await navigateTo('/conexao')
  } catch { message.value = 'Não foi possível entrar. Tente novamente.' } finally { busy.value = false }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-default p-6 text-default">
    <UCard class="w-full max-w-md">
      <template #header><h1 class="text-2xl font-semibold">Entrar na VPN Monitor</h1></template>
      <p class="mb-6 text-muted">Use sua conta VPN para gerenciar a conexão privada com a Twitch.</p>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="login">
        <UFormField name="email" label="E-mail" required><UInput v-model="state.email" type="email" autocomplete="email" class="w-full" /></UFormField>
        <UFormField name="password" label="Senha" required><UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" /></UFormField>
        <UAlert v-if="message" color="error" :description="message" role="alert" />
        <UButton type="submit" :loading="busy" block>Entrar</UButton>
      </UForm>
    </UCard>
  </main>
</template>
