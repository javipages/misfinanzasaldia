
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useInvestmentEvolution } from "@/hooks/use-investment-evolution";
import { formatCurrency } from "@/utils/format";
import { Skeleton } from "@/components/ui/skeleton";

export function WealthEvolutionChart() {
  const { data: historyData, isLoading } = useInvestmentEvolution();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium text-foreground mb-2">
            {new Date(label).toLocaleDateString()}
          </p>
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex flex-col gap-1 mb-1 last:mb-0">
               <span className="text-xs text-muted-foreground">{entry.name}</span>
               <span className="text-sm font-bold" style={{ color: entry.stroke }}>
                 {formatCurrency(entry.value)}
               </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="shadow-card h-full">
        <CardHeader>
          <CardTitle>Evolución del Patrimonio</CardTitle>
          <CardDescription>Tu crecimiento a lo largo del tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!historyData || historyData.length === 0) {
    return (
      <Card className="shadow-card h-full">
        <CardHeader>
          <CardTitle>Evolución del Patrimonio</CardTitle>
          <CardDescription>Rentabilidad vs Inversión</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          No hay histórico disponible
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card h-full">
      <CardHeader>
        <CardTitle>Evolución del Patrimonio</CardTitle>
        <CardDescription>Rentabilidad vs Inversión</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
                minTickGap={30}
                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="totalValue"
                name="Valor Total"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorValue)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="totalInvested"
                name="Invertido"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorInvested)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
