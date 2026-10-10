import { setTimeout } from 'node:timers/promises'
import { getTwitchOAuthService } from '../server/utils/twitch-oauth.ts'
import { closePrivateDatabase } from '../server/utils/private-database.ts'

const controller = new AbortController()
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => controller.abort())
try {
  while (!controller.signal.aborted) {
    try {
      const result = await getTwitchOAuthService().validateStoredConnections(new Date())
      console.log(JSON.stringify({ event: 'twitch_validation', ...result }))
      if (process.argv.includes('--once') && result.failed) process.exitCode = 1
    } catch {
      console.error(JSON.stringify({ event: 'twitch_validation_unavailable' }))
      if (process.argv.includes('--once')) process.exitCode = 1
    }
    if (process.argv.includes('--once')) break
    try { await setTimeout(50 * 60 * 1000, undefined, { signal: controller.signal }) } catch { break }
  }
} finally { await closePrivateDatabase() }
