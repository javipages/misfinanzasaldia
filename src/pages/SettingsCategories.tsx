import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSettings } from "@/hooks/use-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCardSkeleton } from "@/components/PageSkeletons";

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
                                  void onMoveSubcategory(cat.id, sub.id, "up")
                                }
                                disabled={subIdx === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  void onMoveSubcategory(cat.id, sub.id, "down")
                                }
                                disabled={
                                  subIdx ===
                                  (cat.subcategories ?? []).length - 1
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

export default function SettingsCategories() {
  const {
    income,
    expense,
    isLoading,
    isFetching,
    addIncome,
    addExpense,
    renameIncome,
    renameExpense,
    moveIncome,
    moveExpense,
    deleteIncome,
    deleteExpense,
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
    scope: "income" | "expense" | null;
  }>({
    open: false,
    categoryId: null,
    subcategoryId: null,
    scope: null,
  });

  const sortedIncome = income;
  const sortedExpense = expense;

  if (loading) {
    return (
      <div className="">
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

  async function handleMoveIncome(id: string, direction: "up" | "down") {
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
    <div className="">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Categorías</h1>
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
