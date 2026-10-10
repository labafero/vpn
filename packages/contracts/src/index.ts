import type { components, paths } from './generated'
export type { components, paths }
export type HealthResponse = components['schemas']['HealthResponse']
export type CityConfig = components['schemas']['CityConfig']
export type Post = components['schemas']['Post']
export type Me = components['schemas']['Me']
export type ApiError = components['schemas']['ApiError']
export type TwitchConnection = components['schemas']['TwitchConnection']
export type MonitoringChannel = components['schemas']['MonitoringChannel']
export type MonitoringSession = components['schemas']['MonitoringSession']
export type MonitoringSessionPage = components['schemas']['MonitoringSessionPage']
export type AccessInvite = components['schemas']['AccessInvite']
export type InviteCreated = components['schemas']['InviteCreated']
export type ContractsApi = {
  '/health': { GET: { response: HealthResponse } }
  '/cities': { GET: { response: CityConfig[] } }
  '/posts': { GET: { query: { cidade?: string; limit?: number }; response: Post[] } }
}
