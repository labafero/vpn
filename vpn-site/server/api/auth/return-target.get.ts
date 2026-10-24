import { resolveAuthReturnTarget } from '../../../app/utils/auth-actions'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const configuredOrigins = useRuntimeConfig(event).authReturnOrigins
  const allowedOrigins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return {
    returnTo: resolveAuthReturnTarget(
      typeof query.return_to === 'string' ? query.return_to : null,
      allowedOrigins
    )
  }
})
