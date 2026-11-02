import type postgres from 'postgres'
import { FoundationError } from './api-error'
import { getFoundationDatabase } from './private-database'
import { normalizeClipPhrase } from './clip-detection'

export type ClipTriggerPhrase = {
  id: string
  text: string
  version: number
  enabled: boolean
}
export type ClipTriggerPhraseRepository = {
  list(owner: string, channel: string): Promise<ClipTriggerPhrase[]>
  create(owner: string, channel: string, text: string): Promise<ClipTriggerPhrase>
  update(
    owner: string,
    channel: string,
    phraseId: string,
    input: { text?: string; enabled?: boolean }
  ): Promise<ClipTriggerPhrase>
  deactivate(owner: string, channel: string, phraseId: string): Promise<void>
}

export function createClipTriggerPhraseRepository(sql: postgres.Sql): ClipTriggerPhraseRepository {
  async function authorized<T>(owner: string, work: (tx: postgres.TransactionSql) => Promise<T>) {
    const role = await sql`SELECT current_user AS role`
    if (role[0]?.role !== 'vpn_sentry') throw new FoundationError(503)
    return (await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${owner},0))`
      return work(tx)
    })) as T
  }
  async function requireOwner(tx: postgres.TransactionSql, owner: string, channel: string) {
    const rows = await tx`SELECT 1 FROM public.channels WHERE id=${channel} AND owner_id=${owner}`
    if (!rows[0]) throw new FoundationError(403)
  }
  async function wakeWaiting(tx: postgres.TransactionSql, channel: string) {
    await tx`UPDATE private.clip_submissions SET state='waiting_capacity',finished_at=NULL
      WHERE channel_id=${channel} AND state='needs_trigger_phrases'
        AND ((capture_mode='manual' AND EXISTS (SELECT 1 FROM private.clip_processing_consents cc WHERE cc.channel_id=${channel} AND cc.manual_enabled AND cc.revoked_at IS NULL))
          OR (capture_mode='scheduled' AND EXISTS (SELECT 1 FROM private.clip_processing_consents cc WHERE cc.channel_id=${channel} AND cc.scheduled_enabled AND cc.scheduled_revoked_at IS NULL)))`
  }
  return {
    list: (owner, channel) =>
      authorized(owner, async (tx) => {
        await requireOwner(tx, owner, channel)
        const rows =
          await tx`SELECT id,text,version,enabled FROM private.clip_trigger_phrases WHERE channel_id=${channel} ORDER BY created_at,id`
        return rows.map((row) => ({
          id: row.id,
          text: row.text,
          version: row.version,
          enabled: row.enabled
        }))
      }),
    create: (owner, channel, text) =>
      authorized(owner, async (tx) => {
        await requireOwner(tx, owner, channel)
        const normalized = normalizeClipPhrase(text)
        const inserted =
          await tx`INSERT INTO private.clip_trigger_phrases(channel_id,text,normalized_text)
        VALUES (${channel},${text},${normalized}) ON CONFLICT(channel_id,normalized_text) DO NOTHING
        RETURNING id,text,version,enabled`
        let row = inserted[0]
        if (!row) {
          const found =
            await tx`SELECT id,text,version,enabled FROM private.clip_trigger_phrases WHERE channel_id=${channel} AND normalized_text=${normalized} FOR UPDATE`
          if (!found[0]) throw new FoundationError(503)
          if (found[0].enabled) throw new FoundationError(400)
          const reenabled =
            await tx`UPDATE private.clip_trigger_phrases SET text=${text},enabled=true,version=version+1,updated_at=now()
          WHERE id=${found[0].id} RETURNING id,text,version,enabled`
          row = reenabled[0]
        }
        if (!row) throw new FoundationError(503)
        await wakeWaiting(tx, channel)
        return { id: row.id, text: row.text, version: row.version, enabled: row.enabled }
      }),
    update: (owner, channel, phraseId, input) =>
      authorized(owner, async (tx) => {
        await requireOwner(tx, owner, channel)
        let rows
        try {
          rows = await tx`UPDATE private.clip_trigger_phrases SET
            text=COALESCE(${input.text ?? null},text),
            normalized_text=COALESCE(${input.text ? normalizeClipPhrase(input.text) : null},normalized_text),
            version=version+CASE WHEN ${input.text ?? null}::text IS NULL THEN 0 ELSE 1 END,
            enabled=COALESCE(${input.enabled ?? null},enabled),updated_at=now()
          WHERE id=${phraseId} AND channel_id=${channel} RETURNING id,text,version,enabled`
        } catch (error) {
          if ((error as { code?: string }).code === '23505') throw new FoundationError(400)
          throw error
        }
        if (!rows[0]) throw new FoundationError(404)
        if (input.enabled) await wakeWaiting(tx, channel)
        return {
          id: rows[0].id,
          text: rows[0].text,
          version: rows[0].version,
          enabled: rows[0].enabled
        }
      }),
    deactivate: (owner, channel, phraseId) =>
      authorized(owner, async (tx) => {
        await requireOwner(tx, owner, channel)
        const rows = await tx`UPDATE private.clip_trigger_phrases SET enabled=false,updated_at=now()
        WHERE id=${phraseId} AND channel_id=${channel} RETURNING id`
        if (!rows[0]) throw new FoundationError(404)
      })
  }
}

export function createClipTriggerPhrasesService(repository: ClipTriggerPhraseRepository) {
  const parseText = (input: unknown) => {
    if (typeof input !== 'string' || input.trim().length < 1 || input.trim().length > 200)
      throw new FoundationError(400)
    const value = input.trim()
    if (!normalizeClipPhrase(value)) throw new FoundationError(400)
    return value
  }
  const strict = (body: unknown, allowed: string[]) => {
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some((key) => !allowed.includes(key))
    )
      throw new FoundationError(400)
    return body as Record<string, unknown>
  }
  return {
    list: (owner: string, channel: string) => repository.list(owner, channel),
    create: (owner: string, channel: string, body: unknown) => {
      const input = strict(body, ['text'])
      return repository.create(owner, channel, parseText(input.text))
    },
    update: (owner: string, channel: string, phraseId: string, body: unknown) => {
      const input = strict(body, ['text', 'enabled'])
      if (input.text === undefined && input.enabled === undefined) throw new FoundationError(400)
      if (input.enabled !== undefined && typeof input.enabled !== 'boolean')
        throw new FoundationError(400)
      return repository.update(owner, channel, phraseId, {
        ...(input.text === undefined ? {} : { text: parseText(input.text) }),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled as boolean })
      })
    },
    deactivate: (owner: string, channel: string, phraseId: string) =>
      repository.deactivate(owner, channel, phraseId)
  }
}

export const getClipTriggerPhrasesService = () =>
  createClipTriggerPhrasesService(createClipTriggerPhraseRepository(getFoundationDatabase()))
