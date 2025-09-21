import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  ArrowUpDown,
  Edit,
  Trash2,
  CheckCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AddMovementDialog } from "@/components/ui/add-movement-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { useYearStore } from "@/store/year";
import {
  useMovements,
  type MovementRow,
  type MovementType,
} from "@/hooks/use-movements";
import {
  useMovementsFilter,
  type SortField,
} from "@/hooks/use-movements-filter";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const Movements = () => {
  const year = useYearStore((s) => s.year);
  const {
    movements,
    categories,
    isLoading,
    deleteMovement,
    createMovement,
    updateMovement,
  } = useMovements(year);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<MovementRow | null>(
    null
  );
  const [deletedMovementId, setDeletedMovementId] = useState<string | null>(
    null
  );

  // Usar el hook de filtrado
  const {
    filterState,
    paginatedMovements,
    paginationInfo,
    stats,
    setSearchTerm,
    setTypeFilter,
    setMonthFilter,
    setCategoryFilter,
    setDateFromFilter,
    setDateToFilter,
    setCurrentPage,
    setPageSize,
    handleSort,
    handleSortChange,
    formatCurrency,
  } = useMovementsFilter(movements);

  const handleDelete = async (movement: MovementRow) => {
    setDeletedMovementId(movement.id);
    try {
      await deleteMovement.mutateAsync({
        id: movement.id,
        type: movement.type,
      });
      // Mostrar feedback de éxito por 2 segundos
      setTimeout(() => {
        setDeletedMovementId(null);
      }, 2000);
    } catch {
      setDeletedMovementId(null);
    }
  };

  const handleCreateMovement = async (params: {
    type: MovementType;
    categoryId: string;
    month: number;
    amount: number;
    description?: string | null;
  }) => {
    await createMovement.mutateAsync(params);
  };

  const handleUpdateMovement = async (params: {
    type: MovementType;
    categoryId: string;
    month: number;
    amount: number;
    description?: string | null;
  }) => {
    if (!editingMovement) return;
    await updateMovement.mutateAsync({
      id: editingMovement.id,
      type: editingMovement.type,
      patch: {
        category_id: params.categoryId,
        month: params.month,
        amount: params.amount,
        description: params.description,
      },
    });
    setEditingMovement(null);
  };

  const handleEdit = (movement: MovementRow) => {
    setEditingMovement(movement);
  };

  if (isLoading) {
    return <div className="p-6">Cargando movimientos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Movimientos Financieros
          </h1>
          <p className="text-muted-foreground">
            Vista completa de todos tus ingresos y gastos
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo movimiento
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <div className="h-4 w-4 text-green-600">↗</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.incomeCount} movimientos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <div className="h-4 w-4 text-red-600">↘</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.expenseCount} movimientos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <div
              className={`h-4 w-4 ${
                stats.balance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {stats.balance >= 0 ? "↗" : "↘"}
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stats.balance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(stats.balance)}
            </div>
            <p className="text-xs text-muted-foreground">{year}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Movimientos
            </CardTitle>
            <ArrowUpDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.movementsCount}
            </div>
            <p className="text-xs text-muted-foreground">Este año</p>
          </CardContent>
        </Card>
      </div>

      {/* Movimientos y filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos ({paginationInfo.totalItems})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros y búsqueda integrados */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descripción o categoría..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select
                onValueChange={(value: MovementType | "all") =>
                  setTypeFilter(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Ingresos</SelectItem>
                  <SelectItem value="expense">Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Desde</label>
              <Input
                type="date"
                onChange={(e) => setDateFromFilter(e.target.value)}
                placeholder="Fecha desde"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hasta</label>
              <Input
                type="date"
                onChange={(e) => setDateToFilter(e.target.value)}
                placeholder="Fecha hasta"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {/* Categorías de ingresos */}
                  {categories?.income.map((category) => (
                    <SelectItem
                      key={`income-${category.id}`}
                      value={category.name}
                    >
                      ↗ {category.name}
                    </SelectItem>
                  ))}
                  {/* Categorías de gastos */}
                  {categories?.expense.map((category) => (
                    <SelectItem
                      key={`expense-${category.id}`}
                      value={category.name}
                    >
                      ↘ {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ordenar por</label>
              <Select
                value={filterState.selectedSortValue}
                onValueChange={(value: SortField) => handleSortChange(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="amount">Cantidad</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                  <SelectItem value="type">Tipo</SelectItem>
                  <SelectItem value="description">Descripción</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabla de movimientos */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      Fecha
                      <ArrowUpDown
                        className={`h-4 w-4 ${
                          filterState.sortField === "date"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      {filterState.sortField === "date" && (
                        <div className="text-xs text-primary">
                          {filterState.sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center gap-1">
                      Tipo
                      <ArrowUpDown
                        className={`h-4 w-4 ${
                          filterState.sortField === "type"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      {filterState.sortField === "type" && (
                        <div className="text-xs text-primary">
                          {filterState.sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center gap-1">
                      Categoría
                      <ArrowUpDown
                        className={`h-4 w-4 ${
                          filterState.sortField === "category"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      {filterState.sortField === "category" && (
                        <div className="text-xs text-primary">
                          {filterState.sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("description")}
                  >
                    <div className="flex items-center gap-1">
                      Descripción
                      <ArrowUpDown
                        className={`h-4 w-4 ${
                          filterState.sortField === "description"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      {filterState.sortField === "description" && (
                        <div className="text-xs text-primary">
                          {filterState.sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Cantidad
                      <ArrowUpDown
                        className={`h-4 w-4 ${
                          filterState.sortField === "amount"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      {filterState.sortField === "amount" && (
                        <div className="text-xs text-primary">
                          {filterState.sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginationInfo.totalItems === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No se encontraron movimientos con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMovements.map((movement) => (
                    <TableRow
                      key={movement.id}
                      className={
                        deletedMovementId === movement.id
                          ? "opacity-50 bg-muted/30"
                          : ""
                      }
                    >
                      <TableCell>
                        <div className="font-medium">
                          {MONTHS[movement.month - 1]} {movement.year}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(movement.created_at).toLocaleDateString(
                            "es-ES"
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            movement.type === "income"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {movement.type === "income" ? "Ingreso" : "Gasto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.category_name}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {movement.description || (
                            <span className="text-muted-foreground italic">
                              Sin descripción
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            movement.type === "income"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {movement.type === "income" ? "+" : "-"}
                          {formatCurrency(movement.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {deletedMovementId === movement.id ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs">Eliminado</span>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(movement)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={deleteMovement.isPending}
                                  >
                                    {deleteMovement.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      ¿Eliminar movimiento?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se
                                      eliminará permanentemente el movimiento de{" "}
                                      {movement.type === "income"
                                        ? "ingreso"
                                        : "gasto"}
                                      .
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(movement)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <div className="mt-4">
            <TablePagination
              pagination={paginationInfo}
              onPageChange={setCurrentPage}
              onLimitChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      {/* Diálogo para agregar movimiento */}
      <AddMovementDialog
        open={addDialogOpen}
        categories={categories ?? null}
        onSubmit={handleCreateMovement}
        onClose={() => setAddDialogOpen(false)}
      />

      {/* Diálogo para editar movimiento */}
      <AddMovementDialog
        open={editingMovement !== null}
        categories={categories ?? null}
        movementType={editingMovement?.type ?? null}
        defaultCategoryId={editingMovement?.category_id ?? null}
        defaultMonth={editingMovement?.month ?? null}
        defaultAmount={editingMovement?.amount ?? null}
        defaultDescription={editingMovement?.description ?? null}
        isEditing={true}
        onSubmit={handleUpdateMovement}
        onClose={() => setEditingMovement(null)}
      />
    </div>
  );
};

export default Movements;
