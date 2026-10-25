<template>
  <span class="vpn-brand">
    <span class="vpn-brand__mark">
      <svg
        viewBox="0 0 512 512"
        aria-hidden="true"
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
    <span class="vpn-brand__text">
      VPN
      <span>ROLEPLAY</span>
    </span>
  </span>
</template>

<style scoped>
.vpn-brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
}

.vpn-brand__mark {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.65rem;
  background: var(--vpn-red, #ed1c24);
  box-shadow: 0 0 28px rgb(237 28 36 / 26%);
}

.vpn-brand__mark svg {
  width: 70%;
  height: 70%;
}

.vpn-brand__text {
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.vpn-brand__text span {
  color: rgb(255 255 255 / 45%);
}

@media (min-width: 640px) {
  .vpn-brand__mark {
    width: 2.5rem;
    height: 2.5rem;
  }

  .vpn-brand__text {
    font-size: 0.875rem;
    letter-spacing: 0.2em;
  }
}
</style>
