import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { IBKRHistoryEntry } from "@/hooks/use-ibkr-history";
import { convertCurrency } from "@/hooks/use-exchange-rate";
import { useBenchmarkComparison, normalizeBenchmarkData } from "@/hooks/use-benchmark-comparison";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface IBKRChartsProps {
  history: IBKRHistoryEntry[];
  exchangeRate: number | null;
  displayCurrency: "USD" | "EUR";
}

export function IBKRCharts({
  history,
  exchangeRate,
  displayCurrency,
}: IBKRChartsProps) {
  // Get first investment date for benchmark comparison
  const firstInvestmentDate =
    history.length > 0
      ? new Date(history[history.length - 1].sync_date).toISOString().split("T")[0]
      : undefined;

  // Fetch benchmark data
  const { normalizedData: benchmarkData, isLoading: benchmarkLoading } =
    useBenchmarkComparison(firstInvestmentDate);

  if (history.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Evolución del Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">
            Sincroniza varias veces para ver gráficos de evolución
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts (reverse to show oldest to newest)
  const chartData = [...history]
    .reverse()
    .filter((entry) => entry.status === "success")
    .map((entry) => {
      const totalValue = convertCurrency(entry.total_value_usd, exchangeRate);
      const totalCost = convertCurrency(entry.total_cost_usd, exchangeRate);
      const totalPnl = convertCurrency(entry.total_pnl_usd, exchangeRate);

      return {
        date: new Date(entry.sync_date).toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        fullDate: new Date(entry.sync_date).toLocaleString("es-ES"),
        isoDate: new Date(entry.sync_date).toISOString().split("T")[0],
        value: parseFloat(totalValue.toFixed(2)),
        cost: parseFloat(totalCost.toFixed(2)),
        pnl: parseFloat(totalPnl.toFixed(2)),
        pnlPercent:
          entry.total_cost_usd > 0
            ? ((entry.total_pnl_usd / entry.total_cost_usd) * 100).toFixed(2)
            : "0",
      };
    });

  // Normalize portfolio to base 100 for comparison
  const firstValue = chartData[0]?.value || 1;
  const portfolioNormalized = chartData.map((entry) => ({
    ...entry,
    normalizedValue: (entry.value / firstValue) * 100,
  }));

  // Combine portfolio and benchmark data for comparison chart
  const comparisonData = portfolioNormalized.map((entry) => {
    const benchmarkEntry = benchmarkData.find((b) => b.date === entry.isoDate);
    return {
      date: entry.date,
      fullDate: entry.fullDate,
      portfolio: parseFloat(entry.normalizedValue.toFixed(2)),
      sp500: benchmarkEntry?.sp500 ? parseFloat(benchmarkEntry.sp500.toFixed(2)) : null,
      msciWorld: benchmarkEntry?.msciWorld ? parseFloat(benchmarkEntry.msciWorld.toFixed(2)) : null,
    };
  });

  // Calculate final performance vs benchmarks
  const lastEntry = comparisonData[comparisonData.length - 1];
  const portfolioReturn = lastEntry ? lastEntry.portfolio - 100 : 0;
  const sp500Return = lastEntry?.sp500 ? lastEntry.sp500 - 100 : 0;
  const msciWorldReturn = lastEntry?.msciWorld ? lastEntry.msciWorld - 100 : 0;

  const sp500Diff = portfolioReturn - sp500Return;
  const msciWorldDiff = portfolioReturn - msciWorldReturn;

  const currencySymbol = displayCurrency === "USD" ? "$" : "€";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="text-sm font-medium mb-2">{payload[0].payload.fullDate}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {currencySymbol}
              {entry.value.toLocaleString("es-ES")}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Evolución del Portfolio</CardTitle>
          {lastEntry && (
            <div className="flex gap-2">
              <Badge
                variant={sp500Diff >= 0 ? "default" : "secondary"}
                className={sp500Diff >= 0 ? "bg-green-600" : "bg-red-600"}
              >
                {sp500Diff >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {sp500Diff >= 0 ? "+" : ""}
                {sp500Diff.toFixed(2)}% vs S&P 500
              </Badge>
              <Badge
                variant={msciWorldDiff >= 0 ? "default" : "secondary"}
                className={msciWorldDiff >= 0 ? "bg-green-600" : "bg-red-600"}
              >
                {msciWorldDiff >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {msciWorldDiff >= 0 ? "+" : ""}
                {msciWorldDiff.toFixed(2)}% vs MSCI World
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="value" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="value">Valor</TabsTrigger>
            <TabsTrigger value="pnl">Ganancia/Pérdida</TabsTrigger>
            <TabsTrigger value="comparison">Comparación</TabsTrigger>
          </TabsList>

          <TabsContent value="value" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    `${currencySymbol}${(value / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Valor Actual"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Costo"
                  stroke="#82ca9d"
                  fillOpacity={1}
                  fill="url(#colorCost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="pnl" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    `${currencySymbol}${(value / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  name="Ganancia/Pérdida"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="comparison" className="mt-6">
            {benchmarkLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    📊 Rendimiento normalizado a base 100 desde tu primera inversión.
                    Todos los valores comienzan en 100 para facilitar la comparación.
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value.toFixed(0)}`}
                      label={{
                        value: "Base 100",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 12 },
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                              <p className="text-sm font-medium mb-2">
                                {payload[0].payload.fullDate}
                              </p>
                              {payload.map((entry: any, index: number) => (
                                <p
                                  key={index}
                                  className="text-sm"
                                  style={{ color: entry.color }}
                                >
                                  {entry.name}: {entry.value?.toFixed(2) || "N/A"} (
                                  {entry.value ? `${(entry.value - 100).toFixed(2)}%` : "N/A"}
                                  )
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="portfolio"
                      name="Tu Portfolio"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sp500"
                      name="S&P 500"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="msciWorld"
                      name="MSCI World"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
                {comparisonData.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        Tu Portfolio
                      </p>
                      <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                        {portfolioReturn >= 0 ? "+" : ""}
                        {portfolioReturn.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        S&P 500
                      </p>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {sp500Return >= 0 ? "+" : ""}
                        {sp500Return.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        MSCI World
                      </p>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100">
                        {msciWorldReturn >= 0 ? "+" : ""}
                        {msciWorldReturn.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {chartData.length < 5 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            💡 Sincroniza más veces para ver tendencias más claras
          </p>
        )}
      </CardContent>
    </Card>
  );
}
