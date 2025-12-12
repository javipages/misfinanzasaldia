import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Euro,
  Percent,
  ExternalLink,
  DollarSign,
  FileSpreadsheet,
  Wallet,
} from "lucide-react";
import { useHoldings } from "@/hooks/use-holdings";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MyInvestorImportDialog } from "@/components/ui/myinvestor-import-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ContentCardSkeleton,
  PageHeaderSkeleton,
  SummaryCardsSkeleton,
  TableSkeleton,
} from "@/components/PageSkeletons";

const Investments = () => {
  const [myInvestorDialogOpen, setMyInvestorDialogOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "EUR">(
    () =>
      (localStorage.getItem("investments_display_currency") as "USD" | "EUR") || "EUR"
  );

  // Get exchange rate for USD to EUR conversion
  const { rate: exchangeRate } = useExchangeRate("USD", "EUR");

  const {
    holdings,
    cashTotals,
    isLoading,
    deleteHolding,
  } = useHoldings(sourceFilter !== "all" ? { source: sourceFilter } : undefined);

  // Check if user has IBKR configured
  const { data: hasIbkrConfig } = useQuery({
    queryKey: ["ibkr_config_exists"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ibkr_config")
        .select("id")
        .limit(1)
        .maybeSingle();
      return !!data;
    },
  });

  const handleCurrencyChange = (currency: "USD" | "EUR") => {
    setDisplayCurrency(currency);
    localStorage.setItem("investments_display_currency", currency);
  };

  const handleDeleteHolding = async (id: string) => {
    try {
      await deleteHolding.mutateAsync(id);
    } catch (error) {
      console.error("Error deleting holding:", error);
    }
  };

  const getAssetTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      etf: { label: "ETF", color: "bg-blue-100 text-blue-800" },
      stock: { label: "Acciones", color: "bg-green-100 text-green-800" },
      fund: { label: "Fondos", color: "bg-purple-100 text-purple-800" },
      crypto: { label: "Crypto", color: "bg-orange-100 text-orange-800" },
      bond: { label: "Bonos", color: "bg-indigo-100 text-indigo-800" },
      other: { label: "Otros", color: "bg-gray-100 text-gray-800" },
    };
    return configs[type] || configs.other;
  };

  const getSourceConfig = (source: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      ibkr: { label: "IBKR", color: "bg-blue-50 text-blue-700 border-blue-300" },
      myinvestor: { label: "MyInvestor", color: "bg-purple-50 text-purple-700 border-purple-300" },
      manual: { label: "Manual", color: "bg-gray-50 text-gray-700 border-gray-300" },
    };
    return configs[source] || configs.manual;
  };

  const formatCurrency = (amount: number, currency: string = "EUR") => {
    // Convert USD to display currency if needed
    let convertedAmount = amount;
    if (currency === "USD" && displayCurrency === "EUR" && exchangeRate) {
      convertedAmount = amount * exchangeRate;
    } else if (currency === "EUR" && displayCurrency === "USD" && exchangeRate) {
      convertedAmount = amount / exchangeRate;
    }

    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 2,
    }).format(convertedAmount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`;
  };

  // Calculate totals in display currency
  const calculateDisplayTotal = () => {
    let total = 0;
    for (const h of holdings) {
      let value = h.position_value;
      if (h.currency === "USD" && displayCurrency === "EUR" && exchangeRate) {
        value = value * exchangeRate;
      } else if (h.currency === "EUR" && displayCurrency === "USD" && exchangeRate) {
        value = value / exchangeRate;
      }
      total += value;
    }
    return total;
  };

  const calculateDisplayCost = () => {
    let total = 0;
    for (const h of holdings) {
      let cost = h.quantity * (h.cost_basis || 0);
      if (h.currency === "USD" && displayCurrency === "EUR" && exchangeRate) {
        cost = cost * exchangeRate;
      } else if (h.currency === "EUR" && displayCurrency === "USD" && exchangeRate) {
        cost = cost / exchangeRate;
      }
      total += cost;
    }
    return total;
  };

  // Calculate cash totals in display currency
  const calculateCashTotal = () => {
    let total = 0;
    const ibkrCash = cashTotals.ibkr || { EUR: 0, USD: 0 };
    
    if (displayCurrency === "EUR") {
      total = ibkrCash.EUR + (ibkrCash.USD * (exchangeRate || 1));
    } else {
      total = ibkrCash.USD + (ibkrCash.EUR / (exchangeRate || 1));
    }
    return total;
  };

  const totalValue = calculateDisplayTotal();
  const totalCost = calculateDisplayCost();
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalCash = calculateCashTotal();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton actions={1} />
        <SummaryCardsSkeleton count={5} />
        <ContentCardSkeleton headerWidth="w-56">
          <TableSkeleton
            columns={8}
            columnClassName="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8"
          />
        </ContentCardSkeleton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Inversiones</h1>
          <p className="text-muted-foreground">
            Portafolio unificado de todas tus inversiones
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setMyInvestorDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar MyInvestor
          </Button>
          {hasIbkrConfig && (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <a href="/ibkr" className="flex items-center gap-1">
                IBKR Detalles
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 gap-4 ${hasIbkrConfig ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalValue)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Valor Total
                </div>
              </div>
              {displayCurrency === "EUR" ? (
                <Euro className="h-8 w-8 text-muted-foreground" />
              ) : (
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalCost)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Coste Total
                </div>
              </div>
              {displayCurrency === "EUR" ? (
                <Euro className="h-8 w-8 text-muted-foreground" />
              ) : (
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div
                  className={`text-2xl font-bold ${
                    totalPnl >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Ganancia/Pérdida
                </div>
              </div>
              {totalPnl >= 0 ? (
                <TrendingUp className="h-8 w-8 text-success" />
              ) : (
                <TrendingDown className="h-8 w-8 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div
                  className={`text-2xl font-bold ${
                    totalPnlPercent >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatPercentage(totalPnlPercent)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Rentabilidad
                </div>
              </div>
              <Percent className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {hasIbkrConfig && (
          <Card className="shadow-card border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(totalCash)}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    Liquidez (IBKR)
                  </div>
                </div>
                <Wallet className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fuentes</SelectItem>
            <SelectItem value="ibkr">IBKR</SelectItem>
            <SelectItem value="myinvestor">MyInvestor</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={displayCurrency} onValueChange={handleCurrencyChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue>
              {displayCurrency === "USD" ? (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  USD
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Euro className="h-3 w-3" />
                  EUR
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                USD
              </div>
            </SelectItem>
            <SelectItem value="EUR">
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4" />
                EUR
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Holdings Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Portafolio
            <Badge variant="secondary">{holdings.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay inversiones. Importa desde MyInvestor o añade manualmente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-foreground">
                      Nombre
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Fuente
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Tipo
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Cantidad
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Precio
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Valor
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      G/P
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      %
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => {
                    const typeConfig = getAssetTypeConfig(holding.asset_type);
                    const sourceConfig = getSourceConfig(holding.source);
                    const isProfit = holding.unrealized_pnl >= 0;

                    return (
                      <tr
                        key={holding.id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <div className="font-medium text-foreground">
                            {holding.symbol || holding.name}
                          </div>
                          {holding.symbol && (
                            <div className="text-sm text-muted-foreground">
                              {holding.name}
                            </div>
                          )}
                          {holding.isin && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {holding.isin}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant="outline"
                            className={sourceConfig.color}
                          >
                            {sourceConfig.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-mono">
                          {holding.quantity.toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {formatCurrency(
                            holding.current_price || 0,
                            holding.currency
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {formatCurrency(holding.position_value, holding.currency)}
                        </td>
                        <td className="p-3 text-center">
                          <div
                            className={`font-bold ${
                              isProfit ? "text-success" : "text-destructive"
                            }`}
                          >
                            {isProfit ? "+" : ""}
                            {formatCurrency(holding.unrealized_pnl, holding.currency)}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={
                              isProfit
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {formatPercentage(holding.unrealized_pnl_percent)}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {holding.source === "manual" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Eliminar inversión
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Estás seguro de que quieres eliminar "
                                    {holding.name}"? Esta acción no se puede
                                    deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteHolding(holding.id)
                                    }
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MyInvestor Import Dialog */}
      <MyInvestorImportDialog
        open={myInvestorDialogOpen}
        onClose={() => setMyInvestorDialogOpen(false)}
      />
    </div>
  );
};

export default Investments;
