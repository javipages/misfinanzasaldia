import { supabase } from "@/integrations/supabase/client";
import {
  TABLE_INCOME_CATEGORIES,
  TABLE_EXPENSE_CATEGORIES,
  TABLE_ASSET_CATEGORIES,
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
    return existingInvestment;
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
      input.description
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
export async function listInvestmentAccounts(): Promise<AssetCategoryRow[]> {
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
    .select("*")
    .eq("user_id", user.id)
    .in("type", ["inversion", "cripto"])
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data as AssetCategoryRow[]) ?? [];
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
