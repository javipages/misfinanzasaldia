import { supabase } from "@/integrations/supabase/client";
import {
  TABLE_INCOME_CATEGORIES,
  TABLE_EXPENSE_CATEGORIES,
  TABLE_ASSET_CATEGORIES,
  TABLE_ASSET_VALUES,
} from "@/config/api";

export type CategoryInput = {
  name: string;
  display_order: number;
};

export type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type AssetCategoryInput = {
  name: string;
  type: "cuenta_bancaria" | "inversion" | "efectivo" | "cripto" | "otro";
  display_order: number;
};

export type AssetCategoryRow = CategoryRow & {
  type: AssetCategoryInput["type"];
};

export async function listIncomeCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_CATEGORIES)
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listExpenseCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_CATEGORIES)
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createIncomeCategory(
  input: CategoryInput
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_CATEGORIES)
    .insert([{ ...input }])
    .select()
    .single();
  if (error) throw error;
  return data!;
}

export async function createExpenseCategory(
  input: CategoryInput
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_CATEGORIES)
    .insert([{ ...input }])
    .select()
    .single();
  if (error) throw error;
  return data!;
}

export async function updateIncomeCategory(
  id: string,
  input: Partial<CategoryInput>
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_CATEGORIES)
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data!;
}

export async function updateExpenseCategory(
  id: string,
  input: Partial<CategoryInput>
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_CATEGORIES)
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data!;
}

export async function deleteIncomeCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_INCOME_CATEGORIES)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_EXPENSE_CATEGORIES)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Entry-based API
export type EntryRow = {
  id: string;
  user_id: string;
  category_id: string;
  year: number;
  month: number;
  amount: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export async function listIncomeEntries(year: number): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from("income_entries")
    .select("*")
    .eq("year", year);
  if (error) throw error;
  return (data as EntryRow[]) ?? [];
}

// Asset categories API
export async function listAssetCategories(): Promise<AssetCategoryRow[]> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_CATEGORIES)
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data as AssetCategoryRow[]) ?? [];
}

export async function createAssetCategory(
  input: AssetCategoryInput
): Promise<AssetCategoryRow> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_CATEGORIES)
    .insert([{ ...input }])
    .select()
    .single();
  if (error) throw error;
  return data as AssetCategoryRow;
}

export async function updateAssetCategory(
  id: string,
  input: Partial<Pick<AssetCategoryInput, "name" | "type" | "display_order">>
): Promise<AssetCategoryRow> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_CATEGORIES)
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AssetCategoryRow;
}

export async function deleteAssetCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_ASSET_CATEGORIES)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function listExpenseEntries(year: number): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from("expense_entries")
    .select("*")
    .eq("year", year);
  if (error) throw error;
  return (data as EntryRow[]) ?? [];
}

export async function createIncomeEntry(
  entry: Omit<EntryRow, "id" | "user_id" | "created_at" | "updated_at">
): Promise<EntryRow> {
  const { data, error } = await supabase
    .from("income_entries")
    .insert([entry])
    .select()
    .single();
  if (error) throw error;
  return data as EntryRow;
}

export async function createExpenseEntry(
  entry: Omit<EntryRow, "id" | "user_id" | "created_at" | "updated_at">
): Promise<EntryRow> {
  const { data, error } = await supabase
    .from("expense_entries")
    .insert([entry])
    .select()
    .single();
  if (error) throw error;
  return data as EntryRow;
}

export async function updateIncomeEntry(
  id: string,
  patch: Partial<
    Pick<EntryRow, "amount" | "description" | "month" | "category_id" | "year">
  >
): Promise<EntryRow> {
  const { data, error } = await supabase
    .from("income_entries")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as EntryRow;
}

export async function updateExpenseEntry(
  id: string,
  patch: Partial<
    Pick<EntryRow, "amount" | "description" | "month" | "category_id" | "year">
  >
): Promise<EntryRow> {
  const { data, error } = await supabase
    .from("expense_entries")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as EntryRow;
}

export async function deleteIncomeEntry(id: string): Promise<void> {
  const { error } = await supabase.from("income_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteExpenseEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("expense_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Asset values API
export type AssetValueRow = {
  id: string;
  user_id: string;
  category_id: string;
  year: number;
  month: number;
  amount: number;
  created_at: string;
  updated_at: string;
};

export async function listAssetValues(year: number): Promise<AssetValueRow[]> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_VALUES)
    .select("*")
    .eq("year", year);
  if (error) throw error;
  return (data as AssetValueRow[]) ?? [];
}

export async function createAssetValue(
  input: Omit<AssetValueRow, "id" | "user_id" | "created_at" | "updated_at">
): Promise<AssetValueRow> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_VALUES)
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return data as AssetValueRow;
}

export async function updateAssetValue(
  id: string,
  patch: Partial<
    Pick<AssetValueRow, "amount" | "month" | "year" | "category_id">
  >
): Promise<AssetValueRow> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_VALUES)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AssetValueRow;
}

export async function upsertAssetValue(
  categoryId: string,
  year: number,
  month: number,
  amount: number
): Promise<AssetValueRow> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_VALUES)
    .upsert(
      {
        category_id: categoryId,
        year,
        month,
        amount,
      },
      {
        onConflict: "user_id,category_id,year,month",
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();
  if (error) throw error;
  return data as AssetValueRow;
}
