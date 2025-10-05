import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type EditableEntry = {
  id: string;
  amount: number;
  description: string | null;
};

type Props = {
  open: boolean;
  kind: "income" | "expense";
  month: number; // 1-12
  categoryName: string;
  subcategoryName?: string | null;
  entries: EditableEntry[];
  onCreate: (data: {
    amount: number;
    description: string | null;
  }) => Promise<void> | void;
  onUpdate: (
    id: string,
    patch: { amount?: number; description?: string | null }
  ) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onClose: () => void;
};

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function ManageEntriesDialog({
  open,
  kind,
  month,
  categoryName,
  subcategoryName = null,
  entries,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}: Props) {
  const [local, setLocal] = useState<EditableEntry[]>(entries);
  const [newAmount, setNewAmount] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");

  useEffect(() => {
    if (open) {
      setLocal(entries);
      setNewAmount("");
      setNewDesc("");
    }
  }, [open, entries]);

  if (!open) return null;

  const title = kind === "income" ? "Ingresos" : "Gastos";
  const context = subcategoryName
    ? `${categoryName} · ${subcategoryName}`
    : categoryName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-background rounded-md shadow-lg w-full max-w-lg mx-4 p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">
            {title} · {context} · {MONTHS[month - 1]}
          </h2>
          <Button variant="outline" onClick={onClose} className="self-end sm:self-auto">
            Cerrar
          </Button>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-auto">
          {local.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center"
            >
              <div className="md:col-span-4">
                <Input
                  placeholder="Descripción"
                  value={e.description ?? ""}
                  onChange={(ev) =>
                    setLocal((prev) =>
                      prev.map((x) =>
                        x.id === e.id
                          ? { ...x, description: ev.target.value }
                          : x
                      )
                    )
                  }
                />
              </div>
              <div className="md:col-span-4">
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={String(e.amount)}
                  onChange={(ev) =>
                    setLocal((prev) =>
                      prev.map((x) =>
                        x.id === e.id
                          ? { ...x, amount: Number(ev.target.value || 0) }
                          : x
                      )
                    )
                  }
                />
              </div>
              <div className="flex justify-start gap-2 md:col-span-4 md:justify-end">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const current = local.find((x) => x.id === e.id);
                    if (!current) return;
                    await onUpdate(e.id, {
                      amount: current.amount,
                      description: current.description ?? null,
                    });
                  }}
                >
                  Guardar
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await onDelete(e.id);
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
            <div className="md:col-span-4">
              <Input
                placeholder="Descripción"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="md:col-span-4">
              <Input
                type="number"
                placeholder="Cantidad"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-start md:col-span-4 md:justify-end">
              <Button
                onClick={async () => {
                  await onCreate({
                    amount: Number(newAmount || 0),
                    description: newDesc ? newDesc : null,
                  });
                  setNewAmount("");
                  setNewDesc("");
                }}
                disabled={!newAmount}
              >
                Añadir
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
