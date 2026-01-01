import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonthlyData } from "@/hooks/use-dashboard-data";
import { ChartConfig } from "../ui/chart";
import { formatCurrency } from "@/utils/format";

interface MonthlyOverviewChartProps {
  data: MonthlyData[];
  selectedMonth?: number;
  year: number;
}

const chartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "#22c55e",
  },
  gastos: {
    label: "Gastos",
    color: "#ef4444",
  },
} satisfies ChartConfig;

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

export const MonthlyOverviewChart = ({
  data,
  selectedMonth,
  year,
}: MonthlyOverviewChartProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>
          {selectedMonth
            ? `Resumen de ${
                months.find((m) => m.value === selectedMonth)?.label
              }`
            : `Resumen Mensual ${year}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pr-2 md:pr-4">
        <ChartContainer config={chartConfig}>
          <ComposedChart data={data} key={`monthly-${selectedMonth ?? "all"}`}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const label =
                      name === "ingresos"
                        ? "Ingresos"
                        : name === "gastos"
                        ? "Gastos"
                        : name === "ahorro"
                        ? "Ahorro"
                        : name;
                    return `${label}: ${formatCurrency(Number(value))}`;
                  }}
                />
              }
            />
            <Bar
              dataKey="ingresos"
              fill="var(--color-ingresos)"
              name="Ingresos"
            />
            <Bar dataKey="gastos" fill="var(--color-gastos)" name="Gastos" />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
