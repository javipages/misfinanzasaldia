import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BenchmarkData {
  id: string;
  benchmark_name: string;
  date: string;
  close_value: number;
  change_percent: number | null;
}

export interface NormalizedBenchmark {
  date: string;
  sp500: number | null;
  msciWorld: number | null;
}

/**
 * Hook para obtener datos de benchmarks y normalizarlos a base 100
 * desde una fecha de inicio específica
 */
export function useBenchmarkData(startDate?: string) {
  return useQuery({
    queryKey: ["benchmark-data", startDate],
    queryFn: async () => {
      let query = supabase
        .from("benchmark_history")
        .select("*")
        .order("date", { ascending: true });

      // Si hay fecha de inicio, filtrar desde esa fecha
      if (startDate) {
        query = query.gte("date", startDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as BenchmarkData[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: true,
  });
}

/**
 * Normaliza los datos de benchmarks a base 100 desde la fecha de inicio
 */
export function normalizeBenchmarkData(
  benchmarkData: BenchmarkData[],
  startDate: string
): NormalizedBenchmark[] {
  if (!benchmarkData || benchmarkData.length === 0) return [];

  // Agrupar por benchmark
  const sp500Data = benchmarkData.filter((d) => d.benchmark_name === "SP500");
  const msciWorldData = benchmarkData.filter((d) => d.benchmark_name === "MSCI_WORLD");

  // Encontrar el valor inicial (más cercano a startDate)
  const sp500Start = sp500Data.find((d) => d.date >= startDate);
  const msciWorldStart = msciWorldData.find((d) => d.date >= startDate);

  if (!sp500Start || !msciWorldStart) {
    console.warn("No se encontraron datos de benchmark para la fecha de inicio");
    return [];
  }

  const sp500BaseValue = sp500Start.close_value;
  const msciWorldBaseValue = msciWorldStart.close_value;

  // Obtener todas las fechas únicas
  const allDates = Array.from(
    new Set([...sp500Data, ...msciWorldData].map((d) => d.date))
  ).sort();

  // Normalizar a base 100
  const normalized: NormalizedBenchmark[] = allDates
    .filter((date) => date >= startDate)
    .map((date) => {
      const sp500Entry = sp500Data.find((d) => d.date === date);
      const msciWorldEntry = msciWorldData.find((d) => d.date === date);

      return {
        date,
        sp500: sp500Entry
          ? (sp500Entry.close_value / sp500BaseValue) * 100
          : null,
        msciWorld: msciWorldEntry
          ? (msciWorldEntry.close_value / msciWorldBaseValue) * 100
          : null,
      };
    });

  return normalized;
}

/**
 * Calcula el performance relativo (outperformance/underperformance)
 * del portfolio vs los benchmarks
 */
export function calculateRelativePerformance(
  portfolioChange: number,
  benchmarkChange: number
): {
  difference: number;
  isOutperforming: boolean;
  label: string;
} {
  const difference = portfolioChange - benchmarkChange;
  const isOutperforming = difference > 0;

  const label = isOutperforming
    ? `+${difference.toFixed(2)}% vs benchmark`
    : `${difference.toFixed(2)}% vs benchmark`;

  return {
    difference,
    isOutperforming,
    label,
  };
}

/**
 * Hook completo que combina datos de portfolio y benchmarks
 */
export function useBenchmarkComparison(startDate?: string) {
  const { data: benchmarkData, isLoading } = useBenchmarkData(startDate);

  const normalizedData = benchmarkData && startDate
    ? normalizeBenchmarkData(benchmarkData, startDate)
    : [];

  return {
    benchmarkData,
    normalizedData,
    isLoading,
  };
}
