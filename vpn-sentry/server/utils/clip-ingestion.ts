import { FoundationError } from './api-error'
import type { ClipAccess, ClipRepository } from './clip-repository'
import type { ClipMetadata } from './twitch-clips'

export function parseTwitchClipUrl(input: unknown) {
  if (typeof input !== 'string' || input.length > 2048 || /[\\\s]/.test(input))
    throw new FoundationError(400)
  // Match the original string: URL normalization must not hide ports or dot segments.
  const match =
    /^https:\/\/(?:clips\.twitch\.tv\/([A-Za-z0-9_-]{1,100})|(?:www\.)?twitch\.tv\/[A-Za-z0-9_]{1,25}\/clip\/([A-Za-z0-9_-]{1,100}))(?:[?#].*)?$/.exec(
      input
    )
  if (!match) throw new FoundationError(400)
  const id = (match[1] ?? match[2])!
  return { id, canonicalUrl: `https://clips.twitch.tv/${id}` }
}
export function requireClipAccess(
  access: ClipAccess | null,
  consent = true
): asserts access is ClipAccess {
  if (
    !access ||
    !access.connected ||
    !access.credential ||
    !access.scopes.includes('channel:manage:clips') ||
    (consent && (!access.consent.manualEnabled || access.consent.revokedAt))
  )
    throw new FoundationError(403)
}
export function requireScheduledClipAccess(
  access: ClipAccess | null
): asserts access is ClipAccess {
  if (
    !access ||
    !access.connected ||
    !access.credential ||
    Date.parse(access.credential.expiresAt) <= Date.now() ||
    !access.scopes.includes('channel:manage:clips') ||
    !access.consent.scheduledEnabled ||
    access.consent.scheduledConsentVersion !== 'clip-scheduled-v2' ||
    access.consent.scheduledRevokedAt
  )
    throw new FoundationError(403)
}
function strictBody(body: unknown, keys: string[]): asserts body is Record<string, unknown> {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !keys.includes(key))
  )
    throw new FoundationError(400)
}
export function createClipIngestionService(
  repository: ClipRepository,
  fetchClip: (id: string, access: ClipAccess) => Promise<ClipMetadata>
) {
  return {
    async list(owner: string, channel: string, cursor?: string | null) {
      return repository.list(owner, channel, cursor)
    },
    async detail(owner: string, channel: string, submissionId: string) {
      if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(submissionId))
        throw new FoundationError(400)
      return repository.detail(owner, channel, submissionId)
    },
    async setEvidenceApproval(owner: string, channel: string, submissionId: string, body: unknown) {
      strictBody(body, ['approved'])
      if (typeof body.approved !== 'boolean') throw new FoundationError(400)
      if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(submissionId))
        throw new FoundationError(400)
      return repository.setEvidenceApproval(owner, channel, submissionId, body.approved)
    },
    async getConsent(owner: string, channel: string) {
      const access = await repository.read(owner, channel)
      if (!access) throw new FoundationError(403)
      return {
        ...access.consent,
        canDownload: access.connected && access.scopes.includes('channel:manage:clips')
      }
    },
    async setConsent(owner: string, channel: string, body: unknown) {
      strictBody(body, [
        'manualEnabled',
        'consentVersion',
        'consentAccepted',
        'scheduledEnabled',
        'scheduledConsentVersion',
        'scheduledConsentAccepted',
        'scheduledHistoryEnabled',
        'scheduledHistoryConsentVersion',
        'scheduledHistoryConsentAccepted'
      ])
      const scheduled = 'scheduledEnabled' in body
      const history = 'scheduledHistoryEnabled' in body
      if (history) {
        if (
          Object.keys(body).some(
            (key) =>
              ![
                'scheduledHistoryEnabled',
                'scheduledHistoryConsentVersion',
                'scheduledHistoryConsentAccepted'
              ].includes(key)
          )
        )
          throw new FoundationError(400)
        if (
          typeof body.scheduledHistoryEnabled !== 'boolean' ||
          (body.scheduledHistoryEnabled &&
            (body.scheduledHistoryConsentVersion !== 'clip-history-v1' ||
              body.scheduledHistoryConsentAccepted !== true)) ||
          (!body.scheduledHistoryEnabled &&
            Object.keys(body).some((key) => key !== 'scheduledHistoryEnabled'))
        )
          throw new FoundationError(400)
        const access = await repository.setScheduledHistoryConsent(
          owner,
          channel,
          body.scheduledHistoryEnabled
        )
        return {
          ...access.consent,
          canDownload: access.connected && access.scopes.includes('channel:manage:clips')
        }
      }
      if (
        scheduled &&
        Object.keys(body).some(
          (key) =>
            !['scheduledEnabled', 'scheduledConsentVersion', 'scheduledConsentAccepted'].includes(
              key
            )
        )
      )
        throw new FoundationError(400)
      if (
        !scheduled &&
        Object.keys(body).some(
          (key) => !['manualEnabled', 'consentVersion', 'consentAccepted'].includes(key)
        )
      )
        throw new FoundationError(400)
      if (scheduled) {
        if (typeof body.scheduledEnabled !== 'boolean') throw new FoundationError(400)
        if (
          body.scheduledEnabled &&
          (body.scheduledConsentVersion !== 'clip-scheduled-v2' ||
            body.scheduledConsentAccepted !== true)
        )
          throw new FoundationError(400)
        if (!body.scheduledEnabled && Object.keys(body).some((key) => key !== 'scheduledEnabled'))
          throw new FoundationError(400)
      } else {
        if (
          typeof body.manualEnabled !== 'boolean' ||
          (body.manualEnabled &&
            (body.consentVersion !== 'clip-processing-v1' || body.consentAccepted !== true))
        )
          throw new FoundationError(400)
        if (!body.manualEnabled && Object.keys(body).some((key) => key !== 'manualEnabled'))
          throw new FoundationError(400)
      }
      const access = scheduled
        ? await repository.setScheduledConsent(owner, channel, body.scheduledEnabled as boolean)
        : await repository.setConsent(owner, channel, body.manualEnabled as boolean)
      return {
        ...access.consent,
        canDownload: access.connected && access.scopes.includes('channel:manage:clips')
      }
    },
    async submit(owner: string, channel: string, body: unknown) {
      strictBody(body, ['url'])
      const clip = parseTwitchClipUrl(body.url)
      const access = await repository.read(owner, channel)
      requireClipAccess(access)
      const existing = await repository.existing(owner, channel, clip.id)
      if (existing) return existing
      const metadata = await fetchClip(clip.id, access)
      if (metadata.id !== clip.id || metadata.broadcasterId !== access.broadcasterId)
        throw new FoundationError(403)
      return repository.insert(owner, channel, metadata, access)
    }
  }
}
