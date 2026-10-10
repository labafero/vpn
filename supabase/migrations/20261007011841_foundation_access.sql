-- Private foundation. Browser roles have read-only, RLS-filtered metadata.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vpn_sentry') THEN
    CREATE ROLE vpn_sentry NOLOGIN NOINHERIT;
  END IF;
END $$;

CREATE TABLE public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('member', 'vpn_admin'))
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
CREATE POLICY read_own_role ON public.user_roles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Necessary definer lookup: avoids RLS recursion and reads current role.
CREATE FUNCTION private.is_vpn_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'vpn_admin');
$$;
REVOKE ALL ON FUNCTION private.is_vpn_admin() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_vpn_admin() TO authenticated;

CREATE TABLE public.provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'twitch' CHECK (provider = 'twitch'),
  provider_user_id text NOT NULL,
  login text NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'revocation_pending', 'revoked')),
  consent_version text NOT NULL CHECK (consent_version = 'monitoring-v1'),
  consented_at timestamptz NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (provider, provider_user_id),
  UNIQUE (id, user_id)
);
ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_connections FROM anon, authenticated;
GRANT SELECT ON public.provider_connections TO authenticated;
CREATE POLICY read_authorized_connection ON public.provider_connections FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_vpn_admin()));

CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monitoring_enabled boolean NOT NULL DEFAULT false CHECK (monitoring_enabled = false),
  FOREIGN KEY (connection_id, owner_id) REFERENCES public.provider_connections(id, user_id) ON DELETE CASCADE
);
CREATE INDEX channels_owner_id_idx ON public.channels(owner_id);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.channels FROM anon, authenticated;
GRANT SELECT ON public.channels TO authenticated;
CREATE POLICY read_authorized_channel ON public.channels FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR (SELECT private.is_vpn_admin()));

CREATE TABLE private.provider_credentials (
  connection_id uuid PRIMARY KEY REFERENCES public.provider_connections(id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  tag text NOT NULL,
  key_version text NOT NULL,
  expires_at timestamptz NOT NULL,
  validated_at timestamptz NOT NULL,
  retry_until timestamptz
);
CREATE TABLE private.oauth_transactions (
  state_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  browser_nonce_hash text NOT NULL,
  consent_version text NOT NULL CHECK (consent_version = 'monitoring-v1'),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX oauth_transactions_user_id_idx ON private.oauth_transactions(user_id);
CREATE INDEX oauth_transactions_expiry_idx ON private.oauth_transactions(expires_at);
CREATE TABLE private.foundation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.provider_connections(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code IN ('revocation_failed', 'authorization_expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX foundation_audit_connection_idx ON private.foundation_audit(connection_id);
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public, private TO vpn_sentry;
GRANT SELECT ON public.user_roles TO vpn_sentry;
CREATE POLICY sentry_read_roles ON public.user_roles FOR SELECT TO vpn_sentry USING (true);
GRANT SELECT, INSERT, UPDATE ON public.provider_connections, public.channels TO vpn_sentry;
CREATE POLICY sentry_connections ON public.provider_connections TO vpn_sentry USING (true) WITH CHECK (true);
CREATE POLICY sentry_channels ON public.channels TO vpn_sentry USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON private.provider_credentials, private.oauth_transactions TO vpn_sentry;
GRANT SELECT, INSERT ON private.foundation_audit TO vpn_sentry;
-- Backend-only lookup for immediate sign-out/session revocation. Browser callers
-- receive no privileges on auth.sessions or this function.
CREATE FUNCTION private.vpn_session_active(owner_id uuid, session_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.id = session_id AND s.user_id = owner_id AND (s.not_after IS NULL OR s.not_after > now()));
$$;
REVOKE ALL ON FUNCTION private.vpn_session_active(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.vpn_session_active(uuid, uuid) TO vpn_sentry;
-- No LOGIN/password, role membership or role assignment endpoint is provisioned here.
