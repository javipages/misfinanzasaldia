import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyData } from "@/hooks/use-dashboard-data";

interface FinancialSummaryProps {
  monthlyData: MonthlyData[];
  totalIngresos: number;
  totalGastos: number;
  totalAhorro: number;
  selectedMonth?: number;
}

export const FinancialSummary = ({
  monthlyData,
  totalIngresos,
  totalGastos,
  totalAhorro,
  selectedMonth,
}: FinancialSummaryProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Resumen Financiero</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Tasa de Ahorro
            </span>
            <span className="font-medium">
              {totalIngresos > 0
                ? ((totalAhorro / totalIngresos) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Gastos/Ingresos
            </span>
            <span className="font-medium">
              {totalIngresos > 0
                ? ((totalGastos / totalIngresos) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Mes con más ahorro
            </span>
            <span className="font-medium">
              {monthlyData.reduce((max, current, index) => {
                const maxAhorro = monthlyData[max]?.ahorro || 0;
                const currentAhorro = current.ahorro;
                return currentAhorro > maxAhorro ? index : max;
              }, 0) !== -1
                ? monthlyData.reduce((max, current, index) => {
                    const maxAhorro = monthlyData[max]?.ahorro || 0;
                    const currentAhorro = current.ahorro;
                    return currentAhorro > maxAhorro ? index : max;
                  }, 0) + 1
                : "N/A"}
              º mes
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Promedio mensual
            </span>
            <span className="font-medium">
              {(totalIngresos / (selectedMonth ? 1 : 12)).toLocaleString()}€
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
