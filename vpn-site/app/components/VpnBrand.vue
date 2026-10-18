<template>
  <span class="vpn-brand">
    <span
      class="vpn-brand__mark grid size-10 place-items-center rounded-xl bg-[#ed1c24] shadow-[0_0_28px_rgba(237,28,36,0.26)] transition-transform group-hover:scale-105"
    >
      <svg
        viewBox="0 0 512 512"
        aria-hidden="true"
        class="size-7"
      >
        <path
          d="M112 128 256 384 400 128"
          fill="none"
          stroke="white"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="58"
        />
        <circle
          cx="112"
          cy="128"
          r="30"
          fill="white"
        />
        <circle
          cx="256"
          cy="384"
          r="30"
          fill="white"
        />
        <circle
          cx="400"
          cy="128"
          r="30"
          fill="white"
        />
      </svg>
    </span>
    <span
      class="vpn-brand__text text-xs font-semibold tracking-[0.12em] text-white sm:text-sm sm:tracking-[0.22em]"
    >
      VPN
      <span class="text-white/45">ROLEPLAY</span>
    </span>
  </span>
</template>

<style scoped>
.vpn-brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--brand-gap, 0.5rem);
}

.vpn-brand__mark {
  width: var(--brand-mark-size, 2.5rem);
  height: var(--brand-mark-size, 2.5rem);
  flex-shrink: 0;
  border-radius: var(--brand-radius, 0.75rem);
}

.vpn-brand__mark svg {
  width: 70%;
  height: 70%;
}

.vpn-brand__text {
  font-size: var(--brand-font-size, 0.75rem);
  letter-spacing: var(--brand-tracking, 0.12em);
  white-space: nowrap;
}

@media (min-width: 640px) {
  .vpn-brand {
    gap: var(--brand-gap, 0.75rem);
  }

  .vpn-brand__text {
    font-size: var(--brand-font-size, 0.875rem);
    letter-spacing: var(--brand-tracking, 0.22em);
  }
}
</style>
