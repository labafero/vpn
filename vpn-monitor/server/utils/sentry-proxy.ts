export function allowSentryRequest(path: string, method: string, origin: string | undefined, csrf: string | undefined, expectedOrigin: string): boolean {
  const allowed: Record<string, string[]> = {
    'me': ['GET'],
    'provider-connections/twitch': ['GET', 'DELETE'],
    'provider-connections/twitch/authorize': ['POST'],
    'provider-connections/twitch/callback': ['GET']
  }
  if (!allowed[path]?.includes(method)) return false
  return method === 'GET' || (origin === expectedOrigin && csrf === '1')
}
