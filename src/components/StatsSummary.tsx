import { TrendingUp, PiggyBank, Trophy } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { formatCurrency } from "@/utils/format";

export interface StatsState {
  yearTotal: number;
  monthlyAverage: number;
  bestMonth: { index: number; amount: number };
}

interface StatsSummaryProps {
  stats: StatsState;
  variant: "income" | "expense";
}

// Compact summary for year total, monthly average and best month
export function StatsSummary({ stats, variant }: StatsSummaryProps) {
  const isIncome = variant === "income";

  const totalVariant = (isIncome ? "success" : "destructive") as
    | "success"
    | "destructive";
  const avgVariant = (isIncome ? "info" : "warning") as "info" | "warning";
  const bestVariant = (isIncome ? "primary" : "info") as "primary" | "info";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Total año actual"
        value={formatCurrency(stats.yearTotal)}
        icon={TrendingUp}
        variant={totalVariant}
      />
      <MetricCard
        title="Promedio mensual"
        value={formatCurrency(stats.monthlyAverage)}
        icon={PiggyBank}
        variant={avgVariant}
      />
      <MetricCard
        title="Mejor mes"
        value={formatCurrency(stats.bestMonth.amount)}
        icon={Trophy}
        variant={bestVariant}
      />
    </div>
  );
}
