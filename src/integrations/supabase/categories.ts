import { supabase } from "@/integrations/supabase/client";
import {
  TABLE_INCOME_CATEGORIES,
  TABLE_EXPENSE_CATEGORIES,
  TABLE_ASSET_CATEGORIES,
  TABLE_INCOME_SUBCATEGORIES,
  TABLE_EXPENSE_SUBCATEGORIES,
  TABLE_INCOME_CATEGORIES_YEARS,
  TABLE_EXPENSE_CATEGORIES_YEARS,
  TABLE_ASSET_CATEGORIES_YEARS,
  TABLE_INCOME_SUBCATEGORIES_YEARS,
  TABLE_EXPENSE_SUBCATEGORIES_YEARS,
  TABLE_ASSET_VALUES,
  TABLE_INVESTMENTS,
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

export type CategoryYearRow = {
  id: string;
  category_id: string;
  year: number;
  created_at: string;
  updated_at: string;
};

export interface CategoryYearSummary {
  year: number;
}

export type CategoryWithYearRow = CategoryRow & {
  category_year_id: string;
  year: number;
};

export type AssetCategoryWithYearRow = AssetCategoryRow & {
  category_year_id: string;
  year: number;
};

export type SubcategoryInput = {
  category_id: string;
  name: string;
  display_order: number;
};

export type SubcategoryRow = {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type SubcategoryYearRow = {
  id: string;
  subcategory_id: string;
  year: number;
  created_at: string;
  updated_at: string;
};

export type SubcategoryWithYearRow = SubcategoryRow & {
  subcategory_year_id: string;
  year: number;
};

export type CategoryWithSubcategoriesRow = CategoryWithYearRow & {
  subcategories: SubcategoryWithYearRow[];
};

export type CategorySeed = {
  name: string;
  subcategories?: string[];
};

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user?.id) {
    throw new Error("User not authenticated");
  }
  return user.id;
}

async function upsertCategoryYearRow(
  table:
    | typeof TABLE_INCOME_CATEGORIES_YEARS
    | typeof TABLE_EXPENSE_CATEGORIES_YEARS
    | typeof TABLE_ASSET_CATEGORIES_YEARS,
  categoryId: string,
  year: number
): Promise<CategoryYearRow> {
  const { data, error } = await supabase
    .from(table)
    .upsert(
      { category_id: categoryId, year },
      { onConflict: "category_id,year", ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  return data as CategoryYearRow;
}

async function upsertSubcategoryYearRow(
  table:
    | typeof TABLE_INCOME_SUBCATEGORIES_YEARS
    | typeof TABLE_EXPENSE_SUBCATEGORIES_YEARS,
  subcategoryId: string,
  year: number
): Promise<SubcategoryYearRow> {
  const { data, error } = await supabase
    .from(table)
    .upsert(
      { subcategory_id: subcategoryId, year },
      { onConflict: "subcategory_id,year", ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  return data as SubcategoryYearRow;
}

type IncomeCategoryJoinRow = CategoryRow & {
  income_categories_years: CategoryYearRow[];
};

type ExpenseCategoryJoinRow = CategoryRow & {
  expense_categories_years: CategoryYearRow[];
};

type AssetCategoryJoinRow = AssetCategoryRow & {
  asset_categories_years: CategoryYearRow[];
};

type IncomeSubcategoryJoinRow = SubcategoryRow & {
  income_subcategories_years: SubcategoryYearRow[];
};

type ExpenseSubcategoryJoinRow = SubcategoryRow & {
  expense_subcategories_years: SubcategoryYearRow[];
};

export async function listIncomeCategories(
  year: number
): Promise<CategoryWithSubcategoriesRow[]> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_CATEGORIES)
    .select(
      "id,user_id,name,display_order,created_at,updated_at,income_categories_years!inner(id,category_id,year,created_at,updated_at)"
    )
    .eq("income_categories_years.year", year)
    .order("display_order", { ascending: true });
  if (error) throw error;

  const categoryRows = ((data as IncomeCategoryJoinRow[]) ?? []).map(
    ({ income_categories_years, ...category }) => {
      const [yearRow] = income_categories_years ?? [];
      if (!yearRow) {
        throw new Error(
          `Income category ${category.id} missing year association for ${year}`
        );
      }
      return {
        ...category,
        category_year_id: yearRow.id,
        year: yearRow.year,
      } satisfies CategoryWithYearRow;
    }
  );

  const {
    data: subData,
    error: subError,
  } = await supabase
    .from(TABLE_INCOME_SUBCATEGORIES)
    .select(
      "id,user_id,category_id,name,display_order,created_at,updated_at,income_subcategories_years!inner(id,subcategory_id,year,created_at,updated_at)"
    )
    .eq("income_subcategories_years.year", year)
    .order("category_id", { ascending: true })
    .order("display_order", { ascending: true });

  let subRows: IncomeSubcategoryJoinRow[] = [];
  if (subError) {
    const code = subError.code ?? "";
    console.error("Error fetching income subcategories:", subError);
    if (
      code !== "PGRST116" &&
      code !== "42P01" &&
      !subError.message?.includes("does not exist")
    ) {
      throw subError;
    }
  } else {
    subRows = (subData as IncomeSubcategoryJoinRow[]) ?? [];
    console.log(`Fetched ${subRows.length} income subcategories for year ${year}`);
  }

  const subcategoriesByCategory = new Map<string, SubcategoryWithYearRow[]>();

  for (const { income_subcategories_years, ...subcategory } of subRows) {
    const [yearRow] = income_subcategories_years ?? [];
    if (!yearRow) {
      throw new Error(
        `Income subcategory ${subcategory.id} missing year association for ${year}`
      );
    }
    const entry: SubcategoryWithYearRow = {
      ...subcategory,
      subcategory_year_id: yearRow.id,
      year: yearRow.year,
    };
    const bucket = subcategoriesByCategory.get(subcategory.category_id);
    if (bucket) {
      bucket.push(entry);
    } else {
      subcategoriesByCategory.set(subcategory.category_id, [entry]);
    }
  }

  for (const bucket of subcategoriesByCategory.values()) {
    bucket.sort((a, b) => a.display_order - b.display_order);
  }

  return categoryRows.map((category) => ({
    ...category,
    subcategories: subcategoriesByCategory.get(category.id) ?? [],
  }));
}

export async function listExpenseCategories(
  year: number
): Promise<CategoryWithSubcategoriesRow[]> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_CATEGORIES)
    .select(
      "id,user_id,name,display_order,created_at,updated_at,expense_categories_years!inner(id,category_id,year,created_at,updated_at)"
    )
    .eq("expense_categories_years.year", year)
    .order("display_order", { ascending: true });
  if (error) throw error;

  const categoryRows = ((data as ExpenseCategoryJoinRow[]) ?? []).map(
    ({ expense_categories_years, ...category }) => {
      const [yearRow] = expense_categories_years ?? [];
      if (!yearRow) {
        throw new Error(
          `Expense category ${category.id} missing year association for ${year}`
        );
      }
      return {
        ...category,
        category_year_id: yearRow.id,
        year: yearRow.year,
      } satisfies CategoryWithYearRow;
    }
  );

  const {
    data: subData,
    error: subError,
  } = await supabase
    .from(TABLE_EXPENSE_SUBCATEGORIES)
    .select(
      "id,user_id,category_id,name,display_order,created_at,updated_at,expense_subcategories_years!inner(id,subcategory_id,year,created_at,updated_at)"
    )
    .eq("expense_subcategories_years.year", year)
    .order("category_id", { ascending: true })
    .order("display_order", { ascending: true });

  let subRows: ExpenseSubcategoryJoinRow[] = [];
  if (subError) {
    const code = subError.code ?? "";
    console.error("Error fetching expense subcategories:", subError);
    if (
      code !== "PGRST116" &&
      code !== "42P01" &&
      !subError.message?.includes("does not exist")
    ) {
      throw subError;
    }
  } else {
    subRows = (subData as ExpenseSubcategoryJoinRow[]) ?? [];
    console.log(`Fetched ${subRows.length} expense subcategories for year ${year}`);
  }

  const subcategoriesByCategory = new Map<string, SubcategoryWithYearRow[]>();

  for (const { expense_subcategories_years, ...subcategory } of subRows) {
    const [yearRow] = expense_subcategories_years ?? [];
    if (!yearRow) {
      throw new Error(
        `Expense subcategory ${subcategory.id} missing year association for ${year}`
      );
    }
    const entry: SubcategoryWithYearRow = {
      ...subcategory,
      subcategory_year_id: yearRow.id,
      year: yearRow.year,
    };
    const bucket = subcategoriesByCategory.get(subcategory.category_id);
    if (bucket) {
      bucket.push(entry);
    } else {
      subcategoriesByCategory.set(subcategory.category_id, [entry]);
    }
  }

  for (const bucket of subcategoriesByCategory.values()) {
    bucket.sort((a, b) => a.display_order - b.display_order);
  }

  return categoryRows.map((category) => ({
    ...category,
    subcategories: subcategoriesByCategory.get(category.id) ?? [],
  }));
}

export async function createIncomeCategory(
  input: CategoryInput,
  year: number
): Promise<CategoryWithSubcategoriesRow> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_CATEGORIES)
    .insert([{ ...input }])
    .select()
    .single();
  if (error) throw error;
  const base = data as CategoryRow;
  const yearRow = await upsertCategoryYearRow(
    TABLE_INCOME_CATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    category_year_id: yearRow.id,
    year: yearRow.year,
    subcategories: [],
  } satisfies CategoryWithSubcategoriesRow;
}

export async function createExpenseCategory(
  input: CategoryInput,
  year: number
): Promise<CategoryWithSubcategoriesRow> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_CATEGORIES)
    .insert([{ ...input }])
    .select()
    .single();
  if (error) throw error;
  const base = data as CategoryRow;
  const yearRow = await upsertCategoryYearRow(
    TABLE_EXPENSE_CATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    category_year_id: yearRow.id,
    year: yearRow.year,
    subcategories: [],
  } satisfies CategoryWithSubcategoriesRow;
}

export async function updateIncomeCategory(
  id: string,
  input: Partial<CategoryInput>,
  year: number
): Promise<CategoryWithSubcategoriesRow> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_CATEGORIES)
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const base = data as CategoryRow;
  const yearRow = await upsertCategoryYearRow(
    TABLE_INCOME_CATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    category_year_id: yearRow.id,
    year: yearRow.year,
    subcategories: [],
  } satisfies CategoryWithSubcategoriesRow;
}

export async function updateExpenseCategory(
  id: string,
  input: Partial<CategoryInput>,
  year: number
): Promise<CategoryWithSubcategoriesRow> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_CATEGORIES)
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const base = data as CategoryRow;
  const yearRow = await upsertCategoryYearRow(
    TABLE_EXPENSE_CATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    category_year_id: yearRow.id,
    year: yearRow.year,
    subcategories: [],
  } satisfies CategoryWithSubcategoriesRow;
}

