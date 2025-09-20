import { supabase } from "@/integrations/supabase/client";
import {
  TABLE_INCOME_CATEGORIES,
  TABLE_EXPENSE_CATEGORIES,
  TABLE_INCOME_VALUES,
  TABLE_EXPENSE_VALUES,
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

export type ValueRow = {
  id: string;
  user_id: string;
  category_id: string;
  year: number;
  month: number; // 1-12
  amount: number;
  created_at: string;
  updated_at: string;
};

export async function listIncomeValues(year: number): Promise<ValueRow[]> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_VALUES)
    .select("*")
    .eq("year", year);
  if (error) throw error;
  return data ?? [];
}

export async function listExpenseValues(year: number): Promise<ValueRow[]> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_VALUES)
    .select("*")
    .eq("year", year);
  if (error) throw error;
  return data ?? [];
}

export async function upsertIncomeValue(
  categoryId: string,
  year: number,
  month: number,
  amount: number
): Promise<ValueRow> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_VALUES)
    .upsert(
      [
        {
          category_id: categoryId,
          year,
          month,
          amount,
        },
      ],
      { onConflict: "user_id,category_id,year,month" }
    )
    .select()
    .single();
  if (error) throw error;
  return data!;
}

export async function upsertExpenseValue(
  categoryId: string,
  year: number,
  month: number,
  amount: number
): Promise<ValueRow> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_VALUES)
    .upsert(
      [
        {
          category_id: categoryId,
          year,
          month,
          amount,
        },
      ],
      { onConflict: "user_id,category_id,year,month" }
    )
    .select()
    .single();
  if (error) throw error;
  return data!;
}
