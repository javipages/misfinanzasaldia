import { useEffect, useMemo, useState } from "react";
import {
  listIncomeCategories,
  listExpenseCategories,
  createIncomeCategory,
  createExpenseCategory,
  updateIncomeCategory,
  updateExpenseCategory,
  deleteIncomeCategory,
  deleteExpenseCategory,
} from "@/integrations/supabase/categories";
import type { CategoryRow } from "@/integrations/supabase/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type EditableCategory = Pick<CategoryRow, "id" | "name" | "display_order">;

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
        <div className="flex gap-2 mb-4">
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
                    <div className="flex items-center gap-1">
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
  const [income, setIncome] = useState<EditableCategory[]>([]);
  const [expense, setExpense] = useState<EditableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    id: string | null;
    scope: "income" | "expense" | null;
  }>({
    open: false,
    id: null,
    scope: null,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [inc, exp] = await Promise.all([
          listIncomeCategories(),
          listExpenseCategories(),
        ]);
        if (!mounted) return;
        setIncome(
          (inc ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            display_order: c.display_order,
          }))
        );
        setExpense(
          (exp ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            display_order: c.display_order,
          }))
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sortedIncome = useMemo(
    () => [...income].sort((a, b) => a.display_order - b.display_order),
    [income]
  );
  const sortedExpense = useMemo(
    () => [...expense].sort((a, b) => a.display_order - b.display_order),
    [expense]
  );

  const nextOrder = (arr: EditableCategory[]) =>
    arr.length ? Math.max(...arr.map((c) => c.display_order)) + 1 : 0;

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  async function handleAddIncome(name: string) {
    setSaving(true);
    try {
      const created = await createIncomeCategory({
        name,
        display_order: nextOrder(income),
      });
      setIncome((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          display_order: created.display_order,
        },
      ]);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddExpense(name: string) {
    setSaving(true);
    try {
      const created = await createExpenseCategory({
        name,
        display_order: nextOrder(expense),
      });
      setExpense((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          display_order: created.display_order,
        },
      ]);
    } finally {
      setSaving(false);
    }
  }

  async function handleRenameIncome(id: string, name: string) {
    setIncome((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    setSaving(true);
    try {
      await updateIncomeCategory(id, { name });
    } finally {
      setSaving(false);
    }
  }

  async function handleRenameExpense(id: string, name: string) {
    setExpense((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    setSaving(true);
    try {
      await updateExpenseCategory(id, { name });
    } finally {
      setSaving(false);
    }
  }

  function reorder(arr: EditableCategory[], id: string, dir: "up" | "down") {
    const ordered = [...arr].sort((a, b) => a.display_order - b.display_order);
    const index = ordered.findIndex((c) => c.id === id);
    if (index < 0) return ordered;
    const swapWith = dir === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= ordered.length) return ordered;
    const a = ordered[index];
    const b = ordered[swapWith];
    const tmp = a.display_order;
    a.display_order = b.display_order;
    b.display_order = tmp;
    return ordered;
  }

  async function handleMoveIncome(id: string, direction: "up" | "down") {
    const updated = reorder(income, id, direction);
    setIncome(updated);
    setSaving(true);
    try {
      // persist the two affected items
      const changed = updated
        .sort((a, b) => a.display_order - b.display_order)
        .map((c) => c);
      const before = income.reduce<Record<string, number>>((acc, c) => {
        acc[c.id] = c.display_order;
        return acc;
      }, {});
      const toPersist = changed.filter((c) => before[c.id] !== c.display_order);
      await Promise.all(
        toPersist.map((c) =>
          updateIncomeCategory(c.id, { display_order: c.display_order })
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleMoveExpense(id: string, direction: "up" | "down") {
    const updated = reorder(expense, id, direction);
    setExpense(updated);
    setSaving(true);
    try {
      const before = expense.reduce<Record<string, number>>((acc, c) => {
        acc[c.id] = c.display_order;
        return acc;
      }, {});
      const toPersist = updated.filter((c) => before[c.id] !== c.display_order);
      await Promise.all(
        toPersist.map((c) =>
          updateExpenseCategory(c.id, { display_order: c.display_order })
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteIncome(id: string) {
    setSaving(true);
    try {
      await deleteIncomeCategory(id);
      setIncome((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    setSaving(true);
    try {
      await deleteExpenseCategory(id);
      setExpense((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
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
