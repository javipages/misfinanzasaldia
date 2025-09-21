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
import { Badge } from "@/components/ui/badge";
import { type MovementType } from "@/hooks/use-movements";

type Category = { id: string; name: string };

type Props = {
  open: boolean;
  movementType?: MovementType | null;
  categories: {
    income: Category[];
    expense: Category[];
  } | null;
  defaultCategoryId?: string | null;
  defaultMonth?: number | null;
  defaultAmount?: number | null;
  defaultDescription?: string | null;
  onSubmit: (params: {
    type: MovementType;
    categoryId: string;
    month: number;
    amount: number;
    description?: string | null;
  }) => Promise<void> | void;
  onClose: () => void;
};

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

export function AddMovementDialog({
  open,
  movementType = null,
  categories,
  defaultCategoryId = null,
  defaultMonth = null,
  defaultAmount = null,
  defaultDescription = null,
  onSubmit,
  onClose,
}: Props) {
  const [type, setType] = useState<MovementType>(movementType ?? "income");
  const [categoryId, setCategoryId] = useState<string>(defaultCategoryId ?? "");
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setType(movementType ?? "income");
      setCategoryId(defaultCategoryId ?? "");
      setMonth(defaultMonth ?? new Date().getMonth() + 1);
      setAmount(defaultAmount != null ? String(defaultAmount) : "");
      setDescription(defaultDescription ?? "");
    }
  }, [
    open,
    movementType,
    defaultCategoryId,
    defaultMonth,
    defaultAmount,
    defaultDescription,
  ]);

  if (!open) return null;

  const availableCategories =
    type === "income" ? categories?.income ?? [] : categories?.expense ?? [];

  const title = "Añadir movimiento";
  const buttonText = type === "income" ? "Ingreso" : "Gasto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-background rounded-md shadow-lg w-full max-w-md mx-4 p-4 space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>

        {/* Tipo de movimiento */}
        <div className="space-y-2">
          <label className="text-sm">Tipo de movimiento</label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("income")}
              className="flex-1"
            >
              <Badge variant="default" className="mr-2">
                ↗
              </Badge>
              Ingreso
            </Button>
            <Button
              type="button"
              variant={type === "expense" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setType("expense")}
              className="flex-1"
            >
              <Badge variant="destructive" className="mr-2">
                ↘
              </Badge>
              Gasto
            </Button>
          </div>
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <label className="text-sm">Categoría</label>
          <Select value={categoryId} onValueChange={(v) => setCategoryId(v)}>
            <SelectTrigger>
              <SelectValue
                placeholder={`Selecciona categoría de ${buttonText.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mes y cantidad */}
        <div className="grid grid-cols-2 gap-3">
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
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <label className="text-sm">Descripción (opcional)</label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Añade una nota o detalle"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!categoryId || !month) return;
              setSaving(true);
              try {
                await onSubmit({
                  type,
                  categoryId,
                  month,
                  amount: Number(amount || 0),
                  description: description || null,
                });
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !categoryId || !amount}
            variant={type === "income" ? "default" : "destructive"}
          >
            Guardar {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}


