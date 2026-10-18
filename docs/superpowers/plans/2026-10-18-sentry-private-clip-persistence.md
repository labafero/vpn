# Private Clip Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist consented Twitch clip references and metadata privately, with owner isolation, explicit clip-processing consent, and bounded retention for finished records.

**Architecture:** Supabase Postgres is the durable source of truth for clip references, allowlisted Twitch metadata, consent state, and processing state. The Sentry service role is the only runtime reader/writer; browser access remains through authenticated Sentry endpoints added in issue #15. This issue stores no MP4/audio objects and does not add the worker queue, which belongs to issue #16.

**Tech Stack:** Supabase Postgres migrations, pgTAP, PGlite/Vitest foundation tests, generated `@vpn/database` types, existing private `vpn_sentry` database role, and Supabase Cron operation scripts.

**Spec:** [2026-10-18-sentry-cloud-clip-processing-design.md](../specs/2026-10-18-sentry-cloud-clip-processing-design.md), especially “Integração Twitch a provar,” “Autorização incremental e papel de editor,” and “Dados, privacidade e segurança.”

## Global Constraints

- Store only canonical Twitch clip references and allowlisted metadata; do not persist audio or video in this issue.
- Pending references remain available until processed or removed/revoked by the owner; do not expire them automatically while waiting for capacity.
- Retain minimal terminal submission metadata for 90 days after `finished_at`, then delete it through a database cleanup routine.
- Clip-processing consent is distinct from Twitch linking and live-monitoring consent; use version `clip-processing-v1`.
- `private` tables are not exposed through Supabase Data API to `anon` or `authenticated`; only `vpn_sentry` receives table privileges.
- Do not edit `packages/database/src/database.types.ts` manually; regenerate it from the local database after migrations.
- Do not apply migrations, create jobs, or change configuration in the remote Supabase project in this issue.

## Review Focus

- An authenticated or anonymous browser role must not read or modify any private consent/submission; pin in pgTAP and PGlite role tests.
- Repeated/concurrent submission of one clip for one channel must not create duplicates; pin the unique key and conflict behavior in database tests.
- Revoked consent must remain distinguishable from never-granted consent through its timestamp; pin that constraint in database tests. Issue #15 owns cancellation of pending work.
- The cleanup routine must retain pending and capacity-waiting submissions while removing terminal submissions older than 90 days; pin both sides with a controlled timestamp.
- Invalid state, consent version, or capture mode must be rejected by database constraints; pin each check in pgTAP.

---

### Task 1: Private consent and clip-submission schema

**Files:**

- Create: `supabase/migrations/20261018173747_phase2_clip_persistence.sql`
- Create: `supabase/tests/clip-persistence.test.sql`
- Modify: `vpn-sentry/tests/foundation-db.test.ts`

**Interfaces:**

- `private.clip_processing_consents`: one row per channel, consent version, `consented_at`, nullable `revoked_at`, and `manual_enabled`/`scheduled_enabled` booleans.
- `private.clip_submissions`: internal ID, owner/channel foreign keys, Twitch clip ID and canonical URL, allowlisted metadata (`broadcaster_id`, `creator_id`, `title`, `video_id`, `vod_offset`, `created_at`, `duration_seconds`, `language`, `view_count`), state, `received_at`, and nullable `finished_at`/sanitized failure code.
- Submission states use the spec’s values: `pending_metadata`, `pending_captions`, `needs_transcription_request`, `pending_asr`, `processing`, `completed`, `no_match`, `source_unavailable`, `failed_retryable`, `failed_terminal`, `cancelled_consent`.
- Add unique `(channel_id, twitch_clip_id)`, foreign keys to `public.channels(id)`, and indexes for `(state, received_at)` and terminal retention lookup. The Sentry query must join the channel and filter its `owner_id`; no owner ID is accepted from an untrusted client.
- Grant `SELECT`, `INSERT`, `UPDATE`, and `DELETE` only to `vpn_sentry`; revoke inherited/public, `anon`, and `authenticated` access.

- [x] **Step 1: Add failing pgTAP cases** for `authenticated`/`anon` `42501` denial, `vpn_sentry` read/write success, missing channel FK `23503`, invalid consent version/state `23514`, and duplicate `(channel_id, twitch_clip_id)` `23505`.
- [ ] **Step 2: Run the focused database test** with `supabase test db --local` and confirm the new assertions fail for the missing schema/constraints.
- [x] **Step 3: Implement the migration** with the consent and submission tables, foreign keys, unique/index constraints, private grants, and no public Data API exposure.
- [x] **Step 4: Add PGlite migration coverage** in `foundation-db.test.ts` proving browser roles cannot read private rows and submissions cannot reference missing channels after all migrations are applied. Cross-owner API isolation is verified in issue #15.
- [ ] **Step 5: Run the focused database tests** and confirm the constraints and role boundaries pass.
- [ ] **Step 6: Commit the schema task** with `git add -- supabase/migrations/20261018173747_phase2_clip_persistence.sql supabase/tests/clip-persistence.test.sql vpn-sentry/tests/foundation-db.test.ts && git commit -m 'feat: add private clip submission schema'`.

