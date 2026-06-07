import { serverSupabaseServiceRole } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const supabase = serverSupabaseServiceRole(event);

  const { data, error } = await supabase
    .from("spotify_connection")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data?.refresh_token) {
    return { playing: false };
  }

  let accessToken = data.access_token;
  const now = Date.now();
  const expiresAt = data.expires_at
    ? new Date(data.expires_at).getTime()
    : 0;

  if (now >= expiresAt - 60000) {
    const basic = Buffer.from(
      `${config.public.spotifyClientId}:${config.spotifyClientSecret}`,
    ).toString("base64");

    let refreshed: { access_token: string; expires_in: number };
    try {
      refreshed = await $fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: data.refresh_token,
        }),
      });
    } catch {
      return { playing: false };
    }

    accessToken = refreshed.access_token;
    const newExpiresAt = new Date(
      Date.now() + refreshed.expires_in * 1000,
    ).toISOString();

    await supabase
      .from("spotify_connection")
      .update({
        access_token: accessToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
  }

  try {
    const track = await $fetch<{
      is_playing: boolean;
      item: {
        name: string;
        artists: { name: string }[];
        album: { name: string; images: { url: string }[] };
        duration_ms: number;
      } | null;
      progress_ms: number;
    }>("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!track?.item || !track.is_playing) {
      return { playing: false };
    }

    return {
      playing: true,
      track_name: track.item.name,
      artist: track.item.artists.map((a) => a.name).join(", "),
      cover_url: track.item.album.images[0]?.url ?? null,
      progress_ms: track.progress_ms,
      duration_ms: track.item.duration_ms,
    };
  } catch {
    return { playing: false };
  }
});
