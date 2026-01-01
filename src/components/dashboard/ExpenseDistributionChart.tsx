import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

interface ExpenseDistributionChartProps {
  categories: ExpenseCategory[];
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

export const ExpenseDistributionChart = ({
  categories,
  selectedMonth,
  year,
}: ExpenseDistributionChartProps) => {
  const [showAllCategories, setShowAllCategories] = useState(false);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Distribución de Gastos</CardTitle>
        <p className="text-sm text-muted-foreground">
          {selectedMonth
            ? `Mes de ${months.find((m) => m.value === selectedMonth)?.label}`
            : `Total del año ${year}`}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categories}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
            >
              {categories.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
                      <p className="font-medium">{payload[0].name}</p>
                      <p>Gasto: {Number(payload[0].value).toLocaleString()}€</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-1 gap-2 mt-4">
          {(showAllCategories ? categories : categories.slice(0, 5)).map(
            (category, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {category.name}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {category.value.toLocaleString()}€
                </span>
              </div>
            )
          )}
          {categories.length > 5 && (
            <div className="text-center pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showAllCategories
                  ? `Ocultar ${categories.length - 5} categorías`
                  : `Ver +${categories.length - 5} categorías más`}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
