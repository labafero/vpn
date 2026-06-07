import { serverSupabaseUser, serverSupabaseServiceRole } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    return { connected: false };
  }

  const supabase = serverSupabaseServiceRole(event);
  const { data } = await supabase
    .from("spotify_connection")
    .select("id, updated_at, user_id")
    .eq("user_id", user.sub)
    .maybeSingle();

  return {
    connected: !!data,
    updated_at: data?.updated_at ?? null,
  };
});
