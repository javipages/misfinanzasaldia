
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Holding } from "@/hooks/use-holdings";
import { formatCurrency } from "@/utils/format";

interface AllocationChartProps {
  holdings: Holding[];
  displayCurrency: "USD" | "EUR";
  exchangeRate: number | null;
}

const COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // green-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
  "#84cc16", // lime-500
];

export function AllocationChart({ 
  holdings, 
  displayCurrency, 
  exchangeRate 
}: AllocationChartProps) {
  const [groupBy, setGroupBy] = useState<"asset_type" | "source">("asset_type");

  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();

    holdings.forEach(holding => {
      let value = holding.position_value;
      
      // Convert value if needed
      if (holding.currency !== displayCurrency && exchangeRate) {
        if (displayCurrency === "EUR" && holding.currency === "USD") {
          value = value * exchangeRate;
        } else if (displayCurrency === "USD" && holding.currency === "EUR") {
          value = value / exchangeRate;
        }
      }

      const key = groupBy === "asset_type" ? holding.asset_type : holding.source;
      const current = dataMap.get(key) || 0;
      dataMap.set(key, current + value);
    });

    const total = Array.from(dataMap.values()).reduce((a, b) => a + b, 0);

    return Array.from(dataMap.entries())
      .map(([name, value], index) => ({
        name: formatLabel(name, groupBy),
        value,
        percent: (value / total) * 100,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, groupBy, displayCurrency, exchangeRate]);

  function formatLabel(key: string, type: "asset_type" | "source") {
    if (type === "asset_type") {
      const labels: Record<string, string> = {
        etf: "ETFs",
        stock: "Acciones",
        fund: "Fondos",
        crypto: "Criptomonedas",
        bond: "Bonos",
        other: "Otros"
      };
      return labels[key] || key;
    } else {
      const labels: Record<string, string> = {
        ibkr: "Interactive Brokers",
        myinvestor: "MyInvestor",
        binance: "Binance",
        manual: "Manual"
      };
      return labels[key] || key;
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <div className="flex flex-col gap-1 mt-1">
            <p className="text-sm text-muted-foreground">
              {formatCurrency(data.value)}
            </p>
            <p className="text-xs font-bold" style={{ color: data.color }}>
              {data.percent.toFixed(1)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (holdings.length === 0) {
    return (
      <Card className="shadow-card h-full">
        <CardHeader>
          <CardTitle>Asignación</CardTitle>
          <CardDescription>Distribución de tus inversiones</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          No hay datos disponibles
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Asignación</CardTitle>
          <CardDescription>Distribución de tus inversiones</CardDescription>
        </div>
        <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as any)} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="asset_type">Tipo</TabsTrigger>
            <TabsTrigger value="source">Fuente</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-sm text-muted-foreground ml-1">
                    {value} ({entry.payload.percent.toFixed(0)}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
