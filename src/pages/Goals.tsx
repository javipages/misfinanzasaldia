import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Target,
  TrendingUp,
  DollarSign,
  PiggyBank,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const Goals = () => {
  const [newGoal, setNewGoal] = useState({
    type: "",
    amount: "",
    description: "",
  });

  // Mock data for goals
  const goals = [
    {
      id: 1,
      type: "ingreso_total",
      target: 45000,
      current: 21940,
      description: "Objetivo de ingresos anuales",
      icon: TrendingUp,
      color: "success",
    },
    {
      id: 2,
      type: "ahorro_total",
      target: 10000,
      current: 4300,
      description: "Meta de ahorro para el año",
      icon: PiggyBank,
      color: "info",
    },
    {
      id: 3,
      type: "patrimonio_final",
      target: 80000,
      current: 69100,
      description: "Patrimonio objetivo fin de año",
      icon: DollarSign,
      color: "primary",
    },
    {
      id: 4,
      type: "gasto_categoria",
      target: 3000,
      current: 1800,
      description: "Límite anual gastos ocio",
      icon: AlertCircle,
      color: "warning",
      category: "Ocio",
    },
  ];

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "text-success";
    if (percentage >= 75) return "text-primary";
    if (percentage >= 50) return "text-info";
    return "text-warning";
  };

  const getStatusIcon = (percentage: number) => {
    return percentage >= 100 ? CheckCircle2 : Target;
  };

  const formatGoalType = (type: string) => {
    switch (type) {
      case "ingreso_total":
        return "Ingresos Totales";
      case "ahorro_total":
        return "Ahorro Total";
      case "patrimonio_final":
        return "Patrimonio Final";
      case "gasto_categoria":
        return "Límite de Gasto";
      default:
        return type;
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case "success":
        return "text-success";
      case "info":
        return "text-info";
      case "primary":
        return "text-primary";
      case "warning":
        return "text-warning";
      default:
        return "text-foreground";
    }
  };

  const getBgColorClass = (color: string) => {
    switch (color) {
      case "success":
        return "from-success to-success/80";
      case "info":
        return "from-info to-info/80";
      case "primary":
        return "from-primary to-primary/80";
      case "warning":
        return "from-warning to-warning/80";
      default:
        return "from-muted to-muted/80";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Objetivos Financieros
          </h1>
          <p className="text-muted-foreground">
            Define y sigue el progreso de tus metas financieras
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Objetivo
        </Button>
      </div>

      {/* Goals Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {goals.map((goal) => {
          const percentage = getProgressPercentage(goal.current, goal.target);
          const IconComponent = goal.icon;
          const StatusIcon = getStatusIcon(percentage);

          return (
            <Card key={goal.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <IconComponent
                    className={`h-6 w-6 ${getColorClass(goal.color)}`}
                  />
                  <StatusIcon
                    className={`h-5 w-5 ${getStatusColor(percentage)}`}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-foreground">
                    {formatGoalType(goal.type)}
                    {goal.category && ` - ${goal.category}`}
                  </h3>
                  <div className="text-2xl font-bold text-foreground">
                    {percentage.toFixed(0)}%
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${getBgColorClass(
                        goal.color
                      )} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>€{goal.current.toLocaleString()}</span>
                    <span>€{goal.target.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Goals Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Detalle de Objetivos 2024</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-semibold text-foreground">
                    Objetivo
                  </th>
                  <th className="text-center p-3 font-semibold text-foreground">
                    Meta
                  </th>
                  <th className="text-center p-3 font-semibold text-foreground">
                    Actual
                  </th>
                  <th className="text-center p-3 font-semibold text-foreground">
                    Progreso
                  </th>
                  <th className="text-center p-3 font-semibold text-foreground">
                    Restante
                  </th>
                  <th className="text-center p-3 font-semibold text-foreground">
                    Estado
                  </th>
                  <th className="text-center p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => {
                  const percentage = getProgressPercentage(
                    goal.current,
                    goal.target
                  );
                  const remaining = goal.target - goal.current;
                  const IconComponent = goal.icon;

                  return (
                    <tr
                      key={goal.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <IconComponent
                            className={`h-5 w-5 ${getColorClass(goal.color)}`}
                          />
                          <div>
                            <div className="font-medium text-foreground">
                              {formatGoalType(goal.type)}
                              {goal.category && ` - ${goal.category}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {goal.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center font-semibold text-foreground">
                        €{goal.target.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-medium text-foreground">
                        €{goal.current.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className={`bg-gradient-to-r ${getBgColorClass(
                                goal.color
                              )} h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span
                            className={`text-sm font-medium ${getStatusColor(
                              percentage
                            )}`}
                          >
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-medium">
                        <span
                          className={
                            remaining > 0 ? "text-warning" : "text-success"
                          }
                        >
                          €{Math.abs(remaining).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            percentage >= 100
                              ? "bg-success/20 text-success"
                              : percentage >= 75
                              ? "bg-primary/20 text-primary"
                              : percentage >= 50
                              ? "bg-info/20 text-info"
                              : "bg-warning/20 text-warning"
                          }`}
                        >
                          {percentage >= 100
                            ? "Completado"
                            : percentage >= 75
                            ? "Casi logrado"
                            : percentage >= 50
                            ? "En progreso"
                            : "Iniciando"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm">
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Projection */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Proyección Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">
                Para cumplir objetivos restantes necesitas:
              </h3>
              <div className="space-y-3">
                {goals
                  .filter(
                    (goal) =>
                      getProgressPercentage(goal.current, goal.target) < 100
                  )
                  .map((goal) => {
                    const remaining = goal.target - goal.current;
                    const monthsLeft = 6; // Remaining months in year
                    const monthlyNeeded = remaining / monthsLeft;

                    return (
                      <div
                        key={goal.id}
                        className="flex items-center justify-between p-3 rounded bg-muted/30"
                      >
                        <span className="text-sm text-foreground">
                          {formatGoalType(goal.type)}
                          {goal.category && ` - ${goal.category}`}
                        </span>
                        <span className="font-medium text-warning">
                          €
                          {monthlyNeeded
                            .toFixed(0)
                            .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          /mes
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">
                Resumen de Progreso
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Objetivos completados
                  </span>
                  <span className="font-medium text-success">
                    {
                      goals.filter(
                        (goal) =>
                          getProgressPercentage(goal.current, goal.target) >=
                          100
                      ).length
                    }{" "}
                    / {goals.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Progreso promedio
                  </span>
                  <span className="font-medium text-info">
                    {(
                      goals.reduce(
                        (sum, goal) =>
                          sum +
                          getProgressPercentage(goal.current, goal.target),
                        0
                      ) / goals.length
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Objetivos en riesgo
                  </span>
                  <span className="font-medium text-warning">
                    {
                      goals.filter(
                        (goal) =>
                          getProgressPercentage(goal.current, goal.target) < 50
                      ).length
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Goals;
