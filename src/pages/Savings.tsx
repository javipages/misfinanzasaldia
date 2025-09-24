import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, PiggyBank, Target, TrendingUp } from "lucide-react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useYearStore } from "@/store/year";
import { useGoals } from "@/hooks/use-goals";
import { useNavigate } from "react-router-dom";
import { MONTHS } from "@/utils/constants";

const Savings = () => {
  const year = useYearStore((s) => s.year);
  const navigate = useNavigate();
  const { monthlyData, totalAhorro, isLoading } = useDashboardData();
  const { goals } = useGoals();

  // Months for headers

  // Savings computed from dashboard data (ingresos - gastos)
  const savingsData = useMemo(() => {
    if (isLoading || !monthlyData?.length) return Array(12).fill(0);
    // monthlyData already in order Ene..Dic with ahorro
    return monthlyData.map((m) => Number(m.ahorro) || 0);
  }, [monthlyData, isLoading]);

  const calculateTotal = useMemo(() => {
    return Number(totalAhorro) || 0;
  }, [totalAhorro]);

  const calculateAverage = useMemo(() => {
    const nonZeroValues = savingsData.filter((value: number) => value !== 0);
    if (!nonZeroValues.length) return 0;
    const sum = nonZeroValues.reduce((acc: number, v: number) => acc + v, 0);
    return sum / nonZeroValues.length;
  }, [savingsData]);

  const getBestMonth = useMemo(() => {
    const maxValue = Math.max(...savingsData);
    const monthIndex = savingsData.indexOf(maxValue);
    return { month: MONTHS[monthIndex] ?? "-", value: maxValue };
  }, [savingsData]);

  const savingsGoalEntry = useMemo(
    () => goals.find((g) => g.category === "annual_savings"),
    [goals]
  );
  const savingsGoal = savingsGoalEntry?.target_amount ?? null;
  const currentProgress = savingsGoal
    ? (calculateTotal / savingsGoal) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">
            Gestión de Ahorro
          </h1>
          <p className="text-muted-foreground">
            Controla tu capacidad de ahorro mensual y anual
          </p>
        </div>
        <Button className="bg-success hover:bg-success/90 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Ahorro
        </Button>
      </div>

      {/* Savings Goal Progress (only if goal exists) */}
      {savingsGoal ? (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {savingsGoalEntry?.name || `Objetivo de Ahorro ${year}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  Progreso del objetivo anual
                </span>
                <span className="text-sm font-medium">
                  {currentProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-success to-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(currentProgress, 100)}%` }}
                ></div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  €{calculateTotal.toLocaleString()} ahorrado
                </span>
                <span className="text-muted-foreground">
                  €{savingsGoal.toLocaleString()} objetivo
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Aún no tienes un objetivo de ahorro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                Establece un objetivo para medir tu progreso
              </span>
              <Button
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                onClick={() => navigate("/goals")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Establecer objetivo de ahorro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Savings Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Ahorro Mensual {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {MONTHS.map((month) => (
                    <th
                      key={month}
                      className="text-center p-3 font-semibold text-foreground min-w-[100px]"
                    >
                      {month}
                    </th>
                  ))}
                  <th className="text-center p-3 font-semibold text-success min-w-[120px]">
                    Total Año
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50 hover:bg-muted/30">
                  {savingsData.map((value, monthIndex) => (
                    <td key={monthIndex} className="p-1 text-center">
                      <div className="p-3 rounded text-success font-medium">
                        €{value.toLocaleString()}
                      </div>
                    </td>
                  ))}
                  <td className="p-3 text-center font-bold text-success text-lg">
                    €{calculateTotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Savings Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <PiggyBank className="h-8 w-8 text-success" />
            <div>
              <div className="text-2xl font-bold text-success">
                €{calculateTotal.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Total ahorrado
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <TrendingUp className="h-8 w-8 text-info" />
            <div>
              <div className="text-2xl font-bold text-info">
                €{Math.round(calculateAverage).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Promedio mensual
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-primary">
                €{getBestMonth.value.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Mejor mes ({getBestMonth.month})
              </div>
            </div>
          </CardContent>
        </Card>
        {savingsGoal ? (
          <Card className="shadow-card">
            <CardContent className="p-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center">
                <span className="text-warning font-bold">%</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">
                  {currentProgress.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Objetivo cumplido
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => navigate("/goals")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Establecer objetivo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Savings Analysis */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Análisis de Capacidad de Ahorro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">
                Tendencia Mensual
              </h3>
              <div className="space-y-2">
                {savingsData.slice(0, 6).map((value, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-2 rounded bg-muted/30 p-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {MONTHS[index]}
                    </span>
                    <span className="font-medium text-success">
                      €{value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">
                Proyección Anual
              </h3>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    Ahorro actual
                  </span>
                  <span className="font-medium">
                    €{calculateTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    Proyección anual
                  </span>
                  <span className="font-medium text-info">
                    €
                    {(Math.max(0, calculateAverage) * 12)
                      .toFixed(0)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  </span>
                </div>
                {savingsGoal && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      Falta para objetivo
                    </span>
                    <span className="font-medium text-warning">
                      €{(savingsGoal - calculateTotal).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Savings;
