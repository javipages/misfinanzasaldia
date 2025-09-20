import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";

const Investments = () => {
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
  const investments = [
    {
      id: 1,
      month: 0,
      type: "entrada",
      amount: 1000,
      description: "Inversión inicial ETF Mundial",
    },
    {
      id: 2,
      month: 1,
      type: "entrada",
      amount: 500,
      description: "Aportación mensual",
    },
    {
      id: 3,
      month: 2,
      type: "entrada",
      amount: 500,
      description: "Aportación mensual",
    },
    {
      id: 4,
      month: 3,
      type: "retirada",
      amount: 200,
      description: "Retirada parcial",
    },
    {
      id: 5,
      month: 4,
      type: "entrada",
      amount: 750,
      description: "Aportación extra",
    },
    {
      id: 6,
      month: 5,
      type: "entrada",
      amount: 500,
      description: "Aportación mensual",
    },
  ];

  const tradingOperations = [
    {
      id: 1,
      month: 1,
      type: "compra",
      amount: 2000,
      description: "Acciones Apple",
    },
    {
      id: 2,
      month: 2,
      type: "venta",
      amount: 2200,
      description: "Venta Apple (+10%)",
    },
    {
      id: 3,
      month: 3,
      type: "compra",
      amount: 1500,
      description: "Acciones Tesla",
    },
    {
      id: 4,
      month: 4,
      type: "compra",
      amount: 1000,
      description: "Acciones Microsoft",
    },
    {
      id: 5,
      month: 5,
      type: "venta",
      amount: 1600,
      description: "Venta Tesla (+6.7%)",
    },
  ];

  const calculateMonthlyInvestment = (monthIndex: number) => {
    return investments
      .filter((inv) => inv.month === monthIndex)
      .reduce((sum, inv) => {
        return inv.type === "entrada" ? sum + inv.amount : sum - inv.amount;
      }, 0);
  };

  const calculateMonthlyTrading = (monthIndex: number) => {
    return tradingOperations
      .filter((op) => op.month === monthIndex)
      .reduce((sum, op) => {
        return op.type === "venta" ? sum + op.amount : sum - op.amount;
      }, 0);
  };

  const totalInvestments = investments.reduce((sum, inv) => {
    return inv.type === "entrada" ? sum + inv.amount : sum - inv.amount;
  }, 0);

  const totalTrading = tradingOperations.reduce((sum, op) => {
    return op.type === "venta" ? sum + op.amount : sum - op.amount;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Inversiones y Trading
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus inversiones a largo plazo y operaciones de trading
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-success hover:bg-success/90">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Inversión
          </Button>
          <Button className="bg-info hover:bg-info/90">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Operación
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investments Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Inversiones a Largo Plazo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-semibold text-foreground">
                      Mes
                    </th>
                    <th className="text-center p-2 font-semibold text-foreground">
                      Tipo
                    </th>
                    <th className="text-center p-2 font-semibold text-foreground">
                      Importe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month, monthIndex) => {
                    const monthlyTotal = calculateMonthlyInvestment(monthIndex);
                    const monthlyInvestments = investments.filter(
                      (inv) => inv.month === monthIndex
                    );

                    if (monthlyInvestments.length === 0) return null;

                    return monthlyInvestments.map((investment, idx) => (
                      <tr
                        key={investment.id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        {idx === 0 && (
                          <td
                            className="p-2 font-medium text-foreground"
                            rowSpan={monthlyInvestments.length}
                          >
                            {month}
                          </td>
                        )}
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              investment.type === "entrada"
                                ? "bg-success/20 text-success"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {investment.type === "entrada" ? (
                              <>
                                <ArrowUp className="inline h-3 w-3 mr-1" />
                                Entrada
                              </>
                            ) : (
                              <>
                                <ArrowDown className="inline h-3 w-3 mr-1" />
                                Retirada
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-2 text-center font-medium text-foreground">
                          €{investment.amount.toLocaleString()}
                        </td>
                      </tr>
                    ));
                  })}
                  <tr className="border-t-2 border-success/20 bg-muted/20">
                    <td className="p-2 font-bold text-success">TOTAL</td>
                    <td className="p-2"></td>
                    <td className="p-2 text-center font-bold text-success">
                      €{totalInvestments.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Trading Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-info" />
              Operaciones de Trading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-semibold text-foreground">
                      Mes
                    </th>
                    <th className="text-center p-2 font-semibold text-foreground">
                      Tipo
                    </th>
                    <th className="text-center p-2 font-semibold text-foreground">
                      Importe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month, monthIndex) => {
                    const monthlyOperations = tradingOperations.filter(
                      (op) => op.month === monthIndex
                    );

                    if (monthlyOperations.length === 0) return null;

                    return monthlyOperations.map((operation, idx) => (
                      <tr
                        key={operation.id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        {idx === 0 && (
                          <td
                            className="p-2 font-medium text-foreground"
                            rowSpan={monthlyOperations.length}
                          >
                            {month}
                          </td>
                        )}
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              operation.type === "compra"
                                ? "bg-warning/20 text-warning"
                                : "bg-info/20 text-info"
                            }`}
                          >
                            {operation.type === "compra" ? (
                              <>
                                <ArrowDown className="inline h-3 w-3 mr-1" />
                                Compra
                              </>
                            ) : (
                              <>
                                <ArrowUp className="inline h-3 w-3 mr-1" />
                                Venta
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-2 text-center font-medium text-foreground">
                          €{operation.amount.toLocaleString()}
                        </td>
                      </tr>
                    ));
                  })}
                  <tr className="border-t-2 border-info/20 bg-muted/20">
                    <td className="p-2 font-bold text-info">BALANCE</td>
                    <td className="p-2"></td>
                    <td className="p-2 text-center font-bold text-info">
                      €{totalTrading.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              €{totalInvestments.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Inversión neta total
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-info">
              €{totalTrading.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Balance trading</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              €{(totalInvestments + totalTrading).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Total actividad inversora
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Investments;
