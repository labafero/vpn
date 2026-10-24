import { getRequestURL } from 'h3'
import { resolveAuthReturnTarget } from '../../../app/utils/auth-actions'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const configuredOrigins = useRuntimeConfig(event).authReturnOrigins
  const allowedOrigins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  const requestOrigin = getRequestURL(event).origin
  const previewOrigin =
    process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null
  const environmentOrigin = previewOrigin === requestOrigin ? previewOrigin : requestOrigin
  const environmentOrigins =
    environmentOrigin === previewOrigin && previewOrigin
      ? [...allowedOrigins, previewOrigin]
      : allowedOrigins

  return {
    returnTo: resolveAuthReturnTarget(
      typeof query.return_to === 'string' ? query.return_to : null,
      environmentOrigins,
      environmentOrigin
    )
  }
})
