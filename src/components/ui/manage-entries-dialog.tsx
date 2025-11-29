import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MONTHS } from "@/utils/constants";

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
  const [local, setLocal] = useState<{ id: string; amount: string; description: string | null }[]>(
    entries.map(e => ({ ...e, amount: String(e.amount) }))
  );
  const [newAmount, setNewAmount] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const newAmountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLocal(entries.map(e => ({ ...e, amount: String(e.amount) })));
      setNewAmount("");
      setNewDesc("");
      requestAnimationFrame(() => {
        newAmountInputRef.current?.focus();
      });
    }
  }, [open, entries]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const title = kind === "income" ? "Ingresos" : "Gastos";
  const context = subcategoryName
    ? `${categoryName} · ${subcategoryName}`
    : categoryName;

  const handleExistingKeyDown = async (
    event: React.KeyboardEvent<HTMLInputElement>,
    entryId: string
  ) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const current = local.find((x) => x.id === entryId);
    if (!current) return;
    await onUpdate(entryId, {
      amount: Number(current.amount.replace(',', '.') || 0),
      description: current.description ?? null,
    });
  };

  const handleCreateSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!newAmount) return;
    const normalizedNew = (newAmount ?? "").replace(",", ".");
    await onCreate({
      amount: Number(normalizedNew || 0),
      description: newDesc ? newDesc : null,
    });
    setNewAmount("");
    setNewDesc("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        className="relative bg-background rounded-md shadow-lg w-full max-w-lg mx-4 p-4 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-entries-dialog-title"
        tabIndex={-1}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="manage-entries-dialog-title"
            className="text-lg font-semibold"
          >
            {title} · {context} · {MONTHS[month - 1]}
          </h2>
          <Button
            variant="outline"
            onClick={onClose}
            className="self-end sm:self-auto"
          >
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
                  onKeyDown={(ev) => void handleExistingKeyDown(ev, e.id)}
                />
              </div>
              <div className="md:col-span-4">
                <Input
                  // Allow comma input; normalize on save/Enter
                  type="text"
                  placeholder="Cantidad"
                  value={String(e.amount)}
                  onChange={(ev) =>
                    setLocal((prev) =>
                      prev.map((x) =>
                        x.id === e.id
                          ? {
                              ...x,
                              amount: ev.target.value,
                            }
                          : x
                      )
                    )
                  }
                  onKeyDown={(ev) => void handleExistingKeyDown(ev, e.id)}
                />
              </div>
              <div className="flex justify-start gap-2 md:col-span-4 md:justify-end">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const current = local.find((x) => x.id === e.id);
                    if (!current) return;
                    await onUpdate(e.id, {
                      amount: Number(current.amount.replace(',', '.') || 0),
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
          <form
            className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center"
            onSubmit={handleCreateSubmit}
          >
            <div className="md:col-span-4">
              <Input
                placeholder="Descripción"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="md:col-span-4">
              <Input
                // Allow comma input; normalize on submit
                type="text"
                placeholder="Cantidad"
                value={newAmount}
                ref={newAmountInputRef}
                onChange={(e) => setNewAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-start md:col-span-4 md:justify-end">
              <Button type="submit" disabled={!newAmount}>
                Añadir
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
