import type { ClipAccess } from './clip-repository'
import type {
  ClipDiscoveryClaim,
  ClipDiscoveryRepository,
  DiscoveryWindow
} from './clip-discovery-repository'
import type { ClipMetadata } from './twitch-clips'
import { requireScheduledClipAccess } from './clip-ingestion'

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
      if (!claim.startedAt || !claim.endedAt) {
        if (claim.phase === 'backfill') {
          const createdAt = await gateway.getBroadcasterCreatedAt(claim.access)
          const startedAt = new Date(
            Math.min(Date.parse(createdAt), Date.parse(currentTime) - 1000)
          ).toISOString()
          await repository.initialize(claim, { startedAt, endedAt: currentTime })
          return { phase: 'backfill', discovered: 0, complete: false }
        }
        const incrementalFloor = Date.parse(currentTime) - 7 * 86400000
        await repository.initialize(claim, {
          startedAt: new Date(
            claim.completedAt
              ? Math.min(Date.parse(claim.completedAt), incrementalFloor)
              : incrementalFloor
          ).toISOString(),
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
