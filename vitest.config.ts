import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/contracts/tests/**/*.test.ts', 'vpn-sentry/tests/**/*.test.ts', 'vpn-monitor/tests/**/*.test.ts'],
    environment: 'node'
  }
})
