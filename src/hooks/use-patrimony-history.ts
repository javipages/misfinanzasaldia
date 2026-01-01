import { useQuery } from "@tanstack/react-query";
import { listAssetValuesMultiYear } from "@/integrations/supabase/categories";

export interface PatrimonyHistoryPoint {
  date: string; // Format: "MMM 'YY" (e.g., "Ene '24")
  patrimonio: number;
  year: number;
  month: number;
}

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function usePatrimonyHistory() {
  const currentYear = new Date().getFullYear();
  const startYear = 2020; // Start from first year of possible data

  const query = useQuery({
    queryKey: ["patrimony-history", startYear, currentYear],
    queryFn: async () => {
      const values = await listAssetValuesMultiYear(startYear, currentYear);
      
      // Group by year-month and sum all asset values
      const monthlyTotals = new Map<string, { year: number; month: number; total: number }>();
      
      for (const value of values) {
        const key = `${value.year}-${value.month}`;
        const existing = monthlyTotals.get(key);
        if (existing) {
          existing.total += value.amount;
        } else {
          monthlyTotals.set(key, {
            year: value.year,
            month: value.month,
            total: value.amount,
          });
        }
      }

      // Convert to sorted array
      const result: PatrimonyHistoryPoint[] = Array.from(monthlyTotals.values())
        .filter((item) => item.total > 0) // Only include months with data
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        })
        .map((item) => ({
          date: `${MONTH_LABELS[item.month - 1]} '${String(item.year).slice(-2)}`,
          patrimonio: item.total,
          year: item.year,
          month: item.month,
        }));

      return result;
    },
  });

  return {
    historyData: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
