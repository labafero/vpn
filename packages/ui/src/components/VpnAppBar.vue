<script setup lang="ts">
import { computed, ref } from 'vue'
import { createVpnAppLinks, type VpnAppId, type VpnAppUrls } from '../index'
import VpnBrand from './VpnBrand.vue'

const props = defineProps<{
  activeApp: VpnAppId
  appUrls: VpnAppUrls
  authenticated: boolean
  accountLabel?: string
  signInHref: string
}>()

const emit = defineEmits<{
  signOut: []
}>()

const links = computed(() => createVpnAppLinks(props.activeApp, props.appUrls))
</script>

<template>
  <UHeader
    class="vpn-app-bar"
    :ui="{
      root: 'bg-vpn-ink/95 text-white border-vpn-border backdrop-blur h-14',
      container: 'max-w-7xl',
      center: 'hidden lg:flex',
      right: 'flex items-center justify-end gap-2 lg:flex-1',
      content: 'bg-vpn-ink text-white'
    }"
  >
    <template #left>
      <a
        :href="appUrls.site"
        class="vpn-app-bar__brand"
        aria-label="VPN Roleplay — início"
      >
        <VpnBrand />
      </a>
    </template>

    <template #default>
      <nav
        class="vpn-app-bar__desktop-nav"
        aria-label="Navegação VPN"
      >
        <a
          v-for="link in links"
          :key="link.id"
          :href="link.href"
          :aria-current="link.active ? 'page' : undefined"
          :class="{ 'is-active': link.active }"
        >
          {{ link.label }}
        </a>
      </nav>
    </template>

    <template #right>
      <div class="vpn-app-bar__account">
        <details
          v-if="authenticated"
          class="vpn-app-bar__account-details"
        >
          <summary class="vpn-app-bar__account-trigger">
            <span
              class="vpn-app-bar__session-indicator"
              aria-hidden="true"
            />
            <span>Conta VPN</span>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4"
              aria-hidden="true"
            />
          </summary>
          <div class="vpn-app-bar__account-menu">
            <p class="vpn-app-bar__account-label">Sessão VPN</p>
            <p class="vpn-app-bar__account-identity">{{ accountLabel || 'Usuário conectado' }}</p>
            <slot name="account-options" />
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="sm"
              class="vpn-app-bar__sign-out"
              @click="emit('signOut')"
            >
              Sair
            </UButton>
          </div>
        </details>
        <UButton
          v-else
          :to="signInHref"
          color="neutral"
          variant="ghost"
          size="sm"
          class="vpn-app-bar__sign-in"
        >
          Entrar
        </UButton>
      </div>
    </template>

    <template #toggle="{ open, toggle, ui }">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        size="sm"
        :class="ui.toggle({ class: 'vpn-app-bar__mobile-toggle text-white' })"
        :icon="open ? 'i-lucide-x' : 'i-lucide-menu'"
        :aria-label="open ? 'Fechar navegação VPN' : 'Abrir navegação VPN'"
        @click="toggle"
      ></UButton>
    </template>

    <template #body>
      <nav
        id="vpn-app-mobile-navigation"
        class="vpn-app-bar__mobile-nav"
        aria-label="Navegação VPN"
      >
        <a
          v-for="link in links"
          :key="link.id"
          :href="link.href"
          :aria-current="link.active ? 'page' : undefined"
          :class="{ 'is-active': link.active }"
        >
          {{ link.label }}
        </a>
      </nav>
    </template>
  </UHeader>
</template>

<style scoped>
.vpn-app-bar__brand,
.vpn-app-bar__desktop-nav a,
.vpn-app-bar__mobile-nav a,
.vpn-app-bar__account-trigger {
  color: inherit;
  text-decoration: none;
}

.vpn-app-bar__sign-in,
.vpn-app-bar__sign-out {
  border: 1px solid rgb(255 255 255 / 18%);
  background: rgb(255 255 255 / 4%);
  color: #fff;
}

.vpn-app-bar__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
}

.vpn-app-bar__desktop-nav {
  display: flex;
  height: 3.5rem;
  align-items: stretch;
  justify-content: center;
  gap: clamp(1rem, 4vw, 2.75rem);
}

.vpn-app-bar__desktop-nav a,
.vpn-app-bar__mobile-nav a {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  border-bottom: 2px solid transparent;
  color: rgb(255 255 255 / 62%);
  font-size: 0.875rem;
  transition:
    color 150ms ease,
    border-color 150ms ease;
}

.vpn-app-bar__desktop-nav a:hover,
.vpn-app-bar__mobile-nav a:hover,
.vpn-app-bar__desktop-nav a.is-active,
.vpn-app-bar__mobile-nav a.is-active {
  border-color: var(--vpn-red, #ed1c24);
  color: #fff;
}

.vpn-app-bar__account {
  display: flex;
  min-width: 0;
  justify-content: flex-end;
}

.vpn-app-bar__account-details {
  position: relative;
}

.vpn-app-bar__account-trigger {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 0.6rem;
  padding: 0.375rem 0.7rem;
  background: rgb(255 255 255 / 4%);
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  list-style: none;
}

.vpn-app-bar__account-trigger::-webkit-details-marker {
  display: none;
}

.vpn-app-bar__session-indicator {
  width: 0.5rem;
  height: 0.5rem;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0.8rem rgb(74 222 128 / 45%);
}

.vpn-app-bar__account-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 60;
  display: grid;
  width: min(19rem, calc(100vw - 2rem));
  gap: 0.75rem;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 0.75rem;
  padding: 1rem;
  background: var(--vpn-surface, #0b1015);
  box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 35%);
}

.vpn-app-bar__account-label {
  color: rgb(255 255 255 / 52%);
  font-size: 0.75rem;
}

.vpn-app-bar__account-identity {
  overflow-wrap: anywhere;
  font-size: 0.875rem;
  font-weight: 600;
}

.vpn-app-bar__mobile-toggle {
  width: 2.5rem;
  height: 2.5rem;
  justify-content: center;
  padding: 0;
}

.vpn-app-bar__mobile-nav {
  display: grid;
  gap: 0.25rem;
}

.vpn-app-bar__mobile-nav a {
  padding: 0.5rem 0.25rem;
}

.vpn-app-bar :focus-visible {
  outline: 2px solid var(--vpn-red-soft, #ff6468);
  outline-offset: 3px;
}

@media (max-width: 1023px) {
  .vpn-app-bar__account {
    min-width: 0;
  }

  .vpn-app-bar__account-trigger {
    gap: 0.4rem;
    padding-inline: 0.6rem;
    font-size: 0.8125rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vpn-app-bar * {
    scroll-behavior: auto;
    transition-duration: 0.01ms !important;
  }
}
</style>
