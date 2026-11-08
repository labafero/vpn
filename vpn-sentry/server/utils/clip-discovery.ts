import type { ClipAccess } from './clip-repository'
import type {
  ClipDiscoveryClaim,
  ClipDiscoveryRepository,
  DiscoveryWindow
} from './clip-discovery-repository'
import type { ClipMetadata } from './twitch-clips'
import { requireScheduledClipAccess } from './clip-ingestion'
import { logClipDebug } from './clip-logging'

export type ClipDiscoveryGateway = {
  listByBroadcaster(input: {
    access: ClipAccess
    startedAt: string
    endedAt: string
    after?: string | null
  }): Promise<{ items: ClipMetadata[]; cursor: string | null }>
  getBroadcasterCreatedAt(access: ClipAccess): Promise<string>
}
export type ClipDiscoveryState = Omit<ClipDiscoveryClaim, 'ownerId' | 'channelId' | 'access'>
export function createClipDiscoveryService(
  repository: ClipDiscoveryRepository,
  gateway: ClipDiscoveryGateway,
  now: () => Date = () => new Date()
) {
  function nextWindow(state: ClipDiscoveryState): DiscoveryWindow[] {
    return state.pendingWindows
  }
  return {
    async runNext(): Promise<{
      phase: 'backfill' | 'incremental' | 'idle'
      discovered: number
      complete: boolean
    }> {
      const claim = await repository.claimNext()
      if (!claim) return { phase: 'idle', discovered: 0, complete: false }
      requireScheduledClipAccess(claim.access)
      const currentTime = now().toISOString()
      logClipDebug({
        stage: 'clip_discovery',
        outcome: 'started',
        diagnosticCode: claim.access.consent.scheduledHistoryEnabled
          ? 'history_opt_in'
          : 'future_only'
      })
      if (!claim.startedAt || !claim.endedAt) {
        const historyConsentAt = claim.access.consent.scheduledHistoryConsentedAt
        if (
          claim.access.consent.scheduledHistoryEnabled &&
          historyConsentAt &&
          claim.phase === 'backfill'
        ) {
          const createdAt = await gateway.getBroadcasterCreatedAt(claim.access)
          const startedAt = new Date(
            Math.min(Date.parse(createdAt), Date.parse(currentTime) - 1000)
          ).toISOString()
          await repository.initialize(claim, {
            startedAt,
            endedAt: new Date(
              Math.min(Date.parse(historyConsentAt), Date.parse(currentTime))
            ).toISOString()
          })
          return { phase: 'backfill', discovered: 0, complete: false }
        }
        const incrementalFloor = Date.parse(currentTime) - 7 * 86400000
        const lowerBound = claim.completedAt
          ? Math.min(Date.parse(claim.completedAt), incrementalFloor)
          : Date.parse(claim.access.consent.scheduledConsentedAt ?? currentTime)
        const consentFloor = Math.max(
          Date.parse(claim.access.consent.scheduledConsentedAt ?? currentTime),
          claim.access.consent.scheduledHistoryRevokedAt
            ? Date.parse(claim.access.consent.scheduledHistoryRevokedAt)
            : Number.NEGATIVE_INFINITY
        )
        await repository.initialize(claim, {
          startedAt: new Date(Math.max(lowerBound, consentFloor)).toISOString(),
          endedAt: currentTime
        })
        return { phase: 'incremental', discovered: 0, complete: false }
      }

      const page = await gateway.listByBroadcaster({
        access: claim.access,
        startedAt: claim.startedAt,
        endedAt: claim.endedAt,
        after: claim.cursor
      })
      logClipDebug({
        stage: 'clip_discovery',
        outcome: 'succeeded',
        diagnosticCode: claim.phase,
        startedAt: claim.startedAt,
        endedAt: claim.endedAt,
        resultCount: page.items.length,
        cursorPresent: Boolean(page.cursor)
      })
      const itemCount = claim.itemsInWindow + page.items.length
      let next: ClipDiscoveryState
      if (itemCount >= 1000) {
        const startMs = Date.parse(claim.startedAt)
        const endMs = Date.parse(claim.endedAt)
        const midpoint = Math.floor((startMs + endMs) / 2)
        if (midpoint > startMs && midpoint < endMs) {
          const split = [
            {
              startedAt: new Date(startMs).toISOString(),
              endedAt: new Date(midpoint).toISOString()
            },
            { startedAt: new Date(midpoint).toISOString(), endedAt: new Date(endMs).toISOString() }
          ]
          const [current, ...queued] = split
          if (!current) throw new Error('Intervalo de descoberta vazio')
          next = {
            ...claim,
            startedAt: current.startedAt,
            endedAt: current.endedAt,
            cursor: null,
            pendingWindows: [...queued, ...nextWindow(claim)],
            itemsInWindow: 0
          }
        } else {
          next = { ...claim, cursor: page.cursor, itemsInWindow: itemCount }
        }
      } else if (page.cursor) {
        next = { ...claim, cursor: page.cursor, itemsInWindow: itemCount }
      } else if (claim.pendingWindows.length) {
        const [window, ...pendingWindows] = claim.pendingWindows
        if (!window) throw new Error('Checkpoint de descoberta inválido')
        next = {
          ...claim,
          startedAt: window.startedAt,
          endedAt: window.endedAt,
          cursor: null,
          pendingWindows,
          itemsInWindow: 0
        }
      } else if (claim.phase === 'backfill') {
        next = {
          ...claim,
          phase: 'incremental',
          startedAt: null,
          endedAt: null,
          cursor: null,
          pendingWindows: [],
          itemsInWindow: 0,
          completedAt: claim.endedAt
        }
      } else {
        next = {
          ...claim,
          startedAt: null,
          endedAt: null,
          cursor: null,
          itemsInWindow: 0,
          completedAt: claim.endedAt
        }
      }
      const result = await repository.advance(claim, {
        clips: page.items,
        cursor: page.cursor,
        next
      })
      if (!result.current) return { phase: 'idle', discovered: 0, complete: false }
      return {
        phase: claim.phase,
        discovered: result.discovered,
        complete: claim.phase === 'backfill' && next.phase === 'incremental'
      }
    }
  }
}
