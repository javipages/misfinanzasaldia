import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "@/store/user";
import {
  listIncomeEntries,
  listExpenseEntries,
  listExpenseCategories,
  listIncomeCategories,
} from "@/integrations/supabase/categories";
import { useAssets } from "@/hooks/use-assets";
import { useIsMobile } from "@/hooks/use-mobile";

export interface MonthlyData {
  month: string;
  ingresos: number;
  gastos: number;
  ahorro: number;
  patrimonio?: number | null;
  patrimonioPrediccion?: number;
}

export interface DashboardData {
  monthlyData: MonthlyData[];
  expenseCategories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  incomeCategories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  totalIngresos: number;
  totalGastos: number;
  totalAhorro: number;
  currentPatrimony: number;
  isLoading: boolean;
}

const getMonthLabels = (isMobile: boolean) => [
  isMobile ? "E" : "Ene",
  isMobile ? "F" : "Feb",
  isMobile ? "M" : "Mar",
  isMobile ? "A" : "Abr",
  isMobile ? "M" : "May",
  isMobile ? "J" : "Jun",
  isMobile ? "Jl" : "Jul",
  isMobile ? "A" : "Ago",
  isMobile ? "S" : "Sep",
  isMobile ? "O" : "Oct",
  isMobile ? "N" : "Nov",
  isMobile ? "D" : "Dic",
];

const EXPENSE_COLORS = [
  "#7f1d1d",
  "#991b1b",
  "#b91c1c",
  "#dc2626",
  "#ef4444",
  "#f87171",
  "#fb7185",
  "#fda4af",
];

const INCOME_COLORS = [
  "#15803d",
  "#16a34a",
  "#22c55e",
  "#4ade80",
  "#86efac",
  "#bbf7d0",
];