export async function createIncomeSubcategory(
  input: SubcategoryInput,
  year: number
): Promise<SubcategoryWithYearRow> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_SUBCATEGORIES)
    .insert([{ ...input }])
    .select()
    .single();
  if (error) throw error;
  const base = data as SubcategoryRow;
  const yearRow = await upsertSubcategoryYearRow(
    TABLE_INCOME_SUBCATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    subcategory_year_id: yearRow.id,
    year: yearRow.year,
  } satisfies SubcategoryWithYearRow;
}

export async function createExpenseSubcategory(
  input: SubcategoryInput,
  year: number
): Promise<SubcategoryWithYearRow> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_SUBCATEGORIES)
    .insert([{ ...input }])
    .select()
    .single();
  if (error) throw error;
  const base = data as SubcategoryRow;
  const yearRow = await upsertSubcategoryYearRow(
    TABLE_EXPENSE_SUBCATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    subcategory_year_id: yearRow.id,
    year: yearRow.year,
  } satisfies SubcategoryWithYearRow;
}

export async function updateIncomeSubcategory(
  id: string,
  input: Partial<Omit<SubcategoryInput, "category_id">>,
  year: number
): Promise<SubcategoryWithYearRow> {
  const { data, error } = await supabase
    .from(TABLE_INCOME_SUBCATEGORIES)
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const base = data as SubcategoryRow;
  const yearRow = await upsertSubcategoryYearRow(
    TABLE_INCOME_SUBCATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    subcategory_year_id: yearRow.id,
    year: yearRow.year,
  } satisfies SubcategoryWithYearRow;
}

export async function updateExpenseSubcategory(
  id: string,
  input: Partial<Omit<SubcategoryInput, "category_id">>,
  year: number
): Promise<SubcategoryWithYearRow> {
  const { data, error } = await supabase
    .from(TABLE_EXPENSE_SUBCATEGORIES)
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const base = data as SubcategoryRow;
  const yearRow = await upsertSubcategoryYearRow(
    TABLE_EXPENSE_SUBCATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    subcategory_year_id: yearRow.id,
    year: yearRow.year,
  } satisfies SubcategoryWithYearRow;
}

export async function deleteIncomeSubcategory(
  id: string,
  year: number
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_INCOME_SUBCATEGORIES_YEARS)
    .delete()
    .eq("subcategory_id", id)
    .eq("year", year);
  if (error) throw error;
}

export async function deleteExpenseSubcategory(
  id: string,
  year: number
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_EXPENSE_SUBCATEGORIES_YEARS)
    .delete()
    .eq("subcategory_id", id)
    .eq("year", year);
  if (error) throw error;
}

export async function ensureIncomeSubcategoryYear(
  subcategoryId: string,
  year: number
): Promise<SubcategoryYearRow> {
  return upsertSubcategoryYearRow(
    TABLE_INCOME_SUBCATEGORIES_YEARS,
    subcategoryId,
    year
  );
}

export async function ensureExpenseSubcategoryYear(
  subcategoryId: string,
  year: number
): Promise<SubcategoryYearRow> {
  return upsertSubcategoryYearRow(
    TABLE_EXPENSE_SUBCATEGORIES_YEARS,
    subcategoryId,
    year
  );
}

export async function deleteIncomeCategory(
  id: string,
  year: number
): Promise<void> {
  const { data: subRows, error: subFetchError } = await supabase
    .from(TABLE_INCOME_SUBCATEGORIES)
    .select("id")
    .eq("category_id", id);
  if (subFetchError) throw subFetchError;

  const { error } = await supabase
    .from(TABLE_INCOME_CATEGORIES_YEARS)
    .delete()
    .eq("category_id", id)
    .eq("year", year);
  if (error) throw error;

  const subIds = (subRows as { id: string }[])?.map((row) => row.id) ?? [];
  if (subIds.length > 0) {
    const { error: subYearError } = await supabase
      .from(TABLE_INCOME_SUBCATEGORIES_YEARS)
      .delete()
      .in("subcategory_id", subIds)
      .eq("year", year);
    if (subYearError) throw subYearError;
  }
}

export async function deleteExpenseCategory(
  id: string,
  year: number
): Promise<void> {
  const { data: subRows, error: subFetchError } = await supabase
    .from(TABLE_EXPENSE_SUBCATEGORIES)
    .select("id")
    .eq("category_id", id);
  if (subFetchError) throw subFetchError;

  const { error } = await supabase
    .from(TABLE_EXPENSE_CATEGORIES_YEARS)
    .delete()
    .eq("category_id", id)
    .eq("year", year);
  if (error) throw error;

  const subIds = (subRows as { id: string }[])?.map((row) => row.id) ?? [];
  if (subIds.length > 0) {
    const { error: subYearError } = await supabase
      .from(TABLE_EXPENSE_SUBCATEGORIES_YEARS)
      .delete()
      .in("subcategory_id", subIds)
      .eq("year", year);
    if (subYearError) throw subYearError;
  }
}

export async function ensureIncomeCategoryYear(
  categoryId: string,
  year: number
): Promise<CategoryYearRow> {
  return upsertCategoryYearRow(
    TABLE_INCOME_CATEGORIES_YEARS,
    categoryId,
    year
  );
}

export async function ensureExpenseCategoryYear(
  categoryId: string,
  year: number
): Promise<CategoryYearRow> {
  return upsertCategoryYearRow(
    TABLE_EXPENSE_CATEGORIES_YEARS,
    categoryId,
    year
  );
}

