import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const config = useRuntimeConfig();
  const state = crypto.randomUUID();

  setCookie(event, "spotify_oauth_state", state, {
    maxAge: 60 * 5,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  setCookie(event, "spotify_oauth_user_id", user.id, {
    maxAge: 60 * 5,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.public.spotifyClientId,
    scope: "user-read-currently-playing",
    redirect_uri: config.spotifyRedirectUri,
    state,
  });

  return {
    url: `https://accounts.spotify.com/authorize?${params.toString()}`,
  };
});
