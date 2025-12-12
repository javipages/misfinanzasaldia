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
  Pencil,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useHoldings, type Holding } from "@/hooks/use-holdings";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Investments = () => {
  const [myInvestorDialogOpen, setMyInvestorDialogOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "EUR">(
    () =>
      (localStorage.getItem("investments_display_currency") as "USD" | "EUR") || "EUR"
  );

  // Get exchange rate for USD to EUR conversion
  const { rate: exchangeRate } = useExchangeRate("USD", "EUR");

  const {
    holdings: allHoldings,
    cashTotals,
    isLoading,
    deleteHolding,
    updateHolding,
  } = useHoldings(sourceFilter !== "all" ? { source: sourceFilter } : undefined);

  // Sorting state
  type SortField = "name" | "source" | "asset_type" | "quantity" | "current_price" | "position_value" | "unrealized_pnl" | "unrealized_pnl_percent";
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Apply additional filters (asset type + search)
  const filteredHoldings = allHoldings.filter((h) => {
    if (assetTypeFilter !== "all" && h.asset_type !== assetTypeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = h.name?.toLowerCase().includes(query);
      const matchesSymbol = h.symbol?.toLowerCase().includes(query);
      const matchesIsin = h.isin?.toLowerCase().includes(query);
      if (!matchesName && !matchesSymbol && !matchesIsin) return false;
    }
    return true;
  });

  // Apply sorting
  const holdings = [...filteredHoldings].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;
    
    switch (sortField) {
      case "name":
        aVal = (a.symbol || a.name || "").toLowerCase();
        bVal = (b.symbol || b.name || "").toLowerCase();
        break;
      case "source":
        aVal = a.source;
        bVal = b.source;
        break;
      case "asset_type":
        aVal = a.asset_type;
        bVal = b.asset_type;
        break;
      case "quantity":
        aVal = a.quantity;
        bVal = b.quantity;
        break;
      case "current_price":
        aVal = a.current_price || 0;
        bVal = b.current_price || 0;
        break;
      case "position_value":
        aVal = a.position_value;
        bVal = b.position_value;
        break;
      case "unrealized_pnl":
        aVal = a.unrealized_pnl;
        bVal = b.unrealized_pnl;
        break;
      case "unrealized_pnl_percent":
        aVal = a.unrealized_pnl_percent;
        bVal = b.unrealized_pnl_percent;
        break;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Edit dialog state
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [editForm, setEditForm] = useState({
    cost_basis: "",
    current_price: "",
    quantity: "",
  });

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

  const handleEditClick = (holding: Holding) => {
    setEditingHolding(holding);
    setEditForm({
      cost_basis: holding.cost_basis?.toString() || "",
      current_price: holding.current_price?.toString() || "",
      quantity: holding.quantity.toString(),
    });
  };

  const handleEditSave = async () => {
    if (!editingHolding) return;
    try {
      await updateHolding.mutateAsync({
        id: editingHolding.id,
        input: {
          cost_basis: editForm.cost_basis ? parseFloat(editForm.cost_basis) : undefined,
          current_price: editForm.current_price ? parseFloat(editForm.current_price) : undefined,
          quantity: parseFloat(editForm.quantity),
        },
      });
      setEditingHolding(null);
    } catch (error) {
      console.error("Error updating holding:", error);
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
      binance: { label: "Binance", color: "bg-orange-50 text-orange-700 border-orange-300" },
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

      {/* Holdings Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Portafolio
                <Badge variant="secondary">{holdings.length}</Badge>
              </CardTitle>
              <Select value={displayCurrency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-[100px]">
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
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ibkr">IBKR</SelectItem>
                  <SelectItem value="myinvestor">MyInvestor</SelectItem>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="stock">Acciones</SelectItem>
                  <SelectItem value="fund">Fondos</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="bond">Bonos</SelectItem>
                  <SelectItem value="other">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditClick(holding)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
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
                          </div>
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

      {/* Edit Holding Dialog */}
      <Dialog open={!!editingHolding} onOpenChange={(open) => !open && setEditingHolding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Inversión</DialogTitle>
            <DialogDescription>
              {editingHolding?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Cantidad
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost_basis" className="text-right">
                Coste
              </Label>
              <Input
                id="cost_basis"
                type="number"
                step="0.01"
                value={editForm.cost_basis}
                onChange={(e) => setEditForm({ ...editForm, cost_basis: e.target.value })}
                className="col-span-3"
                placeholder="Precio de compra por unidad"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current_price" className="text-right">
                Precio Actual
              </Label>
              <Input
                id="current_price"
                type="number"
                step="0.01"
                value={editForm.current_price}
                onChange={(e) => setEditForm({ ...editForm, current_price: e.target.value })}
                className="col-span-3"
                placeholder="Precio actual por unidad"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHolding(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={updateHolding.isPending}>
              {updateHolding.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Investments;