export function useDashboardData(selectedMonth?: number) {
  const year = useUserStore((s) => s.year);
  const isMobile = useIsMobile();

  // Get current year assets
  const { assets, isLoading: assetsLoading } = useAssets();

  // Get categories
  const categoriesQuery = useQuery({
    queryKey: ["expense-categories", year],
    queryFn: async () => listExpenseCategories(year),
  });

  const incomeCategoriesQuery = useQuery({
    queryKey: ["income-categories", year],
    queryFn: async () => listIncomeCategories(year),
  });

  // Get current year data
  const currentYearQuery = useQuery({
    queryKey: ["dashboard-data", year],
    queryFn: async () => {
      const [incomes, expenses] = await Promise.all([
        listIncomeEntries(year),
        listExpenseEntries(year),
      ]);
      return { incomes, expenses };
    },
  });

  const dashboardData = useMemo(() => {
    if (
      currentYearQuery.isLoading ||
      assetsLoading ||
      categoriesQuery.isLoading ||
      categoriesQuery.isFetching ||
      incomeCategoriesQuery.isLoading ||
      incomeCategoriesQuery.isFetching
    ) {
      return {
        monthlyData: [],
        expenseCategories: [],
        incomeCategories: [],
        totalIngresos: 0,
        totalGastos: 0,
        totalAhorro: 0,
        currentPatrimony: 0,
        isLoading: true,
      };
    }

    const incomes = currentYearQuery.data?.incomes || [];
    const expenses = currentYearQuery.data?.expenses || [];
    const categories = categoriesQuery.data || [];
    const incomeCategories = incomeCategoriesQuery.data || [];

    // Create a map of category_id to category name
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));
    const incomeCategoryMap = new Map(
      incomeCategories.map((cat) => [cat.id, cat.name])
    );

    // Calculate monthly totals
    const monthLabels = getMonthLabels(isMobile);
    const monthlyTotals = monthLabels.map((monthName, monthIndex) => {
      const month = monthIndex + 1;

      // Current year data
      const monthIncomes = incomes
        .filter((entry) => entry.month === month)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      const monthExpenses = expenses
        .filter((entry) => entry.month === month)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      // Calculate patrimonio from assets (current year)
      const patrimonio = assets
        .filter((asset) => asset.monthly?.[monthIndex])
        .reduce(
          (sum, asset) => sum + Number(asset.monthly?.[monthIndex] || 0),
          0
        );

      return {
        month: monthName,
        ingresos: monthIncomes,
        gastos: monthExpenses,
        ahorro: monthIncomes - monthExpenses,
        patrimonio,
      };
    });

    // Build predictions for future months: set patrimonio to null and compute patrimonioPrediccion
    const currentMonthIndex =
      new Date().getFullYear() === year ? new Date().getMonth() : 11;
    const lastValidIndex = monthlyTotals
      .map((m, idx) => ({ idx, v: m.patrimonio || 0 }))
      .filter((x) => (x.v ?? 0) > 0)
      .map((x) => x.idx)
      .slice(-1)[0];

    const lastHistory = monthlyTotals
      .filter((m) => (m.patrimonio ?? 0) > 0)
      .slice(-12);

    const predicted: MonthlyData[] = monthlyTotals.map((m, idx) => {
      // Only predict for future months within the same year and after last valid data point
      const isFuture = idx > (lastValidIndex ?? -1) && idx > currentMonthIndex;
      if (isFuture && lastHistory.length >= 2) {
        const firstValue = lastHistory[0].patrimonio as number;
        const lastValue = lastHistory[lastHistory.length - 1]
          .patrimonio as number;
        const span = lastHistory.length - 1;
        const monthlyRate =
          span > 0 && firstValue > 0
            ? Math.pow(lastValue / firstValue, 1 / span)
            : 1;

        const monthsFromLast = idx - (lastValidIndex ?? idx);
        const predictedValue =
          (lastValue > 0 ? lastValue : firstValue) *
          Math.pow(monthlyRate, monthsFromLast);

        return {
          ...m,
          patrimonio: null,
          patrimonioPrediccion: predictedValue,
        };
      }

      // For months beyond current but without enough history, hide zeros
      if (isFuture) {
        return {
          ...m,
          patrimonio: null,
        };
      }

      // Keep current value, but if it's zero for past months, keep as 0 (real zero)
      return m;
    });

    // Filter by selected month if provided
    const filteredData =
      selectedMonth !== undefined ? [predicted[selectedMonth - 1]] : predicted;

    // Calculate expense categories for current year or selected month
    const categoryTotals: Record<string, number> = {};
    const expensesToUse =
      selectedMonth !== undefined
        ? expenses.filter((expense) => expense.month === selectedMonth)
        : expenses;

    expensesToUse.forEach((expense) => {
      // Get category name from the category map
      const categoryName =
        categoryMap.get(expense.category_id) ||
        `Categoría ${expense.category_id.slice(-4)}`;
      categoryTotals[categoryName] =
        (categoryTotals[categoryName] || 0) + Number(expense.amount);
    });

    const expenseCategories = Object.entries(categoryTotals)
      .map(([name, value], index) => ({
        name,
        value,
        color: EXPENSE_COLORS[index % EXPENSE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const incomeTotals: Record<string, number> = {};
    const incomesToUse =
      selectedMonth !== undefined
        ? incomes.filter((income) => income.month === selectedMonth)
        : incomes;

    incomesToUse.forEach((income) => {
      const categoryName =
        incomeCategoryMap.get(income.category_id) ||
        `Ingreso ${income.category_id.slice(-4)}`;
      incomeTotals[categoryName] =
        (incomeTotals[categoryName] || 0) + Number(income.amount);
    });

    const incomeCategoriesData = Object.entries(incomeTotals)
      .map(([name, value], index) => ({
        name,
        value,
        color: INCOME_COLORS[index % INCOME_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate totals
    const totalIngresos = incomes.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0
    );
    const totalGastos = expenses.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0
    );
    const totalAhorro = totalIngresos - totalGastos;

    // Get current patrimonio (last available month)
    const currentPatrimony =
      monthlyTotals.filter((m) => (m.patrimonio ?? 0) > 0).slice(-1)[0]
        ?.patrimonio || 0;

    return {
      monthlyData: filteredData,
      expenseCategories,
      incomeCategories: incomeCategoriesData,
      totalIngresos,
      totalGastos,
      totalAhorro,
      currentPatrimony,
      isLoading: false,
    };
  }, [
    currentYearQuery.data,
    currentYearQuery.isLoading,
    assets,
    assetsLoading,
    selectedMonth,
    year,
    categoriesQuery.data,
    categoriesQuery.isLoading,
    categoriesQuery.isFetching,
    incomeCategoriesQuery.data,
    incomeCategoriesQuery.isLoading,
    incomeCategoriesQuery.isFetching,
    isMobile,
  ]);

  return dashboardData;
}

export function useDashboardMetrics(selectedMonth?: number) {
  const data = useDashboardData(selectedMonth);

  return useMemo(() => {
    if (data.isLoading) {
      return {
        totalIngresos: 0,
        totalGastos: 0,
        totalAhorro: 0,
        currentPatrimony: 0,
        isLoading: true,
      };
    }

    return {
      totalIngresos: data.totalIngresos,
      totalGastos: data.totalGastos,
      totalAhorro: data.totalAhorro,
      currentPatrimony: data.currentPatrimony,
      isLoading: false,
    };
  }, [data]);
}
