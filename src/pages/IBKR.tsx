import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Euro,
  Percent,
  Loader2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useIBKRHistory } from "@/hooks/use-ibkr-history";
import { IBKRCharts } from "@/components/IBKRCharts";
import { useHoldings } from "@/hooks/use-holdings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency as formatCurrencyUtil } from "@/utils/format";

const IBKR = () => {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "EUR">(
    () =>
      (localStorage.getItem("ibkr_display_currency") as "USD" | "EUR") || "EUR"
  );

  // Get IBKR positions from unified holdings
  const { holdings: positions, isLoading: loading } = useHoldings({ source: "ibkr" });

  // Get exchange rate (USD to selected currency)
  const { rate: exchangeRate, loading: rateLoading } = useExchangeRate(
    "USD",
    displayCurrency
  );

  // Load history for charts
  const { data: history = [], isLoading: historyLoading } = useIBKRHistory(30);

  // Check if user has sync history (only allow manual sync on first time)
  const hasHistory = history.length > 0;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from("ibkr_config")
        .select("last_sync_at")
        .single();

      if (data) {
        setLastSync(data.last_sync_at);
      }
    } catch (error) {
      // No config yet
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("sync-ibkr");

      if (error) throw error;

      if (data.success) {
        setMessage({
          type: "success",
          text: `✅ Sincronizado: ${data.created} nuevas, ${data.updated} actualizadas`,
        });
        await loadConfig();
        // positions will auto-refresh via react-query
      } else {
        throw new Error(data.error || "Error en sincronización");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Error al sincronizar",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCurrencyChange = (currency: "USD" | "EUR") => {
    setDisplayCurrency(currency);
    localStorage.setItem("ibkr_display_currency", currency);
  };

  const formatCurrency = (amount: number) => {
    // Data from IBKR is in USD
    // Convert to EUR only if EUR display is selected
    const convertedAmount = displayCurrency === "EUR" && exchangeRate
      ? amount * exchangeRate  // USD to EUR
      : amount;

    if (displayCurrency === "EUR") {
      return formatCurrencyUtil(convertedAmount);
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(convertedAmount);
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString("es-ES", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Get latest totals from sync history (already calculated in USD)
  const latestHistory = history.length > 0 ? history[0] : null;
  const totalValueUSD = latestHistory?.total_value_usd ?? 0;
  const totalCostUSD = latestHistory?.total_cost_usd ?? 0;
  const totalPnlUSD = latestHistory?.total_pnl_usd ?? 0;
  const cashEUR = latestHistory?.total_cash_eur ?? 0;
  const cashUSD = latestHistory?.total_cash_usd ?? 0;

  const totalPnlPercent = totalCostUSD > 0 ? (totalPnlUSD / totalCostUSD) * 100 : 0;

  // Convert to display currency (exchangeRate is USD -> EUR)
  const convertToDisplay = (usdAmount: number) => {
    if (displayCurrency === "EUR" && exchangeRate) {
      return usdAmount * exchangeRate; // USD to EUR
    }
    return usdAmount; // Keep as USD
  };

  const totalValue = convertToDisplay(totalValueUSD);
  const totalPnl = convertToDisplay(totalPnlUSD);
  const totalCost = convertToDisplay(totalCostUSD);
  
  // Calculate total cash in display currency
  const totalCashInDisplayCurrency = displayCurrency === "EUR" 
    ? cashEUR + (cashUSD * (exchangeRate || 1))
    : (cashEUR / (exchangeRate || 1)) + cashUSD;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              Posiciones IBKR
            </h1>
            {positions.length > 0 && (
              <Badge variant="secondary" className="text-base px-3 py-1">
                {positions.length}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {lastSync
              ? `Última sincronización: ${new Date(lastSync).toLocaleString(
                  "es-ES"
                )}`
              : "No sincronizado"}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Currency Selector */}
          <Select value={displayCurrency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue>
                {displayCurrency === "USD" ? (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    USD
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Euro className="h-4 w-4" />
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

          <Button
            onClick={handleSync}
            disabled={syncing || rateLoading || hasHistory}
            size="lg"
            variant={hasHistory ? "secondary" : "default"}
            title={
              hasHistory
                ? "Sincronización automática activa (cron job diario a las 5 AM)"
                : "Sincronizar manualmente por primera vez"
            }
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Sincronizando..." : hasHistory ? "Auto-Sync Activo" : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* Exchange Rate Info */}
      {displayCurrency === "EUR" && exchangeRate && !rateLoading && (
        <Alert className="border-blue-200 bg-blue-50/50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            💱 Tipo de cambio: <strong>1 USD = {exchangeRate.toFixed(4)} EUR</strong> (Banco Central Europeo, actualizado cada hora)
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-Sync Info */}
      {hasHistory && (
        <Alert className="border-green-200 bg-green-50/50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            🤖 Sincronización automática activa. Tus posiciones se actualizan cada día a las 5 AM mediante un cron job.
          </AlertDescription>
        </Alert>
      )}

      {/* Message */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* No positions */}
      {positions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay posiciones</h3>
            <p className="text-muted-foreground mb-4">
              Configura IBKR y sincroniza para ver tus posiciones aquí.
            </p>
            <div className="space-x-2">
              <Button variant="outline" asChild>
                <a href="/settings/ibkr">Configurar IBKR</a>
              </Button>
              {!hasHistory && (
                <Button onClick={handleSync} disabled={syncing}>
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                  />
                  Sincronizar Ahora
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {positions.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
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
                  {displayCurrency === "USD" ? (
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Euro className="h-8 w-8 text-muted-foreground" />
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
                  {displayCurrency === "USD" ? (
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Euro className="h-8 w-8 text-muted-foreground" />
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
                      {totalPnl >= 0 ? "+" : ""}
                      {formatCurrency(totalPnl)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      P&L Total
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
                        totalPnlPercent >= 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {totalPnlPercent >= 0 ? "+" : ""}
                      {formatNumber(totalPnlPercent, 1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Rentabilidad
                    </div>
                  </div>
                  <Percent className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: displayCurrency,
                        minimumFractionDigits: 2,
                      }).format(totalCashInDisplayCurrency)}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      Liquidez
                    </div>
                    {(cashEUR > 0 || cashUSD > 0) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {cashEUR > 0 && formatCurrencyUtil(cashEUR)}
                        {cashEUR > 0 && cashUSD > 0 && " + "}
                        {cashUSD > 0 && `$${formatNumber(cashUSD, 2)}`}
                      </div>
                    )}
                  </div>
                  <Wallet className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          {!historyLoading && history.length > 0 && (
            <IBKRCharts
              history={history}
              exchangeRate={exchangeRate}
              displayCurrency={displayCurrency}
            />
          )}

          {/* Positions Table */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Posiciones ({positions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold">Símbolo</th>
                      <th className="text-left p-3 font-semibold">
                        Descripción
                      </th>
                      <th className="text-center p-3 font-semibold">
                        Cantidad
                      </th>
                      <th className="text-right p-3 font-semibold">Precio</th>
                      <th className="text-right p-3 font-semibold">Coste</th>
                      <th className="text-right p-3 font-semibold">Valor</th>
                      <th className="text-right p-3 font-semibold">P&L</th>
                      <th className="text-right p-3 font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => (
                      <tr
                        key={pos.id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <div className="font-mono font-bold">
                            {pos.symbol}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pos.exchange}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{pos.name}</div>
                          {pos.isin && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {pos.isin}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {formatNumber(pos.quantity, 4)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(pos.current_price ?? 0)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(pos.cost_basis ?? 0)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {formatCurrency(pos.position_value ?? 0)}
                        </td>
                        <td className="p-3 text-right">
                          <div
                            className={`font-mono font-bold ${
                              (pos.unrealized_pnl ?? 0) >= 0
                                ? "text-success"
                                : "text-destructive"
                            }`}
                          >
                            {(pos.unrealized_pnl ?? 0) >= 0 ? "+" : ""}
                            {formatCurrency(pos.unrealized_pnl ?? 0)}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <Badge
                            className={
                              (pos.unrealized_pnl_percent ?? 0) >= 0
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {(pos.unrealized_pnl_percent ?? 0) >= 0 ? "+" : ""}
                            {formatNumber(pos.unrealized_pnl_percent ?? 0, 1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default IBKR;
