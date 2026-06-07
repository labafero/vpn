import { serverSupabaseUser, serverSupabaseServiceRole } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const supabase = serverSupabaseServiceRole(event);
  await supabase
    .from("spotify_connection")
    .delete()
    .eq("user_id", user.sub);

  return { success: true };
});
