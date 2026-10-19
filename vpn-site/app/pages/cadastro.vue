<script setup lang="ts">
import * as v from 'valibot'
import type { AuthFormField, ButtonProps, FormSubmitEvent } from '@nuxt/ui'
import {
  createAuthCallbackUrl,
  fetchAuthReturnTarget,
  signUpWithEmail,
  startOAuth
} from '~/utils/auth-actions'

definePageMeta({ colorMode: 'dark' })

const route = useRoute()
const client = useSupabaseClient()
const busy = ref(false)
const message = ref(
  route.query.auth_error === '1' ? 'Não foi possível concluir o cadastro. Tente novamente.' : ''
)
const messageColor = ref<'error' | 'info'>('error')

const schema = v.pipe(
  v.object({
    email: v.pipe(v.string(), v.email('Informe um e-mail válido.')),
    password: v.pipe(v.string(), v.minLength(8, 'Use ao menos 8 caracteres.')),
    confirmPassword: v.pipe(v.string(), v.minLength(1, 'Confirme sua senha.'))
  }),
  v.forward(
    v.check((input) => input.password === input.confirmPassword, 'As senhas não coincidem.'),
    ['confirmPassword']
  )
)

type SignUpInput = v.InferInput<typeof schema>

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
    placeholder: 'Use ao menos 8 caracteres',
    autocomplete: 'new-password',
    required: true
  },
  {
    name: 'confirmPassword',
    type: 'password',
    label: 'Confirme sua senha',
    placeholder: 'Digite a senha novamente',
    autocomplete: 'new-password',
    required: true
  }
]

const rawReturnTo = computed(() =>
  typeof route.query.return_to === 'string' ? route.query.return_to : null
)
const accountPageQuery = computed(() =>
  rawReturnTo.value ? { return_to: rawReturnTo.value } : undefined
)

async function registerWithProvider(provider: 'discord' | 'twitch') {
  busy.value = true
  message.value = ''
  messageColor.value = 'error'
  try {
    const returnTo = await fetchAuthReturnTarget(rawReturnTo.value)
    const result = await startOAuth(client, provider, createAuthCallbackUrl(returnTo))
    if (!result.ok) message.value = 'Não foi possível iniciar o cadastro. Tente novamente.'
  } catch {
    message.value = 'Não foi possível iniciar o cadastro. Tente novamente.'
  } finally {
    busy.value = false
  }
}

const providers = computed<ButtonProps[]>(() => [
  {
    label: 'Cadastrar com Discord',
    icon: 'i-lucide-message-circle',
    color: 'neutral',
    variant: 'outline',
    disabled: busy.value,
    onClick: () => registerWithProvider('discord')
  },
  {
    label: 'Cadastrar com Twitch',
    icon: 'i-lucide-tv',
    color: 'neutral',
    variant: 'outline',
    disabled: busy.value,
    onClick: () => registerWithProvider('twitch')
  }
])

async function register(event: FormSubmitEvent<SignUpInput>) {
  busy.value = true
  message.value = ''
  messageColor.value = 'error'
  try {
    const returnTo = await fetchAuthReturnTarget(rawReturnTo.value)
    const result = await signUpWithEmail(
      client,
      { email: event.data.email, password: event.data.password },
      createAuthCallbackUrl(returnTo)
    )

    if (!result.ok) {
      message.value = 'Não foi possível criar sua conta. Confira os dados e tente novamente.'
      return
    }

    if (result.hasSession) {
      await navigateTo(returnTo, { external: true })
      return
    }

    messageColor.value = 'info'
    message.value = 'Confira seu e-mail e confirme o cadastro para continuar.'
  } catch {
    message.value = 'Não foi possível criar sua conta. Tente novamente.'
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
          :submit="{ label: 'Criar conta', block: true }"
          title="Crie sua conta VPN"
          description="Use uma conta VPN para acessar os aplicativos do universo."
          separator="ou cadastre seu e-mail"
          class="space-y-5"
          @submit="register"
        >
          <template #validation>
            <UAlert
              v-if="message"
              :color="messageColor"
              :description="message"
              role="status"
            />
          </template>

          <template #footer>
            <div class="space-y-4 text-center text-sm text-muted">
              <p>
                Já tem uma conta?
                <NuxtLink
                  :to="{ path: '/entrar', query: accountPageQuery }"
                  class="font-semibold text-primary hover:underline"
                >
                  Entrar
                </NuxtLink>
              </p>
              <p class="text-xs leading-5">
                Ao criar uma conta, você concorda com os
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
