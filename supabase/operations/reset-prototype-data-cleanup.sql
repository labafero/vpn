DO $$
BEGIN
  IF (SELECT count(*) FROM storage.objects) <> 0 THEN RAISE EXCEPTION 'Storage objects remain'; END IF;
  IF EXISTS (SELECT 1 FROM public.provider_connections WHERE status <> 'revoked') THEN RAISE EXCEPTION 'Twitch revocation is incomplete'; END IF;
  IF (SELECT count(*) FROM private.provider_credentials) <> 0 THEN RAISE EXCEPTION 'Encrypted provider credentials remain'; END IF;
  IF EXISTS (SELECT 1 FROM private.twitch_eventsub_subscriptions WHERE subscription_id IS NOT NULL) THEN RAISE EXCEPTION 'EventSub subscriptions remain'; END IF;

  DELETE FROM private.access_invites;
  DELETE FROM public.posts;
  DELETE FROM public.city_seasons;
  DELETE FROM public.market_values;
  DELETE FROM public.market_items;
  DELETE FROM private.twitch_eventsub_messages;
  DELETE FROM auth.users;
  DELETE FROM public.city_config;
END
$$;
