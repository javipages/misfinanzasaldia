import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import type { MonthlyData } from "@/hooks/use-dashboard-data";
import { formatCurrency } from "@/utils/format";

interface PatrimonyEvolutionChartProps {
  data: MonthlyData[];
  selectedMonth?: number;
  year: number;
}

const months = [
  { value: undefined, label: "Todo el año" },
  { value: 1, label: "Enero", shortLabel: "Ene" },
  { value: 2, label: "Febrero", shortLabel: "Feb" },
  { value: 3, label: "Marzo", shortLabel: "Mar" },
  { value: 4, label: "Abril", shortLabel: "Abr" },
  { value: 5, label: "Mayo", shortLabel: "May" },
  { value: 6, label: "Junio", shortLabel: "Jun" },
  { value: 7, label: "Julio", shortLabel: "Jul" },
  { value: 8, label: "Agosto", shortLabel: "Ago" },
  { value: 9, label: "Septiembre", shortLabel: "Sep" },
  { value: 10, label: "Octubre", shortLabel: "Oct" },
  { value: 11, label: "Noviembre", shortLabel: "Nov" },
  { value: 12, label: "Diciembre", shortLabel: "Dic" },
];

export const PatrimonyEvolutionChart = ({
  data,
  selectedMonth,
  year,
}: PatrimonyEvolutionChartProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Evolución del Patrimonio</CardTitle>
        <p className="text-sm text-muted-foreground">
          {selectedMonth
            ? `Hasta ${months.find((m) => m.value === selectedMonth)?.label}`
            : `Evolución mensual ${year}`}
        </p>
      </CardHeader>
      <CardContent className="px-0 pr-3 md:pr-4">
        <ChartContainer
          config={{
            patrimonio: {
              label: "Patrimonio",
              color: "hsl(var(--chart-1))",
            },
          }}
        >
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    `Patrimonio: ${formatCurrency(Number(value))}`
                  }
                />
              }
            />
            {/* Real patrimonio line: connectNulls to skip nulls and avoid 0s */}
            <Line
              type="monotone"
              dataKey="patrimonio"
              stroke="var(--color-patrimonio)"
              strokeWidth={3}
              connectNulls
              dot={{
                fill: "var(--color-patrimonio)",
                strokeWidth: 2,
                r: 4,
              }}
              name="Patrimonio"
            />
            {/* Prediction dots: not connected, visible with outlined dot */}
            <Line
              type="monotone"
              dataKey="patrimonioPrediccion"
              stroke="rgba(59,130,246,0.25)"
              strokeDasharray="3 6"
              connectNulls={false}
              dot={{
                r: 5,
                stroke: "var(--color-patrimonio)",
                strokeWidth: 2,
                fill: "rgba(59,130,246,0.25)",
              }}
              name="Predicción"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

