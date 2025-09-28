import { supabase } from "@/integrations/supabase/client";
import { TABLE_USER } from "@/config/api";
import { Json } from "@/lib/supabase";

export interface UserProfileSetup {
  incomeCategories: string[];
  expenseCategories: string[];
  assetCategories: string[];
  emailNotifications?: boolean;
}

export type UserData = {
  user_id: string;
  selected_year: number;
  onboarding_completed: boolean | null;
  onboarding_step: number | null;
  onboarding_completed_at?: string | null;
  email_notifications_enabled: boolean | null;
  tour_completed?: boolean | null;
  welcome_shown?: boolean | null;
  user_profile_setup: UserProfileSetup | null;
  created_at: string;
  updated_at: string;
};

export async function getUserData(): Promise<UserData | null> {
  try {
    // Try to get existing user data; allow 0 rows without error
    const { data, error } = await supabase
      .from(TABLE_USER)
      .select("*")
      .maybeSingle();

    if (error) {
      // If table doesn't exist, return null instead of throwing
      if (
        error.code === "PGRST116" ||
        error.message?.includes('relation "user" does not exist')
      ) {
        console.warn("User table doesn't exist yet, returning null");
        return null;
      }
      throw error;
    }

    if (data) return data as UserData;

    // Lazily create default user data row for the current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) return null;

    const { data: created, error: insertError } = await supabase
      .from(TABLE_USER)
      .insert([
        {
          user_id: userId,
          selected_year: new Date().getFullYear(),
          onboarding_completed: false,
          onboarding_step: 0,
          email_notifications_enabled: true,
          tour_completed: false,
          user_profile_setup: {},
        },
      ])
      .select()
      .single();

    if (insertError) {
      // If table doesn't exist during insert, return null
      if (
        insertError.code === "PGRST116" ||
        insertError.message?.includes('relation "user" does not exist')
      ) {
        console.warn("User table doesn't exist yet, returning null");
        return null;
      }
      throw insertError;
    }

    return (created ?? null) as UserData;
  } catch (error) {
    console.error("Error in getUserData:", error);
    // Return null instead of throwing to prevent app from breaking
    return null;
  }
}

export async function upsertUserPreferences(
  selected_year: number
): Promise<UserData> {
  // Retrieve current user id to satisfy RLS and upsert on user_id
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from(TABLE_USER)
    .upsert([{ user_id: userId, selected_year }], { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data! as UserData;
}

export async function updateUserOnboarding(
  onboardingStep: number,
  onboardingCompleted: boolean = false,
  userProfileSetup: UserProfileSetup | null = null
): Promise<UserData> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("User not authenticated");

  const updateData: {
    onboarding_step: number;
    user_profile_setup: Json;
    onboarding_completed?: boolean;
    onboarding_completed_at?: string;
  } = {
    onboarding_step: onboardingStep,
    user_profile_setup: userProfileSetup as Json,
  };

  if (onboardingCompleted) {
    updateData.onboarding_completed = true;
    updateData.onboarding_completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(TABLE_USER)
    .update(updateData)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data! as UserData;
}

export async function updateUserEmailNotifications(
  emailNotificationsEnabled: boolean
): Promise<UserData> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from(TABLE_USER)
    .update({ email_notifications_enabled: emailNotificationsEnabled })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data! as UserData;
}

export async function updateUserTourCompleted(
  tourCompleted: boolean
): Promise<UserData> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from(TABLE_USER)
    .update({ tour_completed: tourCompleted })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data! as UserData;
}
