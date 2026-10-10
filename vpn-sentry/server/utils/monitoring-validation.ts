import { FoundationError } from './api-error'

export function requireMonitoringUuid(value: string | undefined): string {
  if (!value || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)) throw new FoundationError(400)
  return value
}
