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

type EditableSubcategory = {
  id: string;
  category_id: string;
  name: string;
  display_order: number;
};

type EditableCategory = {
  id: string;
  name: string;
  display_order: number;
  subcategories: EditableSubcategory[];
};

type AssetType =
  | "cuenta_bancaria"
  | "inversion"
  | "efectivo"
  | "cripto"
  | "otro";

type EditableAssetCategory = {
  id: string;
  name: string;
  display_order: number;
  type: AssetType;
};

function CategoryList({
  title,
  items,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
  onAddSubcategory,
  onRenameSubcategory,
  onDeleteSubcategory,
  onMoveSubcategory,
}: {
  title: string;
  items: EditableCategory[];
  onAddCategory: (name: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onMoveCategory: (id: string, direction: "up" | "down") => void;
  onAddSubcategory: (categoryId: string, name: string) => void;
  onRenameSubcategory: (
    categoryId: string,
    subcategoryId: string,
    name: string
  ) => void;
  onDeleteSubcategory: (categoryId: string, subcategoryId: string) => void;
  onMoveSubcategory: (
    categoryId: string,
    subcategoryId: string,
    direction: "up" | "down"
  ) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newSubNames, setNewSubNames] = useState<Record<string, string>>({});

  function handleAddCategory() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    void onAddCategory(trimmed);
    setNewName("");
  }

  function handleAddSubcategory(categoryId: string) {
    const nextName = (newSubNames[categoryId] ?? "").trim();
    if (!nextName) return;
    void onAddSubcategory(categoryId, nextName);
    setNewSubNames((prev) => ({ ...prev, [categoryId]: "" }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nueva categoría"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button onClick={handleAddCategory} className="w-full sm:w-auto">
            Añadir categoría
          </Button>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay categorías.
            </p>
          ) : (
            items
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((cat, idx) => (
                <div
                  key={cat.id}
                  className="space-y-3 rounded-md border border-border p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={cat.name}
                      onChange={(e) =>
                        void onRenameCategory(cat.id, e.target.value)
                      }
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => void onMoveCategory(cat.id, "up")}
                        disabled={idx === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void onMoveCategory(cat.id, "down")}
                        disabled={idx === items.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => onDeleteCategory(cat.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 border-l border-border/40 pl-4">
                    {(cat.subcategories ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Sin subcategorías
                      </p>
                    ) : (
                      (cat.subcategories ?? [])
                        .slice()
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((sub, subIdx) => (
                          <div
                            key={sub.id}
                            className="flex flex-col gap-2 sm:flex-row sm:items-center"
                          >
                            <Input
                              className="text-sm"
                              value={sub.name}
                              onChange={(e) =>
                                void onRenameSubcategory(
                                  cat.id,
                                  sub.id,
                                  e.target.value
                                )
                              }
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  void onMoveSubcategory(
                                    cat.id,
                                    sub.id,
                                    "up"
                                  )
                                }
                                disabled={subIdx === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  void onMoveSubcategory(
                                    cat.id,
                                    sub.id,
                                    "down"
                                  )
                                }
                                disabled={
                                  subIdx === (cat.subcategories ?? []).length - 1
                                }
                              >
                                ↓
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  onDeleteSubcategory(cat.id, sub.id)
                                }
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ))
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        className="text-sm"
                        placeholder="Nueva subcategoría"
                        value={newSubNames[cat.id] ?? ""}
                        onChange={(e) =>
                          setNewSubNames((prev) => ({
                            ...prev,
                            [cat.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleAddSubcategory(cat.id)}
                        className="sm:w-auto"
                      >
                        Añadir subcategoría
                      </Button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
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
    addIncomeSubcategory,
    addExpenseSubcategory,
    renameIncomeSubcategory,
    renameExpenseSubcategory,
    deleteIncomeSubcategory,
    deleteExpenseSubcategory,
    moveIncomeSubcategory,
    moveExpenseSubcategory,
  } = useSettings();
  const loading = isLoading;
  const saving = isFetching;
  const [confirm, setConfirm] = useState<{
    open: boolean;
    categoryId: string | null;
    subcategoryId: string | null;
    scope: "income" | "expense" | "asset" | null;
  }>({
    open: false,
    categoryId: null,
    subcategoryId: null,
    scope: null,
  });

  const sortedIncome = income;
  const sortedExpense = expense;
  const sortedAssets = assets as EditableAssetCategory[];

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
          onAddCategory={handleAddIncome}
          onRenameCategory={handleRenameIncome}
          onDeleteCategory={(categoryId) =>
            setConfirm({
              open: true,
              categoryId,
              subcategoryId: null,
              scope: "income",
            })
          }
          onMoveCategory={handleMoveIncome}
          onAddSubcategory={(categoryId, name) =>
            void addIncomeSubcategory.mutateAsync({ categoryId, name })
          }
          onRenameSubcategory={(categoryId, subcategoryId, name) =>
            void renameIncomeSubcategory.mutateAsync({
              id: subcategoryId,
              categoryId,
              name,
            })
          }
          onDeleteSubcategory={(categoryId, subcategoryId) =>
            setConfirm({
              open: true,
              categoryId,
              subcategoryId,
              scope: "income",
            })
          }
          onMoveSubcategory={(categoryId, subcategoryId, direction) =>
            void moveIncomeSubcategory.mutateAsync({
              categoryId,
              subcategoryId,
              direction,
            })
          }
        />
        <CategoryList
          title="Categorías de gastos"
          items={sortedExpense}
          onAddCategory={handleAddExpense}
          onRenameCategory={handleRenameExpense}
          onDeleteCategory={(categoryId) =>
            setConfirm({
              open: true,
              categoryId,
              subcategoryId: null,
              scope: "expense",
            })
          }
          onMoveCategory={handleMoveExpense}
          onAddSubcategory={(categoryId, name) =>
            void addExpenseSubcategory.mutateAsync({ categoryId, name })
          }
          onRenameSubcategory={(categoryId, subcategoryId, name) =>
            void renameExpenseSubcategory.mutateAsync({
              id: subcategoryId,
              categoryId,
              name,
            })
          }
          onDeleteSubcategory={(categoryId, subcategoryId) =>
            setConfirm({
              open: true,
              categoryId,
              subcategoryId,
              scope: "expense",
            })
          }
          onMoveSubcategory={(categoryId, subcategoryId, direction) =>
            void moveExpenseSubcategory.mutateAsync({
              categoryId,
              subcategoryId,
              direction,
            })
          }
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
                          onClick={() =>
                            setConfirm({
                              open: true,
                              categoryId: cat.id,
                              subcategoryId: null,
                              scope: "asset",
                            })
                          }
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
        title={
          confirm.scope === "asset"
            ? "Eliminar activo"
            : confirm.subcategoryId
            ? "Eliminar subcategoría"
            : "Eliminar categoría"
        }
        description={
          confirm.scope === "asset"
            ? "Esta acción no se puede deshacer. ¿Seguro que quieres eliminar el activo?"
            : confirm.subcategoryId
            ? "Esta acción no se puede deshacer. ¿Seguro que quieres eliminar la subcategoría?"
            : "Esta acción no se puede deshacer. ¿Seguro que quieres eliminar la categoría?"
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (!confirm.scope) return;
          if (confirm.scope === "income") {
            if (confirm.subcategoryId && confirm.categoryId) {
              void deleteIncomeSubcategory.mutateAsync({
                id: confirm.subcategoryId,
                categoryId: confirm.categoryId,
              });
            } else if (confirm.categoryId) {
              void handleDeleteIncome(confirm.categoryId);
            }
          } else if (confirm.scope === "expense") {
            if (confirm.subcategoryId && confirm.categoryId) {
              void deleteExpenseSubcategory.mutateAsync({
                id: confirm.subcategoryId,
                categoryId: confirm.categoryId,
              });
            } else if (confirm.categoryId) {
              void handleDeleteExpense(confirm.categoryId);
            }
          } else if (confirm.scope === "asset") {
            if (confirm.categoryId) {
              void deleteAsset.mutateAsync(confirm.categoryId);
            }
          }
          setConfirm({
            open: false,
            categoryId: null,
            subcategoryId: null,
            scope: null,
          });
        }}
        onClose={() =>
          setConfirm({
            open: false,
            categoryId: null,
            subcategoryId: null,
            scope: null,
          })
        }
      />
    </div>
  );
}
