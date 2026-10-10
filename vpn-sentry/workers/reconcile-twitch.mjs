import { getMonitoringService } from '../server/utils/monitoring-runtime.ts'

try {
  const result = await getMonitoringService().reconcile()
  process.stdout.write(`Twitch reconciliation completed: ${result.checked} channels checked\n`)
} catch {
  process.stderr.write('Twitch reconciliation failed; sensitive provider details were omitted.\n')
  process.exitCode = 1
}
