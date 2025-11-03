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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IBKRPosition {
  id: string;
  symbol: string;
  description: string;
  conid: string;
  isin: string | null;
  quantity: number;
  current_price: number;
  cost_basis: number;
  position_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  asset_category: string;
  currency: string;
  exchange: string;
  last_sync_at: string;
}

const IBKR = () => {
  const [positions, setPositions] = useState<IBKRPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadPositions();
    loadConfig();
  }, []);

  const loadPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("ibkr_positions")
        .select("*")
        .order("symbol", { ascending: true });

      if (error) throw error;

      setPositions(data || []);
    } catch (error) {
      console.error("Error loading positions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const { data } = await supabase.from("ibkr_config").select("last_sync_at").single();

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
        await loadPositions();
        await loadConfig();
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

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString("es-ES", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Calculate totals
  const totalValue = positions.reduce((sum, pos) => sum + pos.position_value, 0);
  const totalPnl = positions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
  const totalCost = positions.reduce((sum, pos) => sum + pos.quantity * pos.cost_basis, 0);
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

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
          <h1 className="text-3xl font-bold text-foreground">Posiciones IBKR</h1>
          <p className="text-muted-foreground">
            {lastSync
              ? `Última sincronización: ${new Date(lastSync).toLocaleString("es-ES")}`
              : "No sincronizado"}
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} size="lg">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </div>

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
              <Button onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                Sincronizar Ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {positions.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(totalValue)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Total</div>
                  </div>
                  <Euro className="h-8 w-8 text-muted-foreground" />
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
                    <div className="text-sm text-muted-foreground">Costo Total</div>
                  </div>
                  <Euro className="h-8 w-8 text-muted-foreground" />
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
                    <div className="text-sm text-muted-foreground">P&L Total</div>
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
                      {totalPnlPercent >= 0 ? "+" : ""}
                      {formatNumber(totalPnlPercent, 1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Rentabilidad</div>
                  </div>
                  <Percent className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

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
                      <th className="text-left p-3 font-semibold">Descripción</th>
                      <th className="text-center p-3 font-semibold">Cantidad</th>
                      <th className="text-right p-3 font-semibold">Precio</th>
                      <th className="text-right p-3 font-semibold">Costo</th>
                      <th className="text-right p-3 font-semibold">Valor</th>
                      <th className="text-right p-3 font-semibold">P&L</th>
                      <th className="text-right p-3 font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => (
                      <tr key={pos.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3">
                          <div className="font-mono font-bold">{pos.symbol}</div>
                          <div className="text-xs text-muted-foreground">{pos.exchange}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{pos.description}</div>
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
                          {formatCurrency(pos.current_price, pos.currency)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(pos.cost_basis, pos.currency)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {formatCurrency(pos.position_value, pos.currency)}
                        </td>
                        <td className="p-3 text-right">
                          <div
                            className={`font-mono font-bold ${
                              pos.unrealized_pnl >= 0 ? "text-success" : "text-destructive"
                            }`}
                          >
                            {pos.unrealized_pnl >= 0 ? "+" : ""}
                            {formatCurrency(pos.unrealized_pnl, pos.currency)}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <Badge
                            className={
                              pos.unrealized_pnl_percent >= 0
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {pos.unrealized_pnl_percent >= 0 ? "+" : ""}
                            {formatNumber(pos.unrealized_pnl_percent, 1)}%
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
