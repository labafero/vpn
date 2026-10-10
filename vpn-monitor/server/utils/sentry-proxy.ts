export function allowSentryRequest(path: string, method: string, origin: string | undefined, csrf: string | undefined, expectedOrigin: string): boolean {
  const allowed: Record<string, string[]> = {
    'me': ['GET'],
    'provider-connections/twitch': ['GET', 'DELETE'],
    'provider-connections/twitch/authorize': ['POST'],
    'provider-connections/twitch/callback': ['GET']
  }
  const dynamic: Record<string, string[]> = {
    'channels/[uuid]/monitoring': ['PATCH'],
    'sessions/[uuid]': ['GET'],
    'sessions/[uuid]/invites': ['GET', 'POST'],
    'invites/[uuid]': ['DELETE']
  }
  const segments = path.split('/')
  const dynamicMatch = Object.entries(dynamic).find(([route]) => {
    const routeSegments = route.split('/')
    return routeSegments.length === segments.length && routeSegments.every((segment, index) => segment === '[uuid]' ? /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(segments[index] || '') : segment === segments[index])
  })
  const methods = allowed[path] || (dynamicMatch ? dynamicMatch[1] : undefined) || (path === 'channels' ? ['GET'] : path === 'sessions' ? ['GET'] : path === 'invites/accept' ? ['POST'] : [])
  if (!methods.includes(method)) return false
  return method === 'GET' || (origin === expectedOrigin && csrf === '1')
}
