import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, PiggyBank, Target, TrendingUp } from "lucide-react";

const Savings = () => {
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // Mock data
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const savingsData = [500, 750, 600, 850, 700, 900, 0, 0, 0, 0, 0, 0];

  const handleCellEdit = (monthIndex: number, value: string) => {
    console.log(`Update savings month ${monthIndex}, value: ${value}`);
    setEditingCell(null);
  };

  const calculateTotal = () => {
    return savingsData.reduce((sum, value) => sum + value, 0);
  };

  const calculateAverage = () => {
    const nonZeroValues = savingsData.filter((value) => value > 0);
    return nonZeroValues.length > 0
      ? nonZeroValues.reduce((sum, value) => sum + value, 0) /
          nonZeroValues.length
      : 0;
  };

  const getBestMonth = () => {
    const maxValue = Math.max(...savingsData);
    const monthIndex = savingsData.indexOf(maxValue);
    return { month: months[monthIndex], value: maxValue };
  };

  const savingsGoal = 10000; // Annual savings goal
  const currentProgress = (calculateTotal() / savingsGoal) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestión de Ahorro
          </h1>
          <p className="text-muted-foreground">
            Controla tu capacidad de ahorro mensual y anual
          </p>
        </div>
        <Button className="bg-success hover:bg-success/90">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Ahorro
        </Button>
      </div>

      {/* Savings Goal Progress */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objetivo de Ahorro 2024
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
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
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                €{calculateTotal().toLocaleString()} ahorrado
              </span>
              <span className="text-muted-foreground">
                €{savingsGoal.toLocaleString()} objetivo
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Savings Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Ahorro Mensual 2024</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {months.map((month) => (
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
                  {savingsData.map((value, monthIndex) => {
                    const cellKey = `savings-${monthIndex}`;
                    const isEditing = editingCell === cellKey;

                    return (
                      <td key={monthIndex} className="p-1 text-center">
                        {isEditing ? (
                          <Input
                            type="number"
                            defaultValue={value}
                            className="w-20 h-8 text-center"
                            autoFocus
                            onBlur={(e) =>
                              handleCellEdit(monthIndex, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleCellEdit(
                                  monthIndex,
                                  e.currentTarget.value
                                );
                              }
                              if (e.key === "Escape") {
                                setEditingCell(null);
                              }
                            }}
                          />
                        ) : (
                          <div
                            className="p-3 rounded cursor-pointer hover:bg-muted/50 text-success font-medium"
                            onClick={() => setEditingCell(cellKey)}
                          >
                            €{value.toLocaleString()}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center font-bold text-success text-lg">
                    €{calculateTotal().toLocaleString()}
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
          <CardContent className="p-4 flex items-center gap-3">
            <PiggyBank className="h-8 w-8 text-success" />
            <div>
              <div className="text-2xl font-bold text-success">
                €{calculateTotal().toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Total ahorrado
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-info" />
            <div>
              <div className="text-2xl font-bold text-info">
                €{Math.round(calculateAverage()).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Promedio mensual
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-primary">
                €{getBestMonth().value.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Mejor mes ({getBestMonth().month})
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
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
                    className="flex items-center justify-between p-2 rounded bg-muted/30"
                  >
                    <span className="text-sm text-muted-foreground">
                      {months[index]}
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Ahorro actual (6 meses)
                  </span>
                  <span className="font-medium">
                    €{calculateTotal().toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Proyección anual
                  </span>
                  <span className="font-medium text-info">
                    €
                    {(calculateAverage() * 12)
                      .toFixed(0)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Falta para objetivo
                  </span>
                  <span className="font-medium text-warning">
                    €{(savingsGoal - calculateTotal()).toLocaleString()}
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

export default Savings;
