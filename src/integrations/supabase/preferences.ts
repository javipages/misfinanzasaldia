import { supabase } from "@/integrations/supabase/client";
import { TABLE_USER_PREFERENCES } from "@/config/api";

export type UserPreferences = {
  user_id: string;
  selected_year: number;
  created_at: string;
  updated_at: string;
};

export async function getUserPreferences(): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from(TABLE_USER_PREFERENCES)
    .select("*")
    .single();
  if (error && error.code !== "PGRST116") throw error; // no rows
  return data ?? null;
}

export async function upsertUserPreferences(
  selected_year: number
): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from(TABLE_USER_PREFERENCES)
    .upsert([{ selected_year }], { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data!;
}
