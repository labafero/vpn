<script setup lang="ts">
const visible = ref(true)
const enhanced = ref(false)
const leaving = ref(false)
const revealing = ref(false)
const skipButton = useTemplateRef<HTMLButtonElement>('skip')
let minimumElapsed = false
let pageLoaded = false
let minimumTimer: ReturnType<typeof setTimeout> | undefined
let revealTimer: ReturnType<typeof setTimeout> | undefined
let exitTimer: ReturnType<typeof setTimeout> | undefined

function dismiss(skipIntro = false) {
  if (revealing.value || (leaving.value && !skipIntro)) return

  clearTimeout(revealTimer)
  clearTimeout(exitTimer)

  const restoreFocus = skipButton.value === document.activeElement
  leaving.value = true
  clearTimeout(minimumTimer)
  window.removeEventListener('load', onPageLoad)
  if (skipIntro) {
    revealing.value = true
  } else {
    revealTimer = setTimeout(() => {
      revealing.value = true
    }, 2000)
  }
  exitTimer = setTimeout(
    () => {
      visible.value = false
      window.removeEventListener('keydown', onKeyDown)
      if (restoreFocus) {
        nextTick(() => document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }))
      }
    },
    skipIntro ? 900 : 2900
  )
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value) dismiss(true)
}

function finishWhenReady() {
  if (minimumElapsed && pageLoaded) dismiss()
}

function onPageLoad() {
  pageLoaded = true
  finishWhenReady()
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    visible.value = false
    return
  }

  window.addEventListener('keydown', onKeyDown)
  enhanced.value = true
  pageLoaded = document.readyState === 'complete'
  if (!pageLoaded) window.addEventListener('load', onPageLoad, { once: true })
  minimumTimer = setTimeout(() => {
    minimumElapsed = true
    finishWhenReady()
  }, 2500)
})

onBeforeUnmount(() => {
  clearTimeout(minimumTimer)
  clearTimeout(exitTimer)
  clearTimeout(revealTimer)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('load', onPageLoad)
})
</script>

<template>
  <section
    v-if="visible"
    class="vpn-splash"
    :class="{
      'vpn-splash--enhanced': enhanced,
      'vpn-splash--leaving': leaving,
      'vpn-splash--revealing': revealing
    }"
    aria-label="Abertura VPN Roleplay"
  >
    <div class="vpn-splash__visuals">
      <div
        class="vpn-splash__glow"
        aria-hidden="true"
      />
      <div
        class="vpn-splash__grain vpn-noise"
        aria-hidden="true"
      />

      <VpnBrand
        class="vpn-splash__brand"
        aria-hidden="true"
      />

      <p
        class="vpn-splash__tagline"
        aria-hidden="true"
      >
        A cidade nunca dorme.
      </p>
      <button
        ref="skip"
        type="button"
        class="vpn-splash__skip"
        @click="dismiss(true)"
      >
        Pular abertura
        <span aria-hidden="true">↗</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.vpn-splash {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #fff;
  background: #000;
  opacity: 1;
  transition:
    opacity 900ms cubic-bezier(0.4, 0, 0.2, 1),
    visibility 900ms;
  /* CSS releases the page even when JavaScript is unavailable. */
  animation: splash-fallback-exit 900ms ease-in-out 4.5s forwards;
}

.vpn-splash--enhanced {
  animation: none;
}

.vpn-splash--revealing {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.vpn-splash__visuals {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  opacity: 1;
  transition: opacity 1500ms cubic-bezier(0.4, 0, 0.2, 1);
  animation: splash-content-exit 1500ms ease-in-out 2.5s forwards;
}

.vpn-splash--enhanced .vpn-splash__visuals {
  animation: none;
}

.vpn-splash--leaving .vpn-splash__visuals {
  opacity: 0;
  pointer-events: none;
}

.vpn-splash__glow {
  position: absolute;
  inset: -40%;
  background: radial-gradient(ellipse at center, #ed1c2426, #ed1c2406 35%, transparent 60%);
  animation: splash-glow 2.4s ease-out both;
}

.vpn-splash__grain {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  pointer-events: none;
}

.vpn-splash__brand {
  --brand-mark-size: clamp(3rem, 8vw, 5.5rem);
  --brand-radius: clamp(0.9rem, 2vw, 1.6rem);
  --brand-font-size: clamp(0.85rem, 3.2vw, 2rem);
  --brand-tracking: 0.18em;
  --brand-gap: clamp(1rem, 3vw, 2rem);
  position: relative;
}

.vpn-splash__brand :deep(.vpn-brand__mark) {
  animation: splash-mark-in 1.4s ease-out both;
}

.vpn-splash__brand :deep(.vpn-brand__text) {
  animation: splash-text-in 1.6s cubic-bezier(0.22, 1, 0.36, 1) 500ms both;
}

.vpn-splash__tagline {
  position: absolute;
  bottom: max(7rem, 16vh);
  font-size: 0.625rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #ffffff70;
  animation: splash-mark-in 1.4s ease-out 1.4s both;
}

.vpn-splash__skip {
  position: absolute;
  right: max(1.25rem, env(safe-area-inset-right));
  bottom: max(1.25rem, env(safe-area-inset-bottom));
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  border: 1px solid #ffffff30;
  border-radius: 999px;
  background: #05090c;
  color: #ffffffb3;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

.vpn-splash__skip:hover,
.vpn-splash__skip:focus-visible {
  border-color: var(--vpn-red);
  color: white;
  outline: 2px solid var(--vpn-red);
  outline-offset: 4px;
}

@keyframes splash-mark-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes splash-text-in {
  from {
    opacity: 0;
    transform: translateX(-1.5rem);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes splash-glow {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes splash-content-exit {
  to {
    opacity: 0;
  }
}

@keyframes splash-fallback-exit {
  to {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vpn-splash {
    display: none;
    animation: none;
    transition: none;
  }
  .vpn-splash__visuals {
    animation: none;
    transition: none;
  }
  .vpn-splash__brand :deep(.vpn-brand__mark),
  .vpn-splash__brand :deep(.vpn-brand__text),
  .vpn-splash__tagline,
  .vpn-splash__glow {
    animation: none;
  }
}
</style>
