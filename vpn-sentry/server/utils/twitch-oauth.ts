import { createHash, randomBytes } from 'node:crypto'
import type { Me } from '@vpn/contracts'
import { FoundationError } from './api-error'
import { decryptTokens, encryptTokens, type Tokens } from './token-crypto'
import { canAuthorizeConnection, getFoundationRepository, type FoundationRepository, type Credential, type StoredConnection, type LockedConnection } from './private-database'

export type TwitchConfig = { clientId: string; clientSecret: string; redirectUri: string; monitorOrigin: string; encryptionKey: string; keyVersion: string }
export type TwitchIdentity = { clientId: string; userId: string; login: string; scopes: string[]; expiresIn: number }
export type TwitchGateway = {
  exchange: (code: string) => Promise<Tokens & { expiresIn: number }>
  refresh: (refreshToken: string) => Promise<Tokens & { expiresIn: number }>
  validate: (accessToken: string) => Promise<TwitchIdentity | null>
  revoke: (accessToken: string) => Promise<void>
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

export function createTwitchOAuthService(config: TwitchConfig, repository: FoundationRepository, gateway: TwitchGateway, now = () => new Date()) {
  function validateConfig() {
    if (!config.clientId || !config.clientSecret || !config.redirectUri || !config.monitorOrigin) throw new FoundationError(503)
    const origin = new URL(config.monitorOrigin)
    if (origin.origin !== config.monitorOrigin || (origin.protocol !== 'https:' && origin.hostname !== 'localhost' && origin.hostname !== '127.0.0.1')) throw new FoundationError(503)
    if (config.redirectUri !== `${config.monitorOrigin}/api/sentry/provider-connections/twitch/callback`) throw new FoundationError(503)
    encryptTokens({ accessToken: '', refreshToken: '' }, config.encryptionKey, config.keyVersion)
  }
  function encrypt(value: Tokens, expiresIn: number, time: Date, retryUntil: string | null = null): Credential {
    return { ...encryptTokens(value, config.encryptionKey, config.keyVersion), expiresAt: new Date(time.getTime() + expiresIn * 1000).toISOString(), validatedAt: time.toISOString(), retryUntil }
  }
  const decrypt = (value: Credential) => decryptTokens(value, config.encryptionKey, config.keyVersion)

  async function finishRevocation(value: StoredConnection | null, locked: LockedConnection, time: Date): Promise<'revoked' | 'revocation_pending'> {
    if (!value || value.connection.status === 'revoked') return 'revoked'
    if (!value.credential) return value.connection.status === 'revocation_pending' ? 'revocation_pending' : 'revoked'
    if (value.credential.retryUntil && value.credential.retryUntil <= time.toISOString()) {
      await locked.deleteCredential()
      await locked.audit('revocation_failed')
      return 'revocation_pending'
    }
    try { await gateway.revoke(decrypt(value.credential).accessToken) } catch { return 'revocation_pending' }
    await locked.setStatus('revoked', value.connection.revokedAt ?? time.toISOString())
    await locked.deleteCredential()
    return 'revoked'
  }

  return {
    async beginTwitchAuthorization(user: Me, consent: { consentVersion: string; consentAccepted: boolean }, browserNonce: string) {
      validateConfig()
      if (consent.consentVersion !== 'monitoring-v1' || consent.consentAccepted !== true || !browserNonce) throw new FoundationError(400)
      const current = await repository.getConnection(user.userId)
      if (!canAuthorizeConnection(current)) throw new FoundationError(409)
      const state = randomBytes(32).toString('base64url')
      await repository.createAuthorization({ stateHash: hash(state), userId: user.userId, nonceHash: hash(browserNonce), consentVersion: 'monitoring-v1', expiresAt: new Date(now().getTime() + 600000).toISOString() })
      const url = new URL('https://id.twitch.tv/oauth2/authorize')
      for (const [name, value] of Object.entries({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: '', state, force_verify: 'true' })) url.searchParams.set(name, value)
      return { authorizationUrl: url.toString() }
    },
    async completeTwitchAuthorization(user: Me, input: { code: string; state: string; browserNonce: string }) {
      validateConfig()
      const time = now()
      if (!input.code || !input.state || !input.browserNonce || !await repository.consumeAuthorization(hash(input.state), hash(input.browserNonce), user.userId, time.toISOString())) throw new FoundationError(400)
      const tokens = await gateway.exchange(input.code)
      try {
        const identity = await gateway.validate(tokens.accessToken)
        if (!identity || identity.clientId !== config.clientId || !identity.userId || !identity.login || identity.scopes.length !== 0) throw new FoundationError(400)
        await repository.saveConnection(user.userId, { userId: identity.userId, login: identity.login }, encrypt(tokens, identity.expiresIn, time), time.toISOString())
      } catch (error) {
        // A token issued by Twitch must not be left usable after a failed link.
        try { await gateway.revoke(tokens.accessToken) } catch { /* No raw provider error is logged. */ }
        throw error instanceof FoundationError ? error : new FoundationError(503)
      }
    },
    async getTwitchConnection(user: Me) {
      const value = await repository.getConnection(user.userId)
      return value ? { ...value.connection, canReconnect: canAuthorizeConnection(value) } : null
    },
    async disconnectTwitch(user: Me) {
      validateConfig()
      const time = now()
      // Commit local withdrawal before any remote call. Worker and API share locks.
      await repository.withConnection(user.userId, async (value, locked) => {
        if (!value || value.connection.status === 'revoked' || value.connection.status === 'revocation_pending') return
        await locked.setStatus('revocation_pending', time.toISOString())
        if (value.credential) await locked.saveCredential({ ...value.credential, retryUntil: new Date(time.getTime() + 86400000).toISOString() })
      })
      return repository.withConnection(user.userId, (value, locked) => finishRevocation(value, locked, time))
    },
    async validateStoredConnections(time: Date, options: { maxDurationMs?: number } = {}) {
      validateConfig()
      const deadline = Date.now() + (options.maxDurationMs ?? Infinity)
      const result = { checked: 0, expired: 0, failed: 0, deferred: 0 }
      const users = await repository.listWorkUsers()
      for (const [index, userId] of users.entries()) {
        if (Date.now() >= deadline) {
          result.deferred = users.length - index
          break
        }
        try {
          await repository.recordWorkAttempt(userId)
          await repository.withConnection(userId, async (value, locked) => {
            if (!value || !value.credential) return
            if (value.connection.status === 'revocation_pending') {
              if (await finishRevocation(value, locked, time) === 'revocation_pending') result.failed++
              return
            }
            if (value.connection.status !== 'connected') return
            result.checked++
            let credential = value.credential
            let tokens = decrypt(credential)
            if (new Date(credential.expiresAt).getTime() <= time.getTime() + 60000) {
              try {
                const refreshed = await gateway.refresh(tokens.refreshToken)
                tokens = refreshed
                credential = encrypt(tokens, refreshed.expiresIn, time)
              } catch (error) {
                if (!(error instanceof FoundationError) || error.statusCode !== 401) throw error
                await locked.setStatus('expired', null)
                await locked.audit('authorization_expired')
                result.expired++
                return
              }
              // Persist rotated refresh token before validation can fail.
              await locked.saveCredential(credential)
            }
            let identity: TwitchIdentity | null
            try { identity = await gateway.validate(tokens.accessToken) } catch {
              // Commit a rotated refresh token even when /validate is unavailable.
              result.failed++
              return
            }
            if (!identity || identity.clientId !== config.clientId || identity.userId !== value.connection.providerUserId || identity.scopes.length !== 0) {
              await locked.setStatus('expired', null)
              await locked.audit('authorization_expired')
              result.expired++
              return
            }
            await locked.saveCredential({ ...credential, expiresAt: new Date(time.getTime() + identity.expiresIn * 1000).toISOString(), validatedAt: time.toISOString() })
          })
        } catch { result.failed++ }
      }
      await repository.cleanAuthorizations(time.toISOString())
      return result
    }
  }
}

export function createTwitchGateway(config: TwitchConfig, fetcher = fetch): TwitchGateway {
  async function request(path: string, options: RequestInit) {
    try { return await fetcher(`https://id.twitch.tv/oauth2/${path}`, { ...options, signal: AbortSignal.timeout(10000) }) } catch { throw new FoundationError(503) }
  }
  async function token(params: Record<string, string>) {
    const response = await request('token', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }) })
    if (params.grant_type === 'refresh_token' && (response.status === 400 || response.status === 401)) throw new FoundationError(401)
    if (!response.ok) throw new FoundationError(503)
    const value = await response.json() as { access_token: string; refresh_token: string; expires_in: number }
    if (!value.access_token || !value.refresh_token || !Number.isFinite(value.expires_in) || value.expires_in <= 0) throw new FoundationError(503)
    return { accessToken: value.access_token, refreshToken: value.refresh_token, expiresIn: value.expires_in }
  }
  return {
    exchange: code => token({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri }),
    refresh: refreshToken => token({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    async validate(accessToken) {
      const response = await request('validate', { headers: { Authorization: `OAuth ${accessToken}` } })
      if (response.status === 401) return null
      if (!response.ok) throw new FoundationError(503)
      const value = await response.json() as { client_id: string; user_id: string; login: string; scopes: string[] | null; expires_in: number }
      // Twitch represents no granted scopes as null in real validate responses.
      const scopes = value.scopes === null ? [] : value.scopes
      if (!value.client_id || !value.user_id || !value.login || !Array.isArray(scopes) || !Number.isFinite(value.expires_in) || value.expires_in < 0) throw new FoundationError(503)
      return { clientId: value.client_id, userId: value.user_id, login: value.login, scopes, expiresIn: value.expires_in }
    },
    async revoke(accessToken) {
      const response = await request('revoke', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, token: accessToken }) })
      if (response.status !== 200 && response.status !== 400) throw new FoundationError(503)
    }
  }
}

export function getTwitchOAuthService() {
  const config = {
    clientId: process.env.NUXT_TWITCH_CLIENT_ID || '', clientSecret: process.env.NUXT_TWITCH_CLIENT_SECRET || '',
    redirectUri: process.env.NUXT_TWITCH_REDIRECT_URI || '', monitorOrigin: process.env.NUXT_MONITOR_ORIGIN || '',
    encryptionKey: process.env.NUXT_TOKEN_ENCRYPTION_KEY || '', keyVersion: process.env.NUXT_TOKEN_KEY_VERSION || ''
  }
  return createTwitchOAuthService(config, getFoundationRepository(), createTwitchGateway(config))
}
