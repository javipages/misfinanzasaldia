export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

// Category table names (single source of truth)
export const TABLE_INCOME_CATEGORIES = "income_categories";
export const TABLE_EXPENSE_CATEGORIES = "expense_categories";
export const TABLE_ASSET_CATEGORIES = "asset_categories";
export const TABLE_INCOME_VALUES = "income_values";
export const TABLE_EXPENSE_VALUES = "expense_values";
export const TABLE_USER_PREFERENCES = "user_preferences";