export async function ensureAssetCategoryYear(
  categoryId: string,
  year: number
): Promise<CategoryYearRow> {
  return upsertCategoryYearRow(
    TABLE_ASSET_CATEGORIES_YEARS,
    categoryId,
    year
  );
}

export async function listAvailableCategoryYears(): Promise<CategoryYearSummary[]> {
  const userId = await requireUserId();

  const [expenseRes, incomeRes, assetRes] = await Promise.all([
    supabase
      .from(TABLE_EXPENSE_CATEGORIES_YEARS)
      .select("year, expense_categories!inner(user_id)")
      .eq("expense_categories.user_id", userId),
    supabase
      .from(TABLE_INCOME_CATEGORIES_YEARS)
      .select("year, income_categories!inner(user_id)")
      .eq("income_categories.user_id", userId),
    supabase
      .from(TABLE_ASSET_CATEGORIES_YEARS)
      .select("year, asset_categories!inner(user_id)")
      .eq("asset_categories.user_id", userId),
  ]);

  if (expenseRes.error) throw expenseRes.error;
  if (incomeRes.error) throw incomeRes.error;
  if (assetRes.error) throw assetRes.error;

  const yearsSet = new Set<number>();
  for (const rows of [expenseRes.data, incomeRes.data, assetRes.data]) {
    for (const row of rows ?? []) {
      const year = (row as { year?: number | null }).year;
      if (typeof year === "number") yearsSet.add(year);
    }
  }

  if (yearsSet.size === 0) {
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
  }

  return Array.from(yearsSet)
    .sort((a, b) => a - b)
    .map((year) => ({ year }));
}

export async function ensureCategoriesForYear(year: number): Promise<void> {
  const userId = await requireUserId();

  const [incomeRes, expenseRes, assetRes, incomeSubRes, expenseSubRes] =
    await Promise.all([
      supabase
        .from(TABLE_INCOME_CATEGORIES)
        .select("id")
        .eq("user_id", userId),
      supabase
        .from(TABLE_EXPENSE_CATEGORIES)
        .select("id")
        .eq("user_id", userId),
      supabase
        .from(TABLE_ASSET_CATEGORIES)
        .select("id")
        .eq("user_id", userId),
      supabase
        .from(TABLE_INCOME_SUBCATEGORIES)
        .select("id")
        .eq("user_id", userId),
      supabase
        .from(TABLE_EXPENSE_SUBCATEGORIES)
        .select("id")
        .eq("user_id", userId),
    ]);

  if (incomeRes.error) throw incomeRes.error;
  if (expenseRes.error) throw expenseRes.error;
  if (assetRes.error) throw assetRes.error;
  if (incomeSubRes.error) throw incomeSubRes.error;
  if (expenseSubRes.error) throw expenseSubRes.error;

  const promises: Promise<unknown>[] = [];

  for (const row of incomeRes.data ?? []) {
    const categoryId = (row as { id?: string }).id;
    if (categoryId) {
      promises.push(ensureIncomeCategoryYear(categoryId, year));
    }
  }

  for (const row of expenseRes.data ?? []) {
    const categoryId = (row as { id?: string }).id;
    if (categoryId) {
      promises.push(ensureExpenseCategoryYear(categoryId, year));
    }
  }

  for (const row of assetRes.data ?? []) {
    const categoryId = (row as { id?: string }).id;
    if (categoryId) {
      promises.push(ensureAssetCategoryYear(categoryId, year));
    }
  }

  for (const row of incomeSubRes.data ?? []) {
    const subcategoryId = (row as { id?: string }).id;
    if (subcategoryId) {
      promises.push(ensureIncomeSubcategoryYear(subcategoryId, year));
    }
  }

  for (const row of expenseSubRes.data ?? []) {
    const subcategoryId = (row as { id?: string }).id;
    if (subcategoryId) {
      promises.push(ensureExpenseSubcategoryYear(subcategoryId, year));
    }
  }

  await Promise.all(promises);
}

export async function cloneCategoriesFromYear(
  targetYear: number,
  sourceYear: number
): Promise<void> {
  const userId = await requireUserId();

  const [incomeRes, expenseRes, assetRes, incomeSubRes, expenseSubRes] =
    await Promise.all([
      supabase
        .from(TABLE_INCOME_CATEGORIES_YEARS)
        .select("category_id, income_categories!inner(user_id)")
        .eq("income_categories.user_id", userId)
        .eq("year", sourceYear),
    supabase
      .from(TABLE_EXPENSE_CATEGORIES_YEARS)
      .select("category_id, expense_categories!inner(user_id)")
      .eq("expense_categories.user_id", userId)
      .eq("year", sourceYear),
      supabase
        .from(TABLE_ASSET_CATEGORIES_YEARS)
        .select("category_id, asset_categories!inner(user_id)")
        .eq("asset_categories.user_id", userId)
        .eq("year", sourceYear),
      supabase
        .from(TABLE_INCOME_SUBCATEGORIES_YEARS)
        .select("subcategory_id, income_subcategories!inner(user_id)")
        .eq("income_subcategories.user_id", userId)
        .eq("year", sourceYear),
      supabase
        .from(TABLE_EXPENSE_SUBCATEGORIES_YEARS)
        .select("subcategory_id, expense_subcategories!inner(user_id)")
        .eq("expense_subcategories.user_id", userId)
        .eq("year", sourceYear),
    ]);

  if (incomeRes.error) throw incomeRes.error;
  if (expenseRes.error) throw expenseRes.error;
  if (assetRes.error) throw assetRes.error;
  if (incomeSubRes.error) throw incomeSubRes.error;
  if (expenseSubRes.error) throw expenseSubRes.error;

  const promises: Promise<unknown>[] = [];

  for (const row of incomeRes.data ?? []) {
    const categoryId = (row as { category_id?: string }).category_id;
    if (categoryId) {
      promises.push(ensureIncomeCategoryYear(categoryId, targetYear));
    }
  }

  for (const row of expenseRes.data ?? []) {
    const categoryId = (row as { category_id?: string }).category_id;
    if (categoryId) {
      promises.push(ensureExpenseCategoryYear(categoryId, targetYear));
    }
  }

  for (const row of assetRes.data ?? []) {
    const categoryId = (row as { category_id?: string }).category_id;
    if (categoryId) {
      promises.push(ensureAssetCategoryYear(categoryId, targetYear));
    }
  }

  for (const row of incomeSubRes.data ?? []) {
    const subcategoryId = (row as { subcategory_id?: string }).subcategory_id;
    if (subcategoryId) {
      promises.push(ensureIncomeSubcategoryYear(subcategoryId, targetYear));
    }
  }

  for (const row of expenseSubRes.data ?? []) {
    const subcategoryId = (row as { subcategory_id?: string }).subcategory_id;
    if (subcategoryId) {
      promises.push(ensureExpenseSubcategoryYear(subcategoryId, targetYear));
    }
  }

  await Promise.all(promises);
}

