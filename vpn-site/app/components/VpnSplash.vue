<script setup lang="ts">
const visible = ref(true)
const skipButton = useTemplateRef<HTMLButtonElement>('skip')
let timeout: ReturnType<typeof setTimeout> | undefined

function dismiss() {
  const restoreFocus = skipButton.value === document.activeElement
  visible.value = false
  clearTimeout(timeout)

  if (restoreFocus) {
    nextTick(() => document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }))
  }
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    visible.value = false
    return
  }

  timeout = setTimeout(dismiss, 1500)
})

onBeforeUnmount(() => clearTimeout(timeout))
</script>

<template>
  <section
    v-if="visible"
    class="vpn-splash"
    aria-label="Abertura VPN Roleplay"
    @keydown.esc="dismiss"
  >
    <div
      class="vpn-splash__glow"
      aria-hidden="true"
    />
    <div
      class="vpn-splash__grain vpn-noise"
      aria-hidden="true"
    />

    <div
      class="vpn-splash__brand"
      aria-hidden="true"
    >
      <svg
        class="vpn-splash__symbol"
        viewBox="0 0 400 400"
        fill="none"
      >
        <path
          d="M80 92 200 300 320 92"
          stroke="currentColor"
          stroke-width="24"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle
          cx="80"
          cy="92"
          r="17"
          fill="currentColor"
        />
        <circle
          cx="200"
          cy="300"
          r="17"
          fill="currentColor"
        />
        <circle
          cx="320"
          cy="92"
          r="17"
          fill="currentColor"
        />
      </svg>
      <span class="vpn-splash__wordmark">VPN</span>
      <span class="vpn-splash__subtitle">ROLEPLAY</span>
    </div>

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
      @click="dismiss"
    >
      Pular abertura
      <span aria-hidden="true">↗</span>
    </button>
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
  background: #05090c;
  /* The CSS exit also releases the page when hydration fails. */
  animation: splash-exit 1.5s both;
}

.vpn-splash__glow {
  position: absolute;
  inset: -40%;
  background: radial-gradient(ellipse at center, #ed1c243b, #ed1c2408 35%, transparent 60%);
  animation: splash-glow 1.5s ease-out both;
}

.vpn-splash__grain {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  pointer-events: none;
}

.vpn-splash__brand {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: center;
  animation: splash-reveal 1.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vpn-splash__symbol {
  width: clamp(7rem, 20vw, 12rem);
  margin-bottom: -0.7rem;
  color: var(--vpn-red);
  filter: drop-shadow(0 0 30px #ed1c2450);
}

.vpn-splash__wordmark {
  font-size: clamp(6rem, 23vw, 12rem);
  font-weight: 900;
  line-height: 0.85;
  letter-spacing: -0.085em;
  padding-right: 0.085em;
}

.vpn-splash__subtitle {
  margin-top: 1.4rem;
  padding-left: 0.65em;
  font-size: clamp(0.6rem, 1.7vw, 0.8rem);
  font-weight: 600;
  letter-spacing: 0.65em;
  color: #ffffff80;
}

.vpn-splash__tagline {
  position: absolute;
  bottom: max(7rem, 16vh);
  font-size: 0.625rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #ffffff70;
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

@keyframes splash-reveal {
  0% {
    opacity: 0;
    transform: scale(0.85);
    filter: blur(8px);
  }
  30%,
  65% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: scale(1.7);
    filter: blur(4px);
  }
}

@keyframes splash-glow {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  60% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: scale(1.3);
  }
}

@keyframes splash-exit {
  0%,
  70% {
    opacity: 1;
    visibility: visible;
  }
  100% {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vpn-splash {
    display: none;
    animation: none;
  }
  .vpn-splash__brand,
  .vpn-splash__glow {
    animation: none;
  }
}
</style>
