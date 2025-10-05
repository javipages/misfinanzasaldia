import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSettings } from "@/hooks/use-settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentCardSkeleton, TableSkeleton } from "@/components/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

type EditableCategory = { id: string; name: string; display_order: number };

function CategoryList({
  title,
  items,
  onAdd,
  onRename,
  onDelete,
  onMove,
}: {
  title: string;
  items: EditableCategory[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const [newName, setNewName] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nueva categoría"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            onClick={() => {
              const trimmed = newName.trim();
              if (!trimmed) return;
              onAdd(trimmed);
              setNewName("");
            }}
            className="w-full sm:w-auto"
          >
            Añadir
          </Button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-2">Nombre</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((cat, idx) => (
                <tr key={cat.id}>
                  <td className="py-2 pr-2">
                    <Input
                      value={cat.name}
                      onChange={(e) => onRename(cat.id, e.target.value)}
                    />
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => onMove(cat.id, "up")}
                        disabled={idx === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => onMove(cat.id, "down")}
                        disabled={idx === items.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => onDelete(cat.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  type AssetType =
    | "cuenta_bancaria"
    | "inversion"
    | "efectivo"
    | "cripto"
    | "otro";
  const {
    income,
    expense,
    assets,
    isLoading,
    isFetching,
    addIncome,
    addExpense,
    addAsset,
    renameIncome,
    renameExpense,
    renameAsset,
    changeAssetType,
    moveIncome,
    moveExpense,
    deleteIncome,
    deleteExpense,
    deleteAsset,
  } = useSettings();
  const loading = isLoading;
  const saving = isFetching;
  const [confirm, setConfirm] = useState<{
    open: boolean;
    id: string | null;
    scope: "income" | "expense" | null;
  }>({
    open: false,
    id: null,
    scope: null,
  });

  const sortedIncome = income;
  const sortedExpense = expense;
  const sortedAssets = assets as (EditableCategory & { type: AssetType })[];

  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] =
    useState<AssetType>("cuenta_bancaria");

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            <ContentCardSkeleton
              key={`category-${idx}`}
              headerWidth="w-48"
              contentClassName="space-y-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full sm:w-28" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, rowIdx) => (
                  <Skeleton
                    key={`category-row-${idx}-${rowIdx}`}
                    className="h-10 w-full"
                  />
                ))}
              </div>
            </ContentCardSkeleton>
          ))}
        </div>
        <Separator />
        <ContentCardSkeleton headerWidth="w-60" contentClassName="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full sm:w-36" />
            <Skeleton className="h-10 w-full sm:w-28" />
          </div>
          <TableSkeleton
            columns={3}
            columnClassName="grid grid-cols-1 gap-3 md:grid-cols-3"
          />
        </ContentCardSkeleton>
        <Separator />
        <ContentCardSkeleton headerWidth="w-48" contentClassName="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-24 w-full" />
        </ContentCardSkeleton>
      </div>
    );
  }

  async function handleAddIncome(name: string) {
    await addIncome.mutateAsync(name);
  }

  async function handleAddExpense(name: string) {
    await addExpense.mutateAsync(name);
  }

  async function handleRenameIncome(id: string, name: string) {
    await renameIncome.mutateAsync({ id, name });
  }

  async function handleRenameExpense(id: string, name: string) {
    await renameExpense.mutateAsync({ id, name });
  }

  // local reorder helper removed; optimismo se maneja en el hook

  async function handleMoveIncome(id: string, direction: "up" | "down") {
    // optimistic handled by hook
    await moveIncome.mutateAsync({ id, direction });
  }

  async function handleMoveExpense(id: string, direction: "up" | "down") {
    await moveExpense.mutateAsync({ id, direction });
  }

  async function handleDeleteIncome(id: string) {
    await deleteIncome.mutateAsync(id);
  }

  async function handleDeleteExpense(id: string) {
    await deleteExpense.mutateAsync(id);
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <div className="text-sm text-muted-foreground">
          {saving ? "Guardando..." : ""}
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryList
          title="Categorías de ingresos"
          items={sortedIncome}
          onAdd={handleAddIncome}
          onRename={handleRenameIncome}
          onDelete={(id) => setConfirm({ open: true, id, scope: "income" })}
          onMove={handleMoveIncome}
        />
        <CategoryList
          title="Categorías de gastos"
          items={sortedExpense}
          onAdd={handleAddExpense}
          onRename={handleRenameExpense}
          onDelete={(id) => setConfirm({ open: true, id, scope: "expense" })}
          onMove={handleMoveExpense}
        />
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Activos patrimoniales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Nuevo activo"
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
            />
            <Select
              value={newAssetType}
              onValueChange={(v) => setNewAssetType(v as AssetType)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cuenta_bancaria">Cuenta</SelectItem>
                <SelectItem value="inversion">Inversión</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="cripto">Crypto</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                const trimmed = newAssetName.trim();
                if (!trimmed) return;
                void addAsset.mutateAsync({
                  name: trimmed,
                  type: newAssetType,
                });
                setNewAssetName("");
                setNewAssetType("cuenta_bancaria");
              }}
              className="w-full sm:w-auto"
            >
              Añadir
            </Button>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-2">Nombre</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedAssets.map((cat) => (
                  <tr key={cat.id}>
                    <td className="py-2 pr-2">
                      <Input
                        value={cat.name}
                        onChange={(e) =>
                          void renameAsset.mutateAsync({
                            id: cat.id,
                            name: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Select
                        value={cat.type}
                        onValueChange={(v) =>
                          void changeAssetType.mutateAsync({
                            id: cat.id,
                            type: v as AssetType,
                          })
                        }
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cuenta_bancaria">
                            Cuenta
                          </SelectItem>
                          <SelectItem value="inversion">Inversión</SelectItem>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="cripto">Crypto</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => void deleteAsset.mutateAsync(cat.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm.open}
        title="Eliminar categoría"
        description="Esta acción no se puede deshacer. ¿Seguro que quieres eliminar la categoría?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (!confirm.id || !confirm.scope) return;
          if (confirm.scope === "income") {
            void handleDeleteIncome(confirm.id);
          } else {
            void handleDeleteExpense(confirm.id);
          }
        }}
        onClose={() => setConfirm({ open: false, id: null, scope: null })}
      />
    </div>
  );
}
