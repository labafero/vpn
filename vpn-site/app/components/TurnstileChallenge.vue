<script setup lang="ts">
interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
      theme: 'auto'
    }
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const emit = defineEmits<{ verified: [token: string]; reset: [] }>()
const config = useRuntimeConfig()
const container = ref<HTMLElement>()
const status = ref<'loading' | 'ready' | 'error'>('loading')
let widgetId: string | undefined

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)

  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-vpn-turnstile]')
    const onLoad = () => (window.turnstile ? resolve(window.turnstile) : reject())
    const onError = () => reject()

    if (!script) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.vpnTurnstile = 'true'
      document.head.append(script)
    }

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })
  })
}

onMounted(async () => {
  const sitekey = config.public.turnstileSiteKey
  if (!sitekey || !container.value) {
    status.value = 'error'
    return
  }

  try {
    const turnstile = await loadTurnstile()
    if (!container.value) return
    widgetId = turnstile.render(container.value, {
      sitekey,
      theme: 'auto',
      callback: (token) => {
        status.value = 'ready'
        emit('verified', token)
      },
      'expired-callback': () => emit('reset'),
      'error-callback': () => {
        status.value = 'error'
        emit('reset')
      }
    })
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
})

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
})

function reset() {
  emit('reset')
  if (widgetId) window.turnstile?.reset(widgetId)
}

defineExpose({ reset })
</script>

<template>
  <div
    class="flex flex-col items-center gap-2"
    aria-live="polite"
  >
    <div ref="container" />
    <p
      v-if="status === 'error'"
      class="text-sm text-error"
      role="status"
    >
      Não foi possível carregar a verificação antirobô. Atualize a página e tente novamente.
    </p>
  </div>
</template>
