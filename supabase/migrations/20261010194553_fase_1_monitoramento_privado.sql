ALTER TABLE public.channels
  ADD COLUMN monitoring_consent_version text,
  ADD COLUMN monitoring_consented_at timestamptz,
  ADD COLUMN monitoring_reconciled_at timestamptz;

ALTER TABLE public.channels DROP CONSTRAINT channels_monitoring_enabled_check;
ALTER TABLE public.channels ADD CONSTRAINT channels_monitoring_consent_check
  CHECK (NOT monitoring_enabled OR (monitoring_consent_version = 'monitoring-v2' AND monitoring_consented_at IS NOT NULL));

CREATE TABLE private.monitoring_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_stream_id text NOT NULL UNIQUE,
  title text NOT NULL,
  category text,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX monitoring_sessions_one_active_per_channel ON private.monitoring_sessions(channel_id) WHERE ended_at IS NULL;
CREATE INDEX monitoring_sessions_owner_started_idx ON private.monitoring_sessions(owner_id, started_at DESC, id DESC);
ALTER TABLE private.monitoring_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.monitoring_sessions FROM PUBLIC, anon, authenticated;

CREATE TABLE private.access_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES private.monitoring_sessions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK ((accepted_by IS NULL) = (accepted_at IS NULL))
);
CREATE INDEX access_invites_session_idx ON private.access_invites(session_id, created_at DESC);

CREATE TABLE private.twitch_eventsub_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('stream.online', 'stream.offline')),
  subscription_id text UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'enabled', 'error')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_error_code text,
  UNIQUE(channel_id, event_type)
);
CREATE TABLE private.twitch_eventsub_messages (
  message_id text PRIMARY KEY,
  message_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX twitch_eventsub_messages_received_idx ON private.twitch_eventsub_messages(received_at);

REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.monitoring_sessions TO vpn_sentry;
CREATE POLICY sentry_monitoring_sessions ON private.monitoring_sessions TO vpn_sentry USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON private.access_invites, private.twitch_eventsub_subscriptions, private.twitch_eventsub_messages TO vpn_sentry;
GRANT USAGE ON SCHEMA private TO vpn_sentry;

CREATE FUNCTION private.stop_monitoring_on_connection_loss() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status <> 'connected' AND OLD.status = 'connected' THEN
    UPDATE public.channels SET monitoring_enabled=false, monitoring_reconciled_at=NULL WHERE connection_id=NEW.id;
    UPDATE private.monitoring_sessions SET ended_at=GREATEST(started_at,now()) WHERE channel_id IN (SELECT id FROM public.channels WHERE connection_id=NEW.id) AND ended_at IS NULL;
    UPDATE private.access_invites SET revoked_at=now() WHERE session_id IN (SELECT s.id FROM private.monitoring_sessions s JOIN public.channels c ON c.id=s.channel_id WHERE c.connection_id=NEW.id) AND revoked_at IS NULL;
    UPDATE private.twitch_eventsub_subscriptions SET status='error',updated_at=now(),last_error_code='connection_unavailable' WHERE channel_id IN (SELECT id FROM public.channels WHERE connection_id=NEW.id);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.stop_monitoring_on_connection_loss() FROM PUBLIC, anon, authenticated, vpn_sentry;
CREATE TRIGGER stop_monitoring_on_connection_loss AFTER UPDATE OF status ON public.provider_connections FOR EACH ROW EXECUTE FUNCTION private.stop_monitoring_on_connection_loss();
