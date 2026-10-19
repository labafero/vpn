<script setup lang="ts">
import * as v from 'valibot'
import type { AuthFormField, ButtonProps, FormSubmitEvent } from '@nuxt/ui'
import {
  createAuthCallbackUrl,
  fetchAuthReturnTarget,
  signInWithEmail,
  startOAuth
} from '~/utils/auth-actions'

definePageMeta({ colorMode: 'dark' })

const route = useRoute()
const client = useSupabaseClient()
const busy = ref(false)
const message = ref(
  route.query.auth_error === '1' ? 'Não foi possível concluir o login. Tente novamente.' : ''
)

const schema = v.object({
  email: v.pipe(v.string(), v.email('Informe um e-mail válido.')),
  password: v.pipe(v.string(), v.minLength(1, 'Informe sua senha.'))
})

type LoginInput = v.InferInput<typeof schema>

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: 'E-mail',
    placeholder: 'voce@exemplo.com',
    autocomplete: 'email',
    required: true
  },
  {
    name: 'password',
    type: 'password',
    label: 'Senha',
    placeholder: 'Sua senha',
    autocomplete: 'current-password',
    required: true
  }
]

const rawReturnTo = computed(() =>
  typeof route.query.return_to === 'string' ? route.query.return_to : null
)
const accountPageQuery = computed(() =>
  rawReturnTo.value ? { return_to: rawReturnTo.value } : undefined
)

async function loginWithProvider(provider: 'discord' | 'twitch') {
  busy.value = true
  message.value = ''
  try {
    const returnTo = await fetchAuthReturnTarget(rawReturnTo.value)
    const result = await startOAuth(client, provider, createAuthCallbackUrl(returnTo))
    if (!result.ok) message.value = 'Não foi possível iniciar o login. Tente novamente.'
  } catch {
    message.value = 'Não foi possível iniciar o login. Tente novamente.'
  } finally {
    busy.value = false
  }
}

const providers = computed<ButtonProps[]>(() => [
  {
    label: 'Continuar com Discord',
    icon: 'i-lucide-message-circle',
    color: 'neutral',
    variant: 'outline',
    disabled: busy.value,
    onClick: () => loginWithProvider('discord')
  },
  {
    label: 'Continuar com Twitch',
    icon: 'i-lucide-tv',
    color: 'neutral',
    variant: 'outline',
    disabled: busy.value,
    onClick: () => loginWithProvider('twitch')
  }
])

async function login(event: FormSubmitEvent<LoginInput>) {
  busy.value = true
  message.value = ''
  try {
    const returnTo = await fetchAuthReturnTarget(rawReturnTo.value)
    const result = await signInWithEmail(client, event.data)
    if (!result.ok) {
      message.value = 'Não foi possível entrar. Confira os dados e tente novamente.'
      return
    }
    await navigateTo(returnTo, { external: true })
  } catch {
    message.value = 'Não foi possível entrar. Tente novamente.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main
    class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-default px-4 py-10 text-default sm:px-6"
  >
    <div
      class="pointer-events-none absolute -left-40 top-1/3 size-96 rounded-full bg-primary/10 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -right-40 bottom-0 size-96 rounded-full bg-primary/10 blur-3xl"
      aria-hidden="true"
    />

    <UContainer class="relative flex w-full max-w-md flex-col items-center gap-8">
      <NuxtLink
        to="/"
        aria-label="VPN Roleplay — início"
        class="group"
      >
        <VpnBrand />
      </NuxtLink>

      <UCard class="w-full border-default bg-elevated shadow-xl shadow-black/20">
        <UAuthForm
          :schema="schema"
          :fields="fields"
          :providers="providers"
          :loading="busy"
          :submit="{ label: 'Entrar', block: true }"
          title="Entre na sua conta"
          description="Uma conta VPN para acessar os aplicativos do universo."
          separator="ou use seu e-mail"
          class="space-y-5"
          @submit="login"
        >
          <template #validation>
            <UAlert
              v-if="message"
              color="error"
              :description="message"
              role="alert"
            />
          </template>

          <template #footer>
            <div class="space-y-4 text-center text-sm text-muted">
              <p>
                Ainda não tem conta?
                <NuxtLink
                  :to="{ path: '/cadastro', query: accountPageQuery }"
                  class="font-semibold text-primary hover:underline"
                >
                  Criar conta
                </NuxtLink>
              </p>
              <p class="text-xs leading-5">
                Ao continuar, você concorda com os
                <NuxtLink
                  to="/termos-de-uso"
                  class="text-toned underline underline-offset-2"
                >
                  Termos de Uso
                </NuxtLink>
                e a
                <NuxtLink
                  to="/politica-de-privacidade"
                  class="text-toned underline underline-offset-2"
                >
                  Política de Privacidade
                </NuxtLink>
                .
              </p>
            </div>
          </template>
        </UAuthForm>
      </UCard>

      <NuxtLink
        to="/"
        class="text-sm text-muted transition-colors hover:text-default"
      >
        Voltar ao site
      </NuxtLink>
    </UContainer>
  </main>
</template>
