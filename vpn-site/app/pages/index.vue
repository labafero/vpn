<script setup lang="ts">
const navigation = [
  { label: "O universo", to: "#universo" },
  { label: "Como funciona", to: "#como-funciona" },
  { label: "Notícias", to: "https://vpn-news.labafero.com" }
]

const pillars = [
  {
    eyebrow: "01 / CIDADE VIVA",
    title: "Cada esquina tem uma história.",
    description: "Personagens, bairros e acontecimentos que continuam se movendo mesmo quando você fecha o jogo.",
    icon: "i-lucide-map"
  },
  {
    eyebrow: "02 / LIVE FEED",
    title: "O que acontece vira notícia.",
    description: "Acompanhe os fatos, as vozes e as versões que disputam espaço no noticiário da VPN.",
    icon: "i-lucide-radio-tower"
  },
  {
    eyebrow: "03 / SEU PAPEL",
    title: "Você não assiste à história.",
    description: "Escolha seu caminho, crie seus vínculos e deixe sua marca no universo compartilhado.",
    icon: "i-lucide-fingerprint"
  }
]
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-[#05090c] text-white">
    <header class="relative z-20 border-b border-white/10 bg-[#05090c]/80 backdrop-blur-md">
      <UContainer class="flex h-20 items-center justify-between gap-8">
        <NuxtLink to="/" aria-label="VPN Roleplay — início" class="group flex items-center gap-3">
          <span class="grid size-10 place-items-center rounded-xl bg-[#ed1c24] shadow-[0_0_28px_rgba(237,28,36,0.26)] transition-transform group-hover:scale-105">
            <svg viewBox="0 0 512 512" aria-hidden="true" class="size-7">
              <path d="M112 128 256 384 400 128" fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="58" />
              <circle cx="112" cy="128" r="30" fill="white" />
              <circle cx="256" cy="384" r="30" fill="white" />
              <circle cx="400" cy="128" r="30" fill="white" />
            </svg>
          </span>
          <span class="text-sm font-semibold tracking-[0.22em] text-white">VPN <span class="text-white/45">ROLEPLAY</span></span>
        </NuxtLink>

        <nav class="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          <a v-for="item in navigation" :key="item.label" :href="item.to" class="text-sm text-white/55 transition-colors hover:text-white">{{ item.label }}</a>
        </nav>

        <UButton to="https://vpn-news.labafero.com" target="_blank" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-up-right" label="Abrir portal" />
      </UContainer>
    </header>

    <main>
      <section class="relative isolate flex min-h-[calc(100vh-5rem)] items-center overflow-hidden">
        <div class="vpn-grid absolute inset-0 -z-10" aria-hidden="true" />
        <div class="vpn-noise pointer-events-none absolute inset-0 -z-10 opacity-20" aria-hidden="true" />
        <div class="absolute -right-40 top-12 -z-10 size-[34rem] rounded-full bg-[#ed1c24]/15 blur-[120px]" aria-hidden="true" />

        <UContainer class="relative w-full py-24 lg:py-32">
          <div class="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div class="max-w-3xl">
              <div class="mb-8 flex items-center gap-3 text-[11px] font-semibold tracking-[0.28em] text-[#ff6468]">
                <span class="vpn-pulse size-2 rounded-full bg-[#ed1c24] shadow-[0_0_18px_#ed1c24]" aria-hidden="true" />
                UNIVERSO ONLINE
              </div>
              <h1 class="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-white sm:text-7xl lg:text-8xl">
                A cidade<br>
                <span class="text-[#ed1c24]">nunca dorme.</span>
              </h1>
              <p class="mt-8 max-w-xl text-lg leading-8 text-white/55 sm:text-xl">
                VPN Roleplay é um universo vivo de histórias, personagens e notícias. Entre na cidade e descubra o que está acontecendo agora.
              </p>
              <div class="mt-10 flex flex-wrap items-center gap-4">
                <UButton size="xl" to="https://vpn-news.labafero.com" target="_blank" label="Entrar no universo" trailing-icon="i-lucide-arrow-up-right" />
                <UButton size="xl" to="#universo" color="neutral" variant="ghost" label="Explorar a VPN" trailing-icon="i-lucide-arrow-down" class="text-white/70 hover:text-white" />
              </div>
              <div class="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-medium tracking-[0.18em] text-white/35">
                <span>ROLEPLAY</span>
                <span>LIVE NEWS</span>
                <span>CONNECTED STORIES</span>
              </div>
            </div>

            <div class="relative mx-auto w-full max-w-md lg:ml-auto" aria-hidden="true">
              <div class="absolute inset-12 rounded-full bg-[#ed1c24]/20 blur-3xl" />
              <div class="relative aspect-square rounded-[2rem] border border-white/10 bg-white/[0.025] p-8 shadow-2xl backdrop-blur-sm">
                <div class="absolute inset-6 rounded-[1.5rem] border border-[#ed1c24]/25" />
                <div class="absolute inset-10 rounded-full border border-dashed border-white/15" />
                <div class="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ed1c24]/50 bg-[#ed1c24]/10 shadow-[0_0_60px_rgba(237,28,36,0.24)]">
                  <div class="grid h-full place-items-center text-3xl font-semibold tracking-[-0.08em] text-white">VPN</div>
                </div>
                <span class="absolute left-[16%] top-[19%] size-3 rounded-full bg-[#ed1c24] shadow-[0_0_22px_#ed1c24]" />
                <span class="absolute right-[16%] top-[19%] size-3 rounded-full bg-cyan-300 shadow-[0_0_22px_#67e8f9]" />
                <span class="absolute bottom-[18%] left-1/2 size-3 -translate-x-1/2 rounded-full bg-white shadow-[0_0_22px_white]" />
                <svg viewBox="0 0 400 400" class="absolute inset-0 size-full" fill="none">
                  <path d="M80 92 200 300 320 92M80 92h240" stroke="url(#vpn-line)" stroke-width="1.5" stroke-dasharray="6 8" />
                  <defs>
                    <linearGradient id="vpn-line" x1="80" x2="320" y1="92" y2="300" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#ed1c24" />
                      <stop offset=".5" stop-color="#fff" stop-opacity=".4" />
                      <stop offset="1" stop-color="#67e8f9" />
                    </linearGradient>
                  </defs>
                </svg>
                <div class="absolute bottom-8 left-8 right-8 flex justify-between text-[10px] font-medium tracking-[0.18em] text-white/35">
                  <span>NODE 01</span>
                  <span>LINK ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </UContainer>
      </section>

      <section id="universo" class="border-y border-white/10 bg-white/[0.025]">
        <UContainer class="grid gap-10 py-20 lg:grid-cols-[0.65fr_1.35fr] lg:py-28">
          <div>
            <p class="text-[11px] font-semibold tracking-[0.28em] text-[#ff6468]">O UNIVERSO VPN</p>
            <h2 class="mt-5 max-w-sm text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl">Uma cidade feita de escolhas.</h2>
          </div>
          <div class="max-w-2xl text-lg leading-8 text-white/55">
            <p>A VPN é um espaço compartilhado para quem quer construir histórias — na rua, nos bastidores, no rádio ou no centro dos acontecimentos.</p>
            <p class="mt-5">Não existe roteiro único. Existe a próxima decisão.</p>
          </div>
        </UContainer>
      </section>

      <section id="como-funciona">
        <UContainer class="py-20 lg:py-28">
          <div class="flex flex-col justify-between gap-6 border-b border-white/10 pb-10 sm:flex-row sm:items-end">
            <div>
              <p class="text-[11px] font-semibold tracking-[0.28em] text-[#ff6468]">COMO FUNCIONA</p>
              <h2 class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Tudo está conectado.</h2>
            </div>
            <p class="max-w-sm text-sm leading-6 text-white/45">Do primeiro contato ao próximo plantão, seu papel muda a cidade ao redor.</p>
          </div>

          <div class="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            <article v-for="pillar in pillars" :key="pillar.eyebrow" class="py-10 md:px-8 md:first:pl-0 md:last:pr-0">
              <UIcon :name="pillar.icon" class="size-6 text-[#ed1c24]" />
              <p class="mt-8 text-[10px] font-semibold tracking-[0.2em] text-white/35">{{ pillar.eyebrow }}</p>
              <h3 class="mt-4 max-w-xs text-xl font-semibold leading-tight tracking-[-0.025em] text-white">{{ pillar.title }}</h3>
              <p class="mt-4 max-w-xs text-sm leading-6 text-white/45">{{ pillar.description }}</p>
            </article>
          </div>
        </UContainer>
      </section>

      <section class="px-4 pb-6 sm:px-6">
        <div class="relative isolate overflow-hidden rounded-[2rem] border border-[#ed1c24]/35 bg-[#ed1c24] px-6 py-16 text-center sm:px-12 lg:py-24">
          <div class="vpn-noise absolute inset-0 -z-10 opacity-20" aria-hidden="true" />
          <p class="text-[11px] font-semibold tracking-[0.28em] text-white/65">A PRÓXIMA HISTÓRIA É SUA</p>
          <h2 class="mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-none tracking-[-0.05em] text-white sm:text-6xl">A cidade está esperando.</h2>
          <p class="mx-auto mt-6 max-w-lg text-base leading-7 text-white/75">Leia as últimas notícias, conheça os pontos de tensão e encontre seu lugar na VPN.</p>
          <UButton class="mt-9" size="xl" color="neutral" to="https://vpn-news.labafero.com" target="_blank" label="Abrir VPN News" trailing-icon="i-lucide-arrow-up-right" />
        </div>
      </section>
    </main>

    <footer>
      <UContainer class="flex flex-col gap-4 py-8 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
        <p>© {{ new Date().getFullYear() }} VPN Roleplay</p>
        <p class="tracking-[0.18em]">A CIDADE NUNCA DORME</p>
      </UContainer>
    </footer>
  </div>
</template>
