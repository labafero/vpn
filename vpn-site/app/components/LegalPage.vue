<script setup lang="ts">
const props = defineProps<{
  title: string
  description: string
  current: 'terms' | 'privacy'
}>()

const pages = [
  { id: 'terms', label: 'Termos de uso', to: '/termos-de-uso' },
  { id: 'privacy', label: 'Política de privacidade', to: '/politica-de-privacidade' }
] as const
</script>

<template>
  <div class="min-h-screen bg-[#05090c] text-white">
    <header class="border-b border-white/10 bg-[#05090c]/90">
      <UContainer class="flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
        <NuxtLink
          to="/"
          aria-label="VPN Roleplay — início"
          class="flex min-h-11 items-center"
        >
          <VpnBrand />
        </NuxtLink>

        <nav
          aria-label="Documentos legais"
          class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
        >
          <NuxtLink
            v-for="page in pages"
            :key="page.id"
            :to="page.to"
            :aria-current="props.current === page.id ? 'page' : undefined"
            :class="[
              'min-h-11 inline-flex items-center transition-colors',
              props.current === page.id ? 'text-white' : 'text-white/55 hover:text-white'
            ]"
          >
            {{ page.label }}
          </NuxtLink>
        </nav>
      </UContainer>
    </header>

    <main>
      <UContainer class="max-w-4xl py-12 sm:py-16 lg:py-20">
        <header class="border-b border-white/10 pb-10">
          <NuxtLink
            to="/"
            class="inline-flex min-h-11 items-center text-sm text-[#ff6468] transition-colors hover:text-white"
          >
            ← Voltar ao site da VPN
          </NuxtLink>
          <h1 class="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            {{ props.title }}
          </h1>
          <p class="mt-5 max-w-3xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
            {{ props.description }}
          </p>
          <p class="mt-6 text-sm text-white/40">
            Última atualização:
            <time datetime="2026-10-18">18 de outubro de 2026</time>
          </p>
        </header>

        <article class="legal-copy mt-10 space-y-10 text-[15px] leading-7 text-white/70 sm:mt-12">
          <slot />
        </article>

        <nav
          aria-label="Outros documentos legais"
          class="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm"
        >
          <NuxtLink
            v-for="page in pages"
            :key="page.id"
            :to="page.to"
            :aria-current="props.current === page.id ? 'page' : undefined"
            class="inline-flex min-h-11 items-center text-[#ff6468] transition-colors hover:text-white"
          >
            {{ page.label }}
          </NuxtLink>
        </nav>
      </UContainer>
    </main>

    <footer class="border-t border-white/10">
      <UContainer
        class="flex flex-col gap-2 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>© {{ new Date().getFullYear() }} VPN Roleplay</p>
        <p>Conteúdo para a comunidade VPN Roleplay.</p>
      </UContainer>
    </footer>
  </div>
</template>

<style scoped>
.legal-copy :deep(h2) {
  margin-bottom: 0.75rem;
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.legal-copy :deep(h3) {
  margin-bottom: 0.5rem;
  color: white;
  font-size: 1rem;
  font-weight: 600;
}

.legal-copy :deep(p + p) {
  margin-top: 0.85rem;
}

.legal-copy :deep(ul) {
  margin-top: 0.75rem;
  list-style: disc;
  padding-left: 1.4rem;
}

.legal-copy :deep(li + li) {
  margin-top: 0.35rem;
}

.legal-copy :deep(a) {
  color: #ff777b;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.legal-copy :deep(a:hover) {
  color: white;
}
</style>
