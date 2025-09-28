import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "@/store/user";
import {
  listIncomeEntries,
  listExpenseEntries,
  listExpenseCategories,
  listAssetValues,
} from "@/integrations/supabase/categories";
import { useAssets } from "@/hooks/use-assets";

export interface MonthlyData {
  month: string;
  ingresos: number;
  gastos: number;
  ahorro: number;
  patrimonio?: number | null;
  patrimonioPrediccion?: number;
  // previous year comparison fields (optional so consumers can narrow by view)
  prevIngresos?: number;
  prevGastos?: number;
  prevPatrimonio?: number;
}

interface AssetValue {
  category_id: string;
  month: number;
  amount: number;
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
  const year = useUserStore((s) => s.year);
  const previousYear = year - 1;

  // Get current year assets
  const { assets, isLoading: assetsLoading } = useAssets();

  // Get previous year asset values
  const previousYearValuesQuery = useQuery({
    queryKey: ["asset_values", previousYear],
    queryFn: async () => {
      try {
        const data = await listAssetValues(previousYear);
        return data;
      } catch {
        // If previous year data doesn't exist, return empty array
        return [];
      }
    },
  });

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
      categoriesQuery.isFetching ||
      previousYearValuesQuery.isLoading ||
      previousYearQuery.isLoading
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
    const prevAssetValues = previousYearValuesQuery.data || [];
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

      // Calculate patrimonio from assets (current year)
      const patrimonio = assets
        .filter((asset) => asset.monthly?.[monthIndex])
        .reduce(
          (sum, asset) => sum + Number(asset.monthly?.[monthIndex] || 0),
          0
        );

      // Calculate patrimonio from previous year assets
      const prevPatrimonio = assets
        .map((asset) => {
          const prevValue = prevAssetValues.find(
            (v: AssetValue) => v.category_id === asset.id && v.month === month
          );
          return prevValue ? Number(prevValue.amount) : 0;
        })
        .reduce((sum, amount) => sum + amount, 0);

      return {
        month: monthName,
        ingresos: monthIncomes,
        gastos: monthExpenses,
        ahorro: monthIncomes - monthExpenses,
        patrimonio,
        prevIngresos: prevMonthIncomes,
        prevGastos: prevMonthExpenses,
        prevPatrimonio,
      } as MonthlyData & {
        prevIngresos: number;
        prevGastos: number;
        prevPatrimonio: number;
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
      monthlyTotals.filter((m) => (m.patrimonio ?? 0) > 0).slice(-1)[0]
        ?.patrimonio || 0;

    const previousYearData = MONTHS.map((monthName, monthIndex) => {
      const month = monthIndex + 1;
      const prevMonthIncomes = prevIncomes
        .filter((entry) => entry.month === month)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      const prevMonthExpenses = prevExpenses
        .filter((entry) => entry.month === month)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      // Calculate patrimonio from previous year assets
      const prevPatrimonio = assets
        .map((asset) => {
          const prevValue = prevAssetValues.find(
            (v: AssetValue) => v.category_id === asset.id && v.month === month
          );
          return prevValue ? Number(prevValue.amount) : 0;
        })
        .reduce((sum, amount) => sum + amount, 0);

      return {
        month: monthName,
        ingresos: prevMonthIncomes,
        gastos: prevMonthExpenses,
        ahorro: prevMonthIncomes - prevMonthExpenses,
        patrimonio: prevPatrimonio,
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
    previousYearQuery.isLoading,
    previousYearValuesQuery.data,
    assets,
    assetsLoading,
    selectedMonth,
    year,
    categoriesQuery.data,
    categoriesQuery.isLoading,
    categoriesQuery.isFetching,
    previousYearValuesQuery.isLoading,
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

    // Calculate changes based on selected view (annual vs monthly)
    const prevIncomes =
      data.previousYearData?.map((m) => ({
        amount: m.ingresos,
        month: MONTHS.indexOf(m.month) + 1,
      })) || [];
    const prevExpenses =
      data.previousYearData?.map((m) => ({
        amount: m.gastos,
        month: MONTHS.indexOf(m.month) + 1,
      })) || [];

    let currentIngresos,
      prevIngresos,
      currentGastos,
      prevGastos,
      currentAhorro,
      prevAhorro;

    if (selectedMonth) {
      // Monthly comparison: compare specific month vs same month of previous year
      const currentMonth = selectedMonth;
      const currentData = data.monthlyData.find((m) => {
        const monthIndex = MONTHS.indexOf(m.month);
        return monthIndex + 1 === currentMonth;
      });
      const prevData = data.previousYearData?.find((m) => {
        const monthIndex = MONTHS.indexOf(m.month);
        return monthIndex + 1 === currentMonth;
      });

      currentIngresos = currentData?.ingresos || 0;
      prevIngresos = prevData?.ingresos || 0;
      currentGastos = currentData?.gastos || 0;
      prevGastos = prevData?.gastos || 0;
      currentAhorro = currentData?.ahorro || 0;
      prevAhorro = prevData?.ahorro || 0;
    } else {
      // Annual comparison: compare year totals vs previous year totals
      currentIngresos = data.totalIngresos;
      prevIngresos = prevIncomes.reduce(
        (sum: number, entry: { amount: number }) => sum + entry.amount,
        0
      );
      currentGastos = data.totalGastos;
      prevGastos = prevExpenses.reduce(
        (sum: number, entry: { amount: number }) => sum + entry.amount,
        0
      );
      currentAhorro = data.totalAhorro;
      prevAhorro =
        prevIncomes.reduce(
          (sum: number, entry: { amount: number }) => sum + entry.amount,
          0
        ) -
        prevExpenses.reduce(
          (sum: number, entry: { amount: number }) => sum + entry.amount,
          0
        );
    }

    const ingresosChange =
      prevIngresos > 0
        ? ((currentIngresos - prevIngresos) / prevIngresos) * 100
        : 0;

    const gastosChange =
      prevGastos > 0 ? ((currentGastos - prevGastos) / prevGastos) * 100 : 0;

    const ahorroChange =
      prevAhorro !== 0
        ? ((currentAhorro - prevAhorro) / Math.abs(prevAhorro)) * 100
        : 0;

    // For patrimonio, always compare with the same month of previous year if viewing specific month
    // or with the last available month of previous year if viewing annual data
    const currentPatrimony = data.currentPatrimony;
    const prevPatrimony = selectedMonth
      ? data.previousYearData?.find((m) => {
          const monthIndex = MONTHS.indexOf(m.month);
          return monthIndex + 1 === selectedMonth;
        })?.patrimonio || 0
      : data.previousYearData?.[data.previousYearData.length - 1]?.patrimonio ||
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