### Task 2: Pending/terminal retention routine

**Files:**

- Modify: `supabase/migrations/20261018173747_phase2_clip_persistence.sql`
- Create: `supabase/operations/schedule-clip-retention.sql`
- Modify: `supabase/tests/clip-persistence.test.sql`

**Interfaces:**

- `private.purge_expired_clip_submissions(p_now timestamptz) returns integer` deletes only finished submissions whose `finished_at <= p_now - interval '90 days'` and returns the deleted row count.
- Pending states, including `pending_asr`, are never deleted by time-based cleanup.
- Consent records remain until the owner/channel is deleted; issue #15 atomically revokes consent and cancels or removes pending submissions before any further download.
- The operation script schedules the database-local cleanup using the existing Supabase Cron pattern; this plan does not run it remotely. Local pgTAP execution is pending because Docker Desktop WSL integration is unavailable; PGlite covers the routine behavior and role grants.

- [x] **Step 1: Add failing retention assertions** for finished rows older/newer than 90 days and old rows in `pending_metadata`, `pending_asr`, and `processing`.
- [x] **Step 2: Implement the cleanup function** with an injectable `p_now`, a terminal-state allowlist, and a deterministic delete count.
- [x] **Step 3: Add the reviewed Cron operation script** with a stable job name and a matching unschedule statement; do not add or execute a remote job.
- [ ] **Step 4: Run pgTAP and PGlite tests** and confirm old terminal rows are removed while pending rows remain.
- [ ] **Step 5: Commit the retention task** with `git add -- supabase/migrations/20261018173747_phase2_clip_persistence.sql supabase/operations/schedule-clip-retention.sql supabase/tests/clip-persistence.test.sql && git commit -m 'feat: add clip metadata retention'`.

### Task 3: Generated types and data-policy documentation

**Files:**

- Modify: `packages/database/src/database.types.ts` (generated only)
- Modify: `docs/architecture/foundation.md`
- Create: `docs/validation/phase-2-persistence.md`

**Interfaces:**

- Generated types reflect the two private tables and cleanup function; no hand edits.
- The foundation document records clip consent as separate from `monitoring-v2`, the 90-day terminal metadata period, pending retention, and the absence of durable media storage in issue #14.
- The validation record lists local migration/test evidence and explicitly marks remote Supabase migration/Cron as not applied.

- [ ] **Step 1: Reset the local Supabase database** to apply the full migration chain, including the new issue #14 migration.
- [ ] **Step 2: Regenerate database types** with `supabase gen types typescript --local --schema public,private,graphql_public > packages/database/src/database.types.ts`.
- [ ] **Step 3: Update the architecture and validation records** with exact consent/retention decisions and local verification results, without personal clip data or credentials.
- [ ] **Step 4: Run `pnpm test:foundation`, `supabase test db --local`, `pnpm --filter @vpn/sentry typecheck`, `pnpm contracts:check`, and `pnpm format:check`**; record pass/fail evidence.
- [ ] **Step 5: Review the final diff** to confirm no generated file was hand-edited, no raw media/storage bucket was added, and no remote operation was performed.
- [ ] **Step 6: Commit generated types and documentation** with `git add -- packages/database/src/database.types.ts docs/architecture/foundation.md docs/validation/phase-2-persistence.md && git commit -m 'docs: document private clip persistence'`.

## Roadmap for the Existing Phase 2 Issues

Keep the existing issues; do not create duplicate tickets. Refine their descriptions against the approved spec and use these dependencies:

1. **#13 — Spike:** record the accepted local extraction/review result, $0 cloud direction, captions limitation, and the remaining validation boundary; close only after the spike artifacts are committed and reviewable.
2. **#14 — This plan:** private consent/submission schema, ownership constraints, metadata-only persistence, and retention routine.
3. **#15 — Ingestion and OAuth:** authenticated manual clip submission and consent UI; capability-scoped OAuth upgrade (`channel:manage:clips` for download, `clips:edit` only when API clip creation is enabled); reject clips from an unlinked broadcaster. Do not persist MP4s.
4. **#16 — Processing:** prove an official captions path; Whisper is user-requested only, and the Node worker downloads temporary media within quotas.
5. **#17 — Event API:** expose only authorized review data and stable contracts.
6. **#18 — Monitor review:** list/detail, phrase highlights, event status, and consent/revocation controls.
7. **#20 — Discord delivery:** private, idempotent alerts after event API and authorization are ready.
8. **#19 — End-to-end and operations:** validate the complete flow after #14–#18 and #20, then record capacity/rollback evidence.

Implementation order is #14 → #15 → #16 → #17 → #18; #20 depends on #17; #19 depends on all preceding deliveries. The plan for each later issue is refined when that issue becomes the next implementation unit.

## Validation Commands

Run after each relevant task:

```bash
supabase db reset --local
supabase test db --local
pnpm test:foundation
pnpm --filter @vpn/sentry typecheck
pnpm contracts:check
pnpm format:check
```

No production migration, Cron activation, Vercel deployment, or public media upload is part of this plan.
