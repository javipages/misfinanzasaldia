import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  GripVertical,
  Calendar,
  Euro,
  Percent,
  ExternalLink,
} from "lucide-react";
import { useInvestments, type InvestmentItem } from "@/hooks/use-investments";
import { supabase } from "@/integrations/supabase/client";
import { AddInvestmentDialog } from "@/components/ui/add-investment-dialog";
import { InvestmentSelectionDialog } from "@/components/ui/investment-selection-dialog";
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
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ContentCardSkeleton,
  PageHeaderSkeleton,
  SummaryCardsSkeleton,
  TableSkeleton,
} from "@/components/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

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

const Investments = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<
    InvestmentItem | undefined
  >(undefined);
  const [ibkrPositions, setIbkrPositions] = useState<IBKRPosition[]>([]);
  const [loadingIbkr, setLoadingIbkr] = useState(true);

  const {
    investments,
    accounts,
    monthlySummary,
    swapOrder,
    deleteInvestment,
    addInvestment,
    updateInvestment,
    addInvestmentValue,
    isLoading,
  } = useInvestments();

  // Load IBKR positions
  useEffect(() => {
    const loadIBKRPositions = async () => {
      try {
        const { data, error } = await supabase
          .from("ibkr_positions")
          .select("*")
          .order("symbol", { ascending: true });

        if (error) throw error;
        setIbkrPositions(data as IBKRPosition[]);
      } catch (error) {
        console.error("Error loading IBKR positions:", error);
      } finally {
        setLoadingIbkr(false);
      }
    };

    loadIBKRPositions();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = investments;
    const fromIdx = current.findIndex((r) => r.id === active.id);
    const toIdx = current.findIndex((r) => r.id === over.id);
    if (fromIdx < 0 || toIdx < 0) return;
    const a = current[fromIdx];
    const b = current[toIdx];
    void swapOrder.mutateAsync({
      aId: a.id,
      aOrder: a.display_order,
      bId: b.id,
      bOrder: b.display_order,
    });
  }

  function RowHandle({ id }: { id: string }) {
    const { attributes, listeners } = useSortable({ id });
    return (
      <button
        aria-label="Mover"
        className="cursor-grab px-2 hover:bg-muted/50 rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  function SortableRow({
    id,
    children,
  }: {
    id: string;
    children: React.ReactNode;
  }) {
    const { setNodeRef, transform, transition, isDragging } = useSortable({
      id,
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    };
    return (
      <tr
        ref={setNodeRef}
        style={style}
        id={id}
        className="border-b border-border/50 hover:bg-muted/30"
      >
        {children}
      </tr>
    );
  }

  const handleAddInvestment = () => {
    setEditingInvestment(undefined);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingInvestment(undefined);
  };

  const handleEditInvestment = () => {
    setSelectionDialogOpen(true);
  };

  const handleSelectInvestment = (investment: InvestmentItem) => {
    setEditingInvestment(investment);
    setSelectionDialogOpen(false);
    setDialogOpen(true);
  };

  const handleCloseSelectionDialog = () => {
    setSelectionDialogOpen(false);
  };

  const handleDeleteInvestment = async (id: string) => {
    try {
      await deleteInvestment.mutateAsync(id);
    } catch (error) {
      console.error("Error deleting investment:", error);
    }
  };

  const handleDialogSubmit = async (investmentData: {
    name: string;
    type: "etf" | "acciones" | "crypto" | "fondos" | "bonos" | "otros";
    initial_amount: number;
    account_id: string;
    purchase_date: string;
    description?: string;
  }) => {
    try {
      if (editingInvestment) {
        // Update existing investment
        await updateInvestment.mutateAsync({
          id: editingInvestment.id,
          input: {
            name: investmentData.name,
            type: investmentData.type,
            initial_amount: investmentData.initial_amount,
            account_id: investmentData.account_id,
            purchase_date: investmentData.purchase_date,
            description: investmentData.description,
          },
        });
      } else {
        // Create new investment
        await addInvestment.mutateAsync(investmentData);
      }
      // Close dialog and reset state
      setDialogOpen(false);
      setEditingInvestment(undefined);
    } catch (error) {
      console.error("Error saving investment:", error);
    }
  };

  const handleAddToExisting = async (
    existingInvestmentId: string,
    amount: number,
    date: string,
    description?: string
  ) => {
    try {
      await addInvestmentValue.mutateAsync({
        investmentId: existingInvestmentId,
        amount,
        contributionDate: date,
        description,
      });
      // Close dialog and reset state
      setDialogOpen(false);
    } catch (error) {
      console.error("Error adding to investment:", error);
    }
  };

  const getTypeConfig = (type: string) => {
    const configs = {
      etf: { label: "ETF", color: "bg-blue-100 text-blue-800" },
      acciones: { label: "Acciones", color: "bg-green-100 text-green-800" },
      crypto: { label: "Crypto", color: "bg-orange-100 text-orange-800" },
      fondos: { label: "Fondos", color: "bg-purple-100 text-purple-800" },
      bonos: { label: "Bonos", color: "bg-indigo-100 text-indigo-800" },
      otros: { label: "Otros", color: "bg-gray-100 text-gray-800" },
    };
    return configs[type as keyof typeof configs] || configs.otros;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`;
  };

  // Prepare existing investments data for the dialog
  const existingInvestmentsData = investments
    .filter((investment) => investment.total_invested_amount > 0) // Only show investments that have contributions
    .map((investment) => ({
      id: investment.id,
      name: investment.name,
      account_name: investment.account_name,
      total_amount: investment.total_invested_amount,
    }));

  // Calculate totals using current investment amounts
  const manualInvested = investments.reduce(
    (sum, inv) => sum + inv.total_invested_amount,
    0
  );
  const manualCurrentValue = investments.reduce(
    (sum, inv) => sum + inv.current_account_value,
    0
  );

  // Calculate IBKR totals
  const ibkrInvested = ibkrPositions.reduce(
    (sum, pos) => sum + pos.quantity * pos.cost_basis,
    0
  );
  const ibkrCurrentValue = ibkrPositions.reduce(
    (sum, pos) => sum + pos.position_value,
    0
  );

  // Combined totals
  const totalInvested = manualInvested + ibkrInvested;
  const totalCurrentValue = manualCurrentValue + ibkrCurrentValue;
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPercentage =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton actions={1} />
        <SummaryCardsSkeleton count={4} />
        <ContentCardSkeleton headerWidth="w-56">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
            <TableSkeleton
              columns={8}
              columnClassName="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8"
            />
          </div>
        </ContentCardSkeleton>
        <ContentCardSkeleton headerWidth="w-64">
          <TableSkeleton
            columns={4}
            columnClassName="grid grid-cols-2 gap-3 md:grid-cols-4"
          />
        </ContentCardSkeleton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Inversiones</h1>
          <p className="text-muted-foreground">
            Gestiona tu portafolio de inversiones y trackea tus ganancias
          </p>
        </div>
        <Button onClick={handleAddInvestment} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Inversión
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalInvested)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total invertido actual
                </div>
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
                  {formatCurrency(totalCurrentValue)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Valor actual
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div
                  className={`text-2xl font-bold ${
                    totalProfitLoss >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatCurrency(totalProfitLoss)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Ganancia/Pérdida
                </div>
              </div>
              {totalProfitLoss >= 0 ? (
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
                    totalProfitLossPercentage >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {formatPercentage(totalProfitLossPercentage)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Rentabilidad
                </div>
              </div>
              <Percent className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investments Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Portafolio de Inversiones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
              <SortableContext
                items={investments.map((investment) => investment.id)}
                strategy={verticalListSortingStrategy}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-6"></th>
                      <th className="text-left p-3 font-semibold text-foreground">
                        Inversión
                      </th>
                      <th className="text-center p-3 font-semibold text-foreground">
                        Tipo
                      </th>
                      <th className="text-center p-3 font-semibold text-foreground">
                        Cuenta
                      </th>
                      <th className="text-center p-3 font-semibold text-foreground">
                        Invertido Actual
                      </th>
                      <th className="text-center p-3 font-semibold text-foreground">
                        Valor Actual
                      </th>
                      <th className="text-center p-3 font-semibold text-foreground">
                        G/P
                      </th>
                      <th className="text-center p-3 font-semibold text-foreground">
                        Rentabilidad
                      </th>
                      <th className="text-center p-3 font-semibold text-foreground">
                        Fecha Compra
                      </th>
                      <th className="text-center p-3 font-semibold text-foreground">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map((investment) => {
                      const typeConfig = getTypeConfig(investment.type);
                      const isProfit = investment.profit_loss >= 0;

                      return (
                        <SortableRow key={investment.id} id={investment.id}>
                          <td className="p-3 w-8 align-middle">
                            <RowHandle id={investment.id} />
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-foreground">
                              {investment.name}
                            </div>
                            {investment.description && (
                              <div className="text-sm text-muted-foreground">
                                {investment.description}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={typeConfig.color}>
                              {typeConfig.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="font-medium text-foreground">
                              {investment.account_name}
                            </div>
                          </td>
                          <td className="p-3 text-center font-medium">
                            {formatCurrency(investment.total_invested_amount)}
                          </td>
                          <td className="p-3 text-center font-medium">
                            {formatCurrency(investment.current_account_value)}
                          </td>
                          <td className="p-3 text-center">
                            <div
                              className={`font-bold ${
                                isProfit ? "text-success" : "text-destructive"
                              }`}
                            >
                              {isProfit ? "+" : ""}
                              {formatCurrency(investment.profit_loss)}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div
                              className={`font-bold ${
                                isProfit ? "text-success" : "text-destructive"
                              }`}
                            >
                              {formatPercentage(
                                investment.profit_loss_percentage
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center text-sm text-muted-foreground">
                            <div className="flex items-center justify-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(investment.purchase_date)}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditInvestment()}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
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
                                      {investment.name}"? Esta acción no se
                                      puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteInvestment(investment.id)
                                      }
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </SortableRow>
                      );
                    })}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      {/* IBKR Positions Table */}
      {!loadingIbkr && ibkrPositions.length > 0 && (
        <Card className="shadow-card border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-300"
                >
                  IBKR
                </Badge>
                Posiciones Interactive Brokers
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <a href="/ibkr" className="flex items-center gap-1">
                  Ver detalles
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-foreground">
                      Símbolo
                    </th>
                    <th className="text-left p-3 font-semibold text-foreground">
                      Descripción
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Cantidad
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Precio Actual
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Costo Base
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Valor Total
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      G/P
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Rentabilidad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ibkrPositions.map((pos) => {
                    const isProfit = pos.unrealized_pnl >= 0;
                    return (
                      <tr
                        key={pos.id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <div className="font-mono font-bold text-foreground">
                            {pos.symbol}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pos.exchange}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">
                            {pos.description}
                          </div>
                          {pos.isin && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {pos.isin}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-foreground">
                          {pos.quantity.toLocaleString("es-ES", {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="p-3 text-center font-mono text-foreground">
                          {formatCurrency(pos.current_price)}
                        </td>
                        <td className="p-3 text-center font-mono text-foreground">
                          {formatCurrency(pos.cost_basis)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-foreground">
                          {formatCurrency(pos.position_value)}
                        </td>
                        <td className="p-3 text-center">
                          <div
                            className={`font-bold ${
                              isProfit ? "text-success" : "text-destructive"
                            }`}
                          >
                            {isProfit ? "+" : ""}
                            {formatCurrency(pos.unrealized_pnl)}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div
                            className={`font-bold ${
                              isProfit ? "text-success" : "text-destructive"
                            }`}
                          >
                            {formatPercentage(pos.unrealized_pnl_percent)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total row for IBKR */}
                  <tr className="border-t-2 border-blue-300 font-semibold bg-blue-50/50">
                    <td className="p-3 text-foreground" colSpan={5}>
                      Total IBKR
                    </td>
                    <td className="p-3 text-center font-bold text-foreground">
                      {formatCurrency(ibkrCurrentValue)}
                    </td>
                    <td className="p-3 text-center">
                      <div
                        className={`font-bold ${
                          ibkrCurrentValue - ibkrInvested >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {ibkrCurrentValue - ibkrInvested >= 0 ? "+" : ""}
                        {formatCurrency(ibkrCurrentValue - ibkrInvested)}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div
                        className={`font-bold ${
                          ibkrCurrentValue - ibkrInvested >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {formatPercentage(
                          ibkrInvested > 0
                            ? ((ibkrCurrentValue - ibkrInvested) /
                                ibkrInvested) *
                                100
                            : 0
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Investment Summary Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Resumen de Inversiones por Mes</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlySummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay inversiones registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-foreground">
                      Año
                    </th>
                    <th className="text-left p-3 font-semibold text-foreground">
                      Mes
                    </th>
                    <th className="text-center p-3 font-semibold text-foreground">
                      Inversiones
                    </th>
                    <th className="text-right p-3 font-semibold text-foreground">
                      Total Invertido
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map((summary) => (
                    <tr
                      key={`${summary.year}-${summary.month}`}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="p-3 font-medium text-foreground">
                        {summary.year}
                      </td>
                      <td className="p-3 text-foreground">
                        {summary.month_name}
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {summary.investment_count}
                      </td>
                      <td className="p-3 text-right font-medium text-foreground">
                        {formatCurrency(summary.total_invested)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t-2 border-border font-semibold bg-muted/20">
                    <td className="p-3 text-foreground" colSpan={3}>
                      Total General
                    </td>
                    <td className="p-3 text-right text-foreground">
                      {formatCurrency(
                        monthlySummary.reduce(
                          (sum, item) => sum + item.total_invested,
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for selecting investment to edit */}
      <InvestmentSelectionDialog
        open={selectionDialogOpen}
        onClose={handleCloseSelectionDialog}
        onSelectInvestment={handleSelectInvestment}
        investments={investments}
      />

      {/* Dialog for adding/editing investments */}
      <AddInvestmentDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleDialogSubmit}
        onAddToExisting={handleAddToExisting}
        initialData={editingInvestment}
        availableAccounts={accounts.map((account) => ({
          id: account.id,
          name: account.name,
        }))}
        existingInvestments={existingInvestmentsData}
        isEditing={!!editingInvestment}
      />
    </div>
  );
};

export default Investments;
