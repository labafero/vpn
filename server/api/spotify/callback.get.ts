import { serverSupabaseUser, serverSupabaseServiceRole } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { code, state } = query;

  const storedState = getCookie(event, "spotify_oauth_state");

  if (!state || state !== storedState) {
    return sendRedirect(event, "/redacao/spotify?error=invalid_state");
  }

  deleteCookie(event, "spotify_oauth_state");

  const user = await serverSupabaseUser(event);
  if (!user) {
    return sendRedirect(event, "/redacao/spotify?error=not_authenticated");
  }

  const config = useRuntimeConfig();
  const basic = Buffer.from(
    `${config.public.spotifyClientId}:${config.spotifyClientSecret}`,
  ).toString("base64");

  let tokens: { access_token: string; refresh_token: string; expires_in: number };
  try {
    tokens = await $fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        code: code as string,
        redirect_uri: config.spotifyRedirectUri,
        grant_type: "authorization_code",
      }),
    });
  } catch (e) {
    console.error("[Spotify] Token exchange failed:", e);
    return sendRedirect(event, "/redacao/spotify?error=token_exchange_failed");
  }

  const expiresAt = new Date(
    Date.now() + tokens.expires_in * 1000,
  ).toISOString();

  const supabase = serverSupabaseServiceRole(event);
  const { error: upsertError } = await supabase
    .from("spotify_connection")
    .upsert(
      {
        user_id: user.sub,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: false },
    );

  if (upsertError) {
    console.error("[Spotify] Upsert failed:", upsertError);
    return sendRedirect(event, "/redacao/spotify?error=save_failed");
  }

  return sendRedirect(event, "/redacao/spotify?success=true");
});