export async function createFreshYear(
  year: number,
  initialCategory: { name: string; type: "income" | "expense" | "asset" }
): Promise<void> {
  // Create one category with the user-provided name and type to ensure the year exists
  if (initialCategory.type === "income") {
    await createIncomeCategory(
      { name: initialCategory.name, display_order: 0 },
      year
    );
  } else if (initialCategory.type === "expense") {
    await createExpenseCategory(
      { name: initialCategory.name, display_order: 0 },
      year
    );
  } else {
    await createAssetCategory(
      { name: initialCategory.name, type: "efectivo", display_order: 0 },
      year
    );
  }
}

// Bulk operations for onboarding
export async function bulkCreateIncomeCategories(
  categorySeeds: (CategorySeed | string)[],
  year: number
): Promise<CategoryWithSubcategoriesRow[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("User not authenticated");

  // Get existing categories to determine display_order
  const existingCategories = await listIncomeCategories(year);
  const maxOrder = Math.max(
    ...existingCategories.map((c) => c.display_order),
    0
  );

  const normalizedSeeds = categorySeeds.map((seed) =>
    typeof seed === "string" ? { name: seed, subcategories: [] } : seed
  );

  const categoriesToInsert = normalizedSeeds.map((seed, index) => ({
    name: seed.name,
    display_order: maxOrder + index + 1,
  }));

  const { data, error } = await supabase
    .from(TABLE_INCOME_CATEGORIES)
    .insert(categoriesToInsert)
    .select();

  if (error) throw error;
  const rows = (data as CategoryRow[]) ?? [];
  const yearRows = await Promise.all(
    rows.map((row) =>
      upsertCategoryYearRow(TABLE_INCOME_CATEGORIES_YEARS, row.id, year)
    )
  );

  const subcategoryPayload: SubcategoryInput[] = [];
  rows.forEach((row, index) => {
    const seed = normalizedSeeds[index];
    if (!seed?.subcategories?.length) return;
    seed.subcategories.forEach((name, subIndex) => {
      subcategoryPayload.push({
        category_id: row.id,
        name,
        display_order: subIndex + 1,
      });
    });
  });

  let subcategoryRows: SubcategoryRow[] = [];
  if (subcategoryPayload.length > 0) {
    const { data: subData, error: subError } = await supabase
      .from(TABLE_INCOME_SUBCATEGORIES)
      .insert(subcategoryPayload)
      .select();
    if (subError) throw subError;
    subcategoryRows = (subData as SubcategoryRow[]) ?? [];
  }

  const subYearRows = await Promise.all(
    subcategoryRows.map((row) =>
      upsertSubcategoryYearRow(TABLE_INCOME_SUBCATEGORIES_YEARS, row.id, year)
    )
  );

  const subcategoriesByCategory = new Map<string, SubcategoryWithYearRow[]>();
  subcategoryRows.forEach((row, idx) => {
    const entry: SubcategoryWithYearRow = {
      ...row,
      subcategory_year_id: subYearRows[idx].id,
      year: subYearRows[idx].year,
    };
    const list = subcategoriesByCategory.get(row.category_id);
    if (list) {
      list.push(entry);
    } else {
      subcategoriesByCategory.set(row.category_id, [entry]);
    }
  });

  for (const list of subcategoriesByCategory.values()) {
    list.sort((a, b) => a.display_order - b.display_order);
  }

  return rows.map((row, index) => ({
    ...row,
    category_year_id: yearRows[index].id,
    year: yearRows[index].year,
    subcategories: subcategoriesByCategory.get(row.id) ?? [],
  } satisfies CategoryWithSubcategoriesRow));
}

