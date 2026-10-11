import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '#supabase/server': fileURLToPath(new URL('./vpn-monitor/tests/support/supabase-server.ts', import.meta.url)) } },
  test: {
    include: ['packages/contracts/tests/**/*.test.ts', 'vpn-sentry/tests/**/*.test.ts', 'vpn-monitor/tests/**/*.test.ts', 'vpn-news/tests/**/*.test.ts'],
    environment: 'node'
  }
})
