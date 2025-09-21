import { supabase } from "@/integrations/supabase/client";
import { TABLE_USER_PREFERENCES } from "@/config/api";

export type UserPreferences = {
  user_id: string;
  selected_year: number;
  created_at: string;
  updated_at: string;
};

export async function getUserPreferences(): Promise<UserPreferences | null> {
  // Try to get existing preferences; allow 0 rows without error
  const { data, error } = await supabase
    .from(TABLE_USER_PREFERENCES)
    .select("*")
    .maybeSingle();
  if (error) throw error;

  if (data) return data;

  // Lazily create default preferences row for the current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data: created, error: insertError } = await supabase
    .from(TABLE_USER_PREFERENCES)
    .insert([{ user_id: userId }])
    .select()
    .single();
  if (insertError) throw insertError;
  return created ?? null;
}

export async function upsertUserPreferences(
  selected_year: number
): Promise<UserPreferences> {
  // Retrieve current user id to satisfy RLS and upsert on user_id
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from(TABLE_USER_PREFERENCES)
    .upsert([{ user_id: userId, selected_year }], { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data!;
}