export async function bulkCreateExpenseCategories(
  categorySeeds: (CategorySeed | string)[],
  year: number
): Promise<CategoryWithSubcategoriesRow[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("User not authenticated");

  // Get existing categories to determine display_order
  const existingCategories = await listExpenseCategories(year);
  const maxOrder = Math.max(
    ...existingCategories.map((c) => c.display_order),
    0
  );

  const normalizedSeeds = categorySeeds.map((seed) =>
    typeof seed === "string" ? { name: seed, subcategories: [] } : seed
  );

  const categoriesToInsert = normalizedSeeds.map((seed, index) => ({
    name: seed.name,
    display_order: maxOrder + index + 1,
  }));

  const { data, error } = await supabase
    .from(TABLE_EXPENSE_CATEGORIES)
    .insert(categoriesToInsert)
    .select();

  if (error) throw error;
  const rows = (data as CategoryRow[]) ?? [];
  const yearRows = await Promise.all(
    rows.map((row) =>
      upsertCategoryYearRow(TABLE_EXPENSE_CATEGORIES_YEARS, row.id, year)
    )
  );

  const subcategoryPayload: SubcategoryInput[] = [];
  rows.forEach((row, index) => {
    const seed = normalizedSeeds[index];
    if (!seed?.subcategories?.length) return;
    seed.subcategories.forEach((name, subIndex) => {
      subcategoryPayload.push({
        category_id: row.id,
        name,
        display_order: subIndex + 1,
      });
    });
  });

  let subcategoryRows: SubcategoryRow[] = [];
  if (subcategoryPayload.length > 0) {
    const { data: subData, error: subError } = await supabase
      .from(TABLE_EXPENSE_SUBCATEGORIES)
      .insert(subcategoryPayload)
      .select();
    if (subError) throw subError;
    subcategoryRows = (subData as SubcategoryRow[]) ?? [];
  }

  const subYearRows = await Promise.all(
    subcategoryRows.map((row) =>
      upsertSubcategoryYearRow(TABLE_EXPENSE_SUBCATEGORIES_YEARS, row.id, year)
    )
  );

  const subcategoriesByCategory = new Map<string, SubcategoryWithYearRow[]>();
  subcategoryRows.forEach((row, idx) => {
    const entry: SubcategoryWithYearRow = {
      ...row,
      subcategory_year_id: subYearRows[idx].id,
      year: subYearRows[idx].year,
    };
    const list = subcategoriesByCategory.get(row.category_id);
    if (list) {
      list.push(entry);
    } else {
      subcategoriesByCategory.set(row.category_id, [entry]);
    }
  });

  for (const list of subcategoriesByCategory.values()) {
    list.sort((a, b) => a.display_order - b.display_order);
  }

  return rows.map((row, index) => ({
    ...row,
    category_year_id: yearRows[index].id,
    year: yearRows[index].year,
    subcategories: subcategoriesByCategory.get(row.id) ?? [],
  } satisfies CategoryWithSubcategoriesRow));
}

export async function bulkCreateAssetCategories(
  categoryNames: string[],
  year: number
): Promise<AssetCategoryWithYearRow[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("User not authenticated");

  // Get existing categories to determine display_order
  const existingCategories = await listAssetCategories(year);
  const maxOrder = Math.max(
    ...existingCategories.map((c) => c.display_order),
    0
  );

  const categoriesToInsert = categoryNames.map((name, index) => ({
    name,
    type: "otro" as const, // Default type for onboarding categories
    display_order: maxOrder + index + 1,
  }));

  const { data, error } = await supabase
    .from(TABLE_ASSET_CATEGORIES)
    .insert(categoriesToInsert)
    .select();

  if (error) throw error;
  const rows = (data as AssetCategoryRow[]) ?? [];
  const yearRows = await Promise.all(
    rows.map((row) =>
      upsertCategoryYearRow(TABLE_ASSET_CATEGORIES_YEARS, row.id, year)
    )
  );

  return rows.map((row, index) => ({
    ...row,
    category_year_id: yearRows[index].id,
    year: yearRows[index].year,
  } satisfies AssetCategoryWithYearRow));
}

// Entry-based API
export type EntryRow = {
  id: string;
  user_id: string;
  category_id: string;
  subcategory_id: string | null;
  year: number;
  month: number;
  amount: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type EntryInsert = {
  category_id: string;
  subcategory_id?: string | null;
  year: number;
  month: number;
  amount: number;
  description?: string | null;
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
export async function listAssetCategories(
  year: number
): Promise<AssetCategoryWithYearRow[]> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_CATEGORIES)
    .select(
      "id,user_id,name,type,display_order,created_at,updated_at,asset_categories_years!inner(id,category_id,year,created_at,updated_at)"
    )
    .eq("asset_categories_years.year", year)
    .order("display_order", { ascending: true });
  if (error) throw error;

  const rows = (data as AssetCategoryJoinRow[]) ?? [];
  return rows.map(({ asset_categories_years, ...category }) => {
    const [yearRow] = asset_categories_years ?? [];
    if (!yearRow) {
      throw new Error(
        `Asset category ${category.id} missing year association for ${year}`
      );
    }
    return {
      ...category,
      category_year_id: yearRow.id,
      year: yearRow.year,
    } satisfies AssetCategoryWithYearRow;
  });
}

export async function createAssetCategory(
  input: AssetCategoryInput,
  year: number
): Promise<AssetCategoryWithYearRow> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_CATEGORIES)
    .insert([{ ...input }])
    .select()
    .single();
  if (error) throw error;
  const base = data as AssetCategoryRow;
  const yearRow = await upsertCategoryYearRow(
    TABLE_ASSET_CATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    category_year_id: yearRow.id,
    year: yearRow.year,
  } satisfies AssetCategoryWithYearRow;
}

export async function updateAssetCategory(
  id: string,
  input: Partial<Pick<AssetCategoryInput, "name" | "type" | "display_order">>,
  year: number
): Promise<AssetCategoryWithYearRow> {
  const { data, error } = await supabase
    .from(TABLE_ASSET_CATEGORIES)
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const base = data as AssetCategoryRow;
  const yearRow = await upsertCategoryYearRow(
    TABLE_ASSET_CATEGORIES_YEARS,
    base.id,
    year
  );
  return {
    ...base,
    category_year_id: yearRow.id,
    year: yearRow.year,
  } satisfies AssetCategoryWithYearRow;
}

