import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useYearStore } from "@/store/year";
import {
  listIncomeEntries,
  listExpenseEntries,
  listExpenseCategories,
} from "@/integrations/supabase/categories";
import { useAssets } from "@/hooks/use-assets";

export interface MonthlyData {
  month: string;
  ingresos: number;
  gastos: number;
  ahorro: number;
  patrimonio?: number;
}

export interface DashboardData {
  monthlyData: MonthlyData[];
  expenseCategories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  totalIngresos: number;
  totalGastos: number;
  totalAhorro: number;
  currentPatrimony: number;
  isLoading: boolean;
  previousYearData?: MonthlyData[];
}

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export function useDashboardData(selectedMonth?: number) {
  const year = useYearStore((s) => s.year);
  const previousYear = year - 1;
  const { assets, isLoading: assetsLoading } = useAssets();

  // Get categories
  const categoriesQuery = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => listExpenseCategories(),
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

  // Get previous year data for comparison
  const previousYearQuery = useQuery({
    queryKey: ["dashboard-data", previousYear],
    queryFn: async () => {
      try {
        const [incomes, expenses] = await Promise.all([
          listIncomeEntries(previousYear),
          listExpenseEntries(previousYear),
        ]);
        return { incomes, expenses };
      } catch {
        // If previous year data doesn't exist, return empty arrays
        return { incomes: [], expenses: [] };
      }
    },
  });

  const dashboardData = useMemo(() => {
    if (
      currentYearQuery.isLoading ||
      assetsLoading ||
      categoriesQuery.isLoading ||
      categoriesQuery.isFetching
    ) {
      return {
        monthlyData: [],
        expenseCategories: [],
        totalIngresos: 0,
        totalGastos: 0,
        totalAhorro: 0,
        currentPatrimony: 0,
        isLoading: true,
        previousYearData: [],
      };
    }

    const incomes = currentYearQuery.data?.incomes || [];
    const expenses = currentYearQuery.data?.expenses || [];
    const prevIncomes = previousYearQuery.data?.incomes || [];
    const prevExpenses = previousYearQuery.data?.expenses || [];
    const categories = categoriesQuery.data || [];

    // Create a map of category_id to category name
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    // Calculate monthly totals
    const monthlyTotals = MONTHS.map((monthName, monthIndex) => {
      const month = monthIndex + 1;

      // Current year data
      const monthIncomes = incomes
        .filter((entry) => entry.month === month)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      const monthExpenses = expenses
        .filter((entry) => entry.month === month)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      // Previous year data
      const prevMonthIncomes = prevIncomes
        .filter((entry) => entry.month === month)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      const prevMonthExpenses = prevExpenses
        .filter((entry) => entry.month === month)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      // Calculate patrimonio from assets
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
        prevIngresos: prevMonthIncomes,
        prevGastos: prevMonthExpenses,
      };
    });

    // Filter by selected month if provided
    const filteredData =
      selectedMonth !== undefined
        ? [monthlyTotals[selectedMonth - 1]]
        : monthlyTotals;

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
        color: CHART_COLORS[index % CHART_COLORS.length],
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
      monthlyTotals.filter((m) => m.patrimonio > 0).slice(-1)[0]?.patrimonio ||
      0;

    const previousYearData = MONTHS.map((monthName, monthIndex) => {
      const prevMonthIncomes = prevIncomes
        .filter((entry) => entry.month === monthIndex + 1)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      const prevMonthExpenses = prevExpenses
        .filter((entry) => entry.month === monthIndex + 1)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      return {
        month: monthName,
        ingresos: prevMonthIncomes,
        gastos: prevMonthExpenses,
        ahorro: prevMonthIncomes - prevMonthExpenses,
        patrimonio: 0, // Previous year patrimonio would need separate tracking
      };
    });

    return {
      monthlyData: filteredData,
      expenseCategories,
      totalIngresos,
      totalGastos,
      totalAhorro,
      currentPatrimony,
      isLoading: false,
      previousYearData,
    };
  }, [
    currentYearQuery.data,
    currentYearQuery.isLoading,
    previousYearQuery.data,
    assets,
    assetsLoading,
    selectedMonth,
    categoriesQuery.data,
    categoriesQuery.isLoading,
    categoriesQuery.isFetching,
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
        ingresosChange: 0,
        gastosChange: 0,
        ahorroChange: 0,
        patrimonioChange: 0,
        isLoading: true,
      };
    }

    // Calculate changes vs previous month
    const currentMonth = selectedMonth || new Date().getMonth() + 1;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

    const currentData = data.monthlyData.find((m) => {
      const monthIndex = MONTHS.indexOf(m.month);
      return monthIndex + 1 === currentMonth;
    });

    const prevData = data.previousYearData?.find((m) => {
      const monthIndex = MONTHS.indexOf(m.month);
      return monthIndex + 1 === prevMonth;
    });

    const currentIngresos = currentData?.ingresos || 0;
    const prevIngresos = prevData?.ingresos || 0;
    const ingresosChange =
      prevIngresos > 0
        ? ((currentIngresos - prevIngresos) / prevIngresos) * 100
        : 0;

    const currentGastos = currentData?.gastos || 0;
    const prevGastos = prevData?.gastos || 0;
    const gastosChange =
      prevGastos > 0 ? ((currentGastos - prevGastos) / prevGastos) * 100 : 0;

    const currentAhorro = currentData?.ahorro || 0;
    const prevAhorro = prevData?.ahorro || 0;
    const ahorroChange =
      prevAhorro !== 0
        ? ((currentAhorro - prevAhorro) / Math.abs(prevAhorro)) * 100
        : 0;

    const currentPatrimony = data.currentPatrimony;
    const prevPatrimony =
      data.previousYearData?.[data.previousYearData.length - 1]?.patrimonio ||
      0;
    const patrimonioChange =
      prevPatrimony > 0
        ? ((currentPatrimony - prevPatrimony) / prevPatrimony) * 100
        : 0;

    return {
      totalIngresos: data.totalIngresos,
      totalGastos: data.totalGastos,
      totalAhorro: data.totalAhorro,
      currentPatrimony,
      ingresosChange,
      gastosChange,
      ahorroChange,
      patrimonioChange,
      isLoading: false,
    };
  }, [data, selectedMonth]);
}
