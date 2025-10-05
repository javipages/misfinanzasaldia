import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTHS } from "@/utils/constants";

type CategoryOption = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

type Props = {
  open: boolean;
  kind: "income" | "expense";
  categories: CategoryOption[];
  defaultCategoryId?: string | null;
  defaultSubcategoryId?: string | null;
  defaultMonth?: number | null; // 1-12
  defaultAmount?: number | null;
  // Optional description field to annotate a value
  defaultDescription?: string | null;
  onSubmit: (params: {
    categoryId: string;
    subcategoryId: string | null;
    month: number;
    amount: number;
    description?: string | null;
  }) => Promise<void> | void;
  onClose: () => void;
};

export function AddValueDialog({
  open,
  kind,
  categories,
  defaultCategoryId = null,
  defaultSubcategoryId = null,
  defaultMonth = null,
  defaultAmount = null,
  defaultDescription = null,
  onSubmit,
  onClose,
}: Props) {
  const NONE = "__none__"; // sentinel for "no subcategory"
  const [categoryId, setCategoryId] = useState<string>(defaultCategoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState<string>(
    defaultSubcategoryId ?? NONE
  );
  const [month, setMonth] = useState<number>(
    defaultMonth ?? new Date().getMonth() + 1
  );
  const [amount, setAmount] = useState<string>(
    defaultAmount != null ? String(defaultAmount) : ""
  );
  const [description, setDescription] = useState<string>(
    defaultDescription ?? ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategoryId(defaultCategoryId ?? "");
      setSubcategoryId(defaultSubcategoryId ?? NONE);
      setMonth(defaultMonth ?? new Date().getMonth() + 1);
      setAmount(defaultAmount != null ? String(defaultAmount) : "");
      setDescription(defaultDescription ?? "");
    }
  }, [
    open,
    defaultCategoryId,
    defaultSubcategoryId,
    defaultMonth,
    defaultAmount,
    defaultDescription,
  ]);

  if (!open) return null;

  const title = kind === "income" ? "Añadir ingreso" : "Añadir gasto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-background rounded-md shadow-lg w-full max-w-md mx-4 p-4 space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>

        <div className="space-y-2">
          <label className="text-sm">Categoría</label>
          <Select
            value={categoryId}
            onValueChange={(v) => {
              setCategoryId(v);
              setSubcategoryId(NONE);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm">Subcategoría</label>
          <Select
            value={subcategoryId}
            onValueChange={(v) => setSubcategoryId(v)}
            disabled={
              !categoryId ||
              (categories.find((c) => c.id === categoryId)?.subcategories
                ?.length ?? 0) === 0
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin subcategoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin subcategoría</SelectItem>
              {(
                categories.find((c) => c.id === categoryId)?.subcategories ?? []
              ).map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm">Mes</label>
            <Select
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, idx) => (
                  <SelectItem key={m} value={String(idx + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Cantidad (€)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm">Descripción (opcional)</label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Añade una nota o detalle"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!categoryId || !month) return;
              setSaving(true);
              try {
                await onSubmit({
                  categoryId,
                  subcategoryId: subcategoryId === NONE ? null : subcategoryId,
                  month,
                  amount: Number(amount || 0),
                  description: description || null,
                });
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !categoryId}
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
