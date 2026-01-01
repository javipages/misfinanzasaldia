import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  useDashboardData,
  useDashboardMetrics,
} from "@/hooks/use-dashboard-data";
import { useUserStore } from "@/store/user";
import { MonthlyOverviewChart } from "@/components/dashboard/MonthlyOverviewChart";
import { ExpenseDistributionChart } from "@/components/dashboard/ExpenseDistributionChart";
import { IncomeFlowSankey } from "@/components/dashboard/IncomeFlowSankey";
import { PatrimonyEvolutionChart } from "@/components/dashboard/PatrimonyEvolutionChart";
import { FinancialSummary } from "@/components/dashboard/FinancialSummary";
import { formatCurrency } from "@/utils/format";

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(
    undefined
  );
  const year = useUserStore((s) => s.year);

  const data = useDashboardData(selectedMonth);
  const metrics = useDashboardMetrics(selectedMonth);

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

  if (data.isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-full sm:w-32" />
            <Skeleton className="h-10 w-full sm:w-48" />
            <Skeleton className="h-10 w-full sm:w-24" />
          </div>
        </div>

        {/* Metrics cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
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
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Select
            value={selectedMonth?.toString() || "undefined"}
            onValueChange={(value) =>
              setSelectedMonth(
                value === "undefined" ? undefined : Number(value)
              )
            }
          >
            <SelectTrigger className="w-full sm:w-44">
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
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <MetricCard
          title="Total Ingresos"
          value={formatCurrency(metrics.totalIngresos)}
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Gastos"
          value={formatCurrency(metrics.totalGastos)}
          icon={TrendingDown}
        />
        <MetricCard
          title="Ahorro Neto"
          value={formatCurrency(metrics.totalAhorro)}
          icon={Target}
        />
        <MetricCard
          title="Patrimonio Total"
          value={formatCurrency(metrics.currentPatrimony)}
          icon={Wallet}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <MonthlyOverviewChart
          data={data.monthlyData}
          selectedMonth={selectedMonth}
          year={year}
        />

        <ExpenseDistributionChart
          categories={data.expenseCategories}
          selectedMonth={selectedMonth}
          year={year}
        />

        <IncomeFlowSankey
          monthlyData={data.monthlyData}
          incomeCategories={data.incomeCategories}
          expenseCategories={data.expenseCategories}
          totalIngresos={metrics.totalIngresos}
          totalGastos={metrics.totalGastos}
          selectedMonth={selectedMonth}
          isLoading={data.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <PatrimonyEvolutionChart
          data={data.monthlyData}
          selectedMonth={selectedMonth}
          year={year}
        />

        <FinancialSummary
          monthlyData={data.monthlyData}
          totalIngresos={metrics.totalIngresos}
          totalGastos={metrics.totalGastos}
          totalAhorro={metrics.totalAhorro}
          selectedMonth={selectedMonth}
        />
      </div>
    </div>
  );
};

export default Dashboard;
