import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, Target, Filter } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import {
  useDashboardData,
  useDashboardMetrics,
} from "@/hooks/use-dashboard-data";
import { useYearStore } from "@/store/year";

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(
    undefined
  );
  const [showPreviousYear, setShowPreviousYear] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const year = useYearStore((s) => s.year);

  const data = useDashboardData(selectedMonth);
  const metrics = useDashboardMetrics(selectedMonth);

  const months = [
    { value: undefined, label: "Todo el año" },
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ];

  // Chart configurations
  const chartConfig = {
    ingresos: {
      label: "Ingresos",
      color: "#22c55e", // Verde para ingresos positivos
    },
    gastos: {
      label: "Gastos",
      color: "#ef4444", // Rojo para gastos negativos
    },
    prevIngresos: {
      label: "Ingresos Año Anterior",
      color: "#16a34a", // Verde oscuro para comparación
    },
    prevGastos: {
      label: "Gastos Año Anterior",
      color: "#dc2626", // Rojo oscuro para comparación
    },
    patrimonio: {
      label: "Patrimonio",
      color: "#3b82f6", // Azul para patrimonio
    },
  } satisfies ChartConfig;

  const formatChange = (change: number) => {
    const isPositive = change > 0;
    const isNegative = change < 0;
    const absChange = Math.abs(change);

    if (change === 0) return "Sin cambios";

    return `${isPositive ? "+" : isNegative ? "" : ""}${absChange.toFixed(1)}%`;
  };

  if (data.isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Metrics cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Overview skeleton */}
          <Card className="shadow-card">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>

          {/* Expense Distribution skeleton */}
          <Card className="shadow-card">
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded-full" />
            </CardContent>
          </Card>
        </div>

        {/* Bottom section skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Dashboard Financiero
          </h1>
          <p className="text-muted-foreground">
            Resumen de tu situación financiera {year}
            {selectedMonth && (
              <Badge variant="secondary" className="ml-2">
                {months.find((m) => m.value === selectedMonth)?.label}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedMonth?.toString() || "undefined"}
            onValueChange={(value) =>
              setSelectedMonth(
                value === "undefined" ? undefined : Number(value)
              )
            }
          >
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem
                  key={month.value || "all"}
                  value={month.value?.toString() || "undefined"}
                >
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showPreviousYear ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPreviousYear(!showPreviousYear)}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {showPreviousYear ? "Ocultar" : "Comparar"} Año Anterior
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Ingresos"
          value={`€${metrics.totalIngresos.toLocaleString()}`}
          change={`${formatChange(metrics.ingresosChange)} vs mes anterior`}
          icon={TrendingUp}
          variant={metrics.ingresosChange >= 0 ? "success" : "warning"}
        />
        <MetricCard
          title="Total Gastos"
          value={`€${metrics.totalGastos.toLocaleString()}`}
          change={`${formatChange(metrics.gastosChange)} vs mes anterior`}
          icon={TrendingDown}
          variant={metrics.gastosChange <= 0 ? "success" : "warning"}
        />
        <MetricCard
          title="Ahorro Neto"
          value={`€${metrics.totalAhorro.toLocaleString()}`}
          change={`${formatChange(metrics.ahorroChange)} vs mes anterior`}
          icon={Target}
          variant={metrics.ahorroChange >= 0 ? "success" : "warning"}
        />
        <MetricCard
          title="Patrimonio Total"
          value={`€${metrics.currentPatrimony.toLocaleString()}`}
          change={`${formatChange(metrics.patrimonioChange)} vs mes anterior`}
          icon={Wallet}
          variant={metrics.patrimonioChange >= 0 ? "success" : "warning"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Overview with Comparison */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>
              {selectedMonth
                ? `Resumen de ${
                    months.find((m) => m.value === selectedMonth)?.label
                  }`
                : `Resumen Mensual ${year}`}
            </CardTitle>
            {!selectedMonth && showPreviousYear && (
              <p className="text-sm text-muted-foreground">
                Comparación con {year - 1}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ComposedChart data={data.monthlyData}>
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
                        return `${label}: €${Number(value).toLocaleString()}`;
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="ingresos"
                  fill="var(--color-ingresos)"
                  name="Ingresos"
                />
                <Bar
                  dataKey="gastos"
                  fill="var(--color-gastos)"
                  name="Gastos"
                />
                {!selectedMonth && showPreviousYear && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="prevIngresos"
                      stroke="var(--color-prevIngresos)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Ingresos Año Anterior"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="prevGastos"
                      stroke="var(--color-prevGastos)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Gastos Año Anterior"
                      dot={false}
                    />
                  </>
                )}
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expense Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedMonth
                ? `Mes de ${
                    months.find((m) => m.value === selectedMonth)?.label
                  }`
                : `Total del año ${year}`}
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.expenseCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.expenseCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    `Gasto: €${Number(value).toLocaleString()}`
                  }
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow:
                      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                    color: "hsl(var(--foreground))",
                    fontSize: "14px",
                    padding: "8px 12px",
                    zIndex: 1000,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {(showAllCategories
                ? data.expenseCategories
                : data.expenseCategories.slice(0, 5)
              ).map((category, index) => (
                <div key={index} className="flex items-center justify-between">
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
                    €{category.value.toLocaleString()}
                  </span>
                </div>
              ))}
              {data.expenseCategories.length > 5 && (
                <div className="text-center pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showAllCategories
                      ? `Ocultar ${
                          data.expenseCategories.length - 5
                        } categorías`
                      : `Ver +${
                          data.expenseCategories.length - 5
                        } categorías más`}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Patrimony Evolution and Financial Summary */}

        {/* Year Comparison */}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Evolución del Patrimonio</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedMonth
                  ? `Hasta ${
                      months.find((m) => m.value === selectedMonth)?.label
                    }`
                  : `Evolución mensual ${year}`}
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  patrimonio: {
                    label: "Patrimonio",
                    color: "hsl(var(--chart-1))",
                  },
                }}
              >
                <LineChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          `Patrimonio: €${Number(value).toLocaleString()}`
                        }
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="patrimonio"
                    stroke="var(--color-patrimonio)"
                    strokeWidth={3}
                    dot={{
                      fill: "var(--color-patrimonio)",
                      strokeWidth: 2,
                      r: 4,
                    }}
                    name="Patrimonio"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Resumen Financiero</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Tasa de Ahorro
                  </span>
                  <span className="font-medium">
                    {metrics.totalIngresos > 0
                      ? (
                          (metrics.totalAhorro / metrics.totalIngresos) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Gastos/Ingresos
                  </span>
                  <span className="font-medium">
                    {metrics.totalIngresos > 0
                      ? (
                          (metrics.totalGastos / metrics.totalIngresos) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Mes con más ahorro
                  </span>
                  <span className="font-medium">
                    {data.monthlyData.reduce((max, current, index) => {
                      const maxAhorro = data.monthlyData[max]?.ahorro || 0;
                      const currentAhorro = current.ahorro;
                      return currentAhorro > maxAhorro ? index : max;
                    }, 0) !== -1
                      ? data.monthlyData.reduce((max, current, index) => {
                          const maxAhorro = data.monthlyData[max]?.ahorro || 0;
                          const currentAhorro = current.ahorro;
                          return currentAhorro > maxAhorro ? index : max;
                        }, 0) + 1
                      : "N/A"}
                    º mes
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Promedio mensual
                  </span>
                  <span className="font-medium">
                    €
                    {(
                      metrics.totalIngresos / (selectedMonth ? 1 : 12)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
