import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '#supabase/server': fileURLToPath(
        new URL('./vpn-monitor/tests/support/supabase-server.ts', import.meta.url)
      )
    }
  },
  test: {
    include: [
      'packages/auth/tests/**/*.test.ts',
      'packages/contracts/tests/**/*.test.ts',
      'packages/ui/tests/**/*.test.ts',
      'scripts/phase-2-spike/tests/**/*.test.mjs',
      'vpn-sentry/tests/**/*.test.ts',
      'vpn-monitor/tests/**/*.test.ts',
      'vpn-news/tests/**/*.test.ts',
      'vpn-site/tests/**/*.test.ts'
    ],
    environment: 'node'
  }
})