export async function deleteAssetCategory(
  id: string,
  year: number
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_ASSET_CATEGORIES_YEARS)
    .delete()
    .eq("category_id", id)
    .eq("year", year);
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

export async function createIncomeEntry(entry: EntryInsert): Promise<EntryRow> {
  const { data, error } = await supabase
    .from("income_entries")
    .insert([
      {
        ...entry,
        subcategory_id: entry.subcategory_id ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data as EntryRow;
}

export async function createExpenseEntry(entry: EntryInsert): Promise<EntryRow> {
  const { data, error } = await supabase
    .from("expense_entries")
    .insert([
      {
        ...entry,
        subcategory_id: entry.subcategory_id ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data as EntryRow;
}

export async function updateIncomeEntry(
  id: string,
  patch: Partial<
    Pick<
      EntryRow,
      "amount" | "description" | "month" | "category_id" | "subcategory_id" | "year"
    >
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
    Pick<
      EntryRow,
      "amount" | "description" | "month" | "category_id" | "subcategory_id" | "year"
    >
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

// Goals API
export type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_type: string | null;
  deadline: string | null;
  category: string | null;
  created_at: string | null;
  updated_at: string | null;
  year: number | null;
  repeat_yearly: boolean;
};

export type GoalInput = Omit<
  GoalRow,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export async function listGoalsForYear(year: number): Promise<GoalRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .or(`repeat_yearly.eq.true,year.eq.${year}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as GoalRow[]) ?? [];
}

export async function createGoalRow(input: GoalInput): Promise<GoalRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("goals")
    .insert([{ ...input, user_id: user.id }])
    .select()
    .single();
  if (error) throw error;
  return data as GoalRow;
}

export async function updateGoalRow(
  id: string,
  patch: Partial<GoalInput>
): Promise<GoalRow> {
  const { data, error } = await supabase
    .from("goals")
    .update({ ...patch })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as GoalRow;
}

export async function deleteGoalRow(id: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

// Investments API
export type InvestmentInput = {
  name: string;
  type: "etf" | "acciones" | "crypto" | "fondos" | "bonos" | "otros";
  initial_amount: number;
  account_id: string; // Reference to investment account
  purchase_date: string; // ISO date string
  description?: string | null;
  display_order: number;
};

export type InvestmentRow = {
  id: string;
  user_id: string;
  name: string;
  type: InvestmentInput["type"];
  initial_amount: number;
  account_id: string;
  purchase_date: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export async function listInvestments(): Promise<InvestmentWithAccount[]> {
  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Get investments with account information
  const { data: investmentsData, error: investmentsError } = await supabase
    .from(TABLE_INVESTMENTS)
    .select(
      `
      *,
      asset_categories:account_id(id,name)
    `
    )
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  if (investmentsError) throw investmentsError;

  // Process investments to calculate gains/losses
  const processedInvestments: InvestmentWithAccount[] = [];

  for (const investment of (investmentsData ||
    []) as unknown as InvestmentWithAccount[]) {
    // Get the latest account value available for this category
    const { data: accountValueData, error: accountValueError } = await supabase
      .from(TABLE_ASSET_VALUES)
      .select("amount, year, month")
      .eq("category_id", investment.account_id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accountValueError) throw accountValueError;

    const currentAccountValue = accountValueData?.amount || 0;

    // Get total invested amount by summing all investment_values for this investment
    const totalInvested = await getTotalInvestmentAmount(investment.id);

    const profitLoss = currentAccountValue - totalInvested;
    const profitLossPercentage =
      totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    processedInvestments.push({
      ...investment,
      account_name: investment.asset_categories?.name || "Cuenta desconocida",
      current_account_value: currentAccountValue,
      profit_loss: profitLoss,
      profit_loss_percentage: profitLossPercentage,
      total_invested_amount: totalInvested, // Add this for easier access
    });
  }

  return processedInvestments;
}

export async function createOrUpdateInvestment(
  input: InvestmentInput
): Promise<InvestmentRow> {
  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // First check if there's already an investment with the same name and account
  const { data: existingInvestment, error: searchError } = await supabase
    .from(TABLE_INVESTMENTS)
    .select("*")
    .eq("user_id", user.id)
    .eq("name", input.name)
    .eq("account_id", input.account_id)
    .maybeSingle();

  if (searchError) throw searchError;

  if (existingInvestment) {
    // Add a new contribution to the existing investment
    await createInvestmentValue(
      existingInvestment.id,
      input.initial_amount,
      input.purchase_date,
      input.description ?? undefined
    );

    // Return the existing investment (no need to modify it)
    return existingInvestment as unknown as InvestmentRow;
  } else {
    // Create new investment
    const { data, error } = await supabase
      .from(TABLE_INVESTMENTS)
      .insert([
        {
          ...input,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Create the initial investment value
    await createInvestmentValue(
      data.id,
      input.initial_amount,
      input.purchase_date,
      input.description ?? undefined
    );

    return data as unknown as InvestmentRow;
  }
}

export async function createInvestment(
  input: InvestmentInput
): Promise<InvestmentRow> {
  // Keep the old function for backward compatibility, but use the new logic
  return createOrUpdateInvestment(input);
}

export async function updateInvestment(
  id: string,
  input: Partial<
    Pick<
      InvestmentRow,
      | "name"
      | "type"
      | "initial_amount"
      | "account_id"
      | "purchase_date"
      | "description"
      | "display_order"
    >
  >
): Promise<InvestmentRow> {
  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from(TABLE_INVESTMENTS)
    .update({ ...input })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as InvestmentRow;
}

export async function deleteInvestment(id: string): Promise<void> {
  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from(TABLE_INVESTMENTS)
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

// Get investment accounts (asset_categories with type = 'inversion' or 'cripto')
export async function listInvestmentAccounts(
  year: number
): Promise<AssetCategoryWithYearRow[]> {
  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from(TABLE_ASSET_CATEGORIES)
    .select(
      "id,user_id,name,type,display_order,created_at,updated_at,asset_categories_years!inner(id,category_id,year,created_at,updated_at)"
    )
    .eq("user_id", user.id)
    .eq("asset_categories_years.year", year)
    .in("type", ["inversion", "cripto"])
    .order("display_order", { ascending: true });
  if (error) throw error;
  const rows = (data as AssetCategoryJoinRow[]) ?? [];
  return rows.map(({ asset_categories_years, ...category }) => {
    const [yearRow] = asset_categories_years ?? [];
    if (!yearRow) {
      throw new Error(
        `Investment account ${category.id} missing year association for ${year}`
      );
    }
    return {
      ...category,
      category_year_id: yearRow.id,
      year: yearRow.year,
    } satisfies AssetCategoryWithYearRow;
  });
}

// Extended investment type with account information
export type InvestmentWithAccount = InvestmentRow & {
  asset_categories: AssetCategoryRow;
  account_name: string;
  current_account_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
  total_invested_amount: number; // Calculated from investment_values
};

// Helper function to get the amount to use for calculations
// Note: Now we use getTotalInvestmentAmount() to get the sum of all contributions
export function getInvestmentAmount(investment: InvestmentRow): number {
  return investment.initial_amount; // This is the initial investment amount
}

// Functions for managing investment values
export async function createInvestmentValue(
  investmentId: string,
  amount: number,
  contributionDate?: string,
  description?: string
): Promise<InvestmentValueRow> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // First verify that the investment belongs to the user
  const { data: investment, error: investmentError } = await supabase
    .from(TABLE_INVESTMENTS)
    .select("user_id")
    .eq("id", investmentId)
    .eq("user_id", user.id)
    .single();

  if (investmentError || !investment) {
    throw new Error("Investment not found or access denied");
  }

  const { data, error } = await supabase
    .from("investment_values")
    .insert([
      {
        investment_id: investmentId,
        user_id: user.id,
        amount,
        contribution_date:
          contributionDate || new Date().toISOString().split("T")[0],
        description,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as InvestmentValueRow;
}

export async function listInvestmentValues(
  investmentId: string
): Promise<InvestmentValueRow[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // First verify that the investment belongs to the user
  const { data: investment, error: investmentError } = await supabase
    .from(TABLE_INVESTMENTS)
    .select("user_id")
    .eq("id", investmentId)
    .eq("user_id", user.id)
    .single();

  if (investmentError || !investment) {
    throw new Error("Investment not found or access denied");
  }

  const { data, error } = await supabase
    .from("investment_values")
    .select("*")
    .eq("investment_id", investmentId)
    .order("contribution_date", { ascending: true });

  if (error) throw error;
  return (data as InvestmentValueRow[]) ?? [];
}

export async function getTotalInvestmentAmount(
  investmentId: string
): Promise<number> {
  // This function already calls listInvestmentValues which verifies access
  const values = await listInvestmentValues(investmentId);
  return values.reduce((sum, value) => sum + value.amount, 0);
}

// Investment values for contributions
export type InvestmentValueRow = {
  id: string;
  user_id: string;
  investment_id: string;
  amount: number;
  contribution_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

// Investment summary by year and month
export type InvestmentSummaryByMonth = {
  year: number;
  month: number;
  total_invested: number;
  investment_count: number;
  month_name: string;
};

export async function getInvestmentSummaryByMonth(): Promise<
  InvestmentSummaryByMonth[]
> {
  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Get current year
  const currentYear = new Date().getFullYear();
  console.log(`Getting investment contributions for year ${currentYear}`);

  // Get all investment values (contributions) for the current year
  const { data, error } = await supabase
    .from("investment_values")
    .select("amount, contribution_date")
    .eq("user_id", user.id)
    .gte("contribution_date", `${currentYear}-01-01`)
    .lte("contribution_date", `${currentYear}-12-31`)
    .order("contribution_date", { ascending: true });

  if (error) throw error;

  console.log(
    `Found ${data?.length || 0} investment contributions for user ${
      user.id
    } in ${currentYear}`
  );

  // Group contributions by year and month
  const monthlySummary = new Map<string, { total: number; count: number }>();

  for (const contribution of data || []) {
    const date = new Date(contribution.contribution_date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    const key = `${year}-${month}`;

    if (monthlySummary.has(key)) {
      monthlySummary.get(key)!.total += contribution.amount;
      monthlySummary.get(key)!.count += 1;
    } else {
      monthlySummary.set(key, {
        total: contribution.amount,
        count: 1,
      });
    }
  }

  console.log(`Grouped into ${monthlySummary.size} months for ${currentYear}`);

  // Convert to array and sort by date
  const result: InvestmentSummaryByMonth[] = Array.from(
    monthlySummary.entries()
  ).map(([key, value]) => {
    const [year, month] = key.split("-").map(Number);
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    return {
      year,
      month,
      total_invested: value.total,
      investment_count: value.count,
      month_name: monthNames[month - 1], // -1 because months are 0-based in array
    };
  });

  const sortedResult = result.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  console.log("Monthly investment summary:", sortedResult);
  return sortedResult;
}
