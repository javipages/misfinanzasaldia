// Aggregation utilities for different time periods

export type PeriodType = "monthly" | "quarterly" | "semiannual" | "annual";

export type AggregatedPeriod = {
  label: string;
  monthIndices: number[]; // 0-11
};

/**
 * Get aggregated periods based on the selected period type
 */
export function getAggregatedPeriods(
  periodType: PeriodType
): AggregatedPeriod[] {
  switch (periodType) {
    case "monthly":
      return [
        { label: "Ene", monthIndices: [0] },
        { label: "Feb", monthIndices: [1] },
        { label: "Mar", monthIndices: [2] },
        { label: "Abr", monthIndices: [3] },
        { label: "May", monthIndices: [4] },
        { label: "Jun", monthIndices: [5] },
        { label: "Jul", monthIndices: [6] },
        { label: "Ago", monthIndices: [7] },
        { label: "Sep", monthIndices: [8] },
        { label: "Oct", monthIndices: [9] },
        { label: "Nov", monthIndices: [10] },
        { label: "Dic", monthIndices: [11] },
      ];
    case "quarterly":
      return [
        { label: "Q1", monthIndices: [0, 1, 2] },
        { label: "Q2", monthIndices: [3, 4, 5] },
        { label: "Q3", monthIndices: [6, 7, 8] },
        { label: "Q4", monthIndices: [9, 10, 11] },
      ];
    case "semiannual":
      return [
        { label: "S1", monthIndices: [0, 1, 2, 3, 4, 5] },
        { label: "S2", monthIndices: [6, 7, 8, 9, 10, 11] },
      ];
    case "annual":
      return [
        {
          label: "Anual",
          monthIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        },
      ];
  }
}

/**
 * Aggregate monthly data into the selected period
 */
export function aggregateData(
  monthlyData: number[],
  period: AggregatedPeriod
): number {
  return period.monthIndices.reduce(
    (sum, monthIndex) => sum + (monthlyData[monthIndex] ?? 0),
    0
  );
}

/**
 * Calculate variation between consecutive periods
 */
export function calculateVariation(
  current: number,
  previous: number
): { absolute: number; percentage: number } {
  const absolute = current - previous;
  const percentage = previous !== 0 ? (absolute / previous) * 100 : 0;
  return { absolute, percentage };
}

/**
 * Get heatmap color intensity based on value relative to max
 */
export function getHeatmapColor(
  value: number,
  max: number,
  kind: "income" | "expense"
): string {
  if (value === 0 || max === 0) return "transparent";
  const intensity = Math.min(value / max, 1);
  
  if (kind === "income") {
    // Green for income
    const alpha = 0.1 + intensity * 0.3; // 0.1 to 0.4
    return `rgba(34, 197, 94, ${alpha})`;
  } else {
    // Red for expenses
    const alpha = 0.1 + intensity * 0.3; // 0.1 to 0.4
    return `rgba(239, 68, 68, ${alpha})`;
  }
}

/**
 * Check if a row has any non-zero values
 */
export function hasNonZeroValues(data: number[]): boolean {
  return data.some((value) => value !== 0);
}