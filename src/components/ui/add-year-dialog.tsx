import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddYearDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (
    year: number,
    sourceYear: number | null,
    initialCategory?: { name: string; type: "income" | "expense" | "asset" }
  ) => Promise<void>;
  availableYears: number[];
  suggestedYear: number;
}

export function AddYearDialog({
  open,
  onClose,
  onConfirm,
  availableYears,
  suggestedYear,
}: AddYearDialogProps) {
  const [year, setYear] = useState(suggestedYear);
  const [mode, setMode] = useState<"fresh" | "clone">("clone");
  const [sourceYear, setSourceYear] = useState<number | null>(
    availableYears.length > 0 ? Math.max(...availableYears) : null
  );
  const [initialCategoryName, setInitialCategoryName] = useState("");
  const [initialCategoryType, setInitialCategoryType] = useState<
    "income" | "expense" | "asset"
  >("income");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);

    if (!year || year < 1900 || year > 3000) {
      setError("El año debe estar entre 1900 y 3000.");
      return;
    }

    if (availableYears.includes(year)) {
      setError("Este año ya existe.");
      return;
    }

    if (mode === "clone" && !sourceYear) {
      setError("Selecciona un año de origen para clonar.");
      return;
    }

    if (mode === "fresh" && !initialCategoryName.trim()) {
      setError("Introduce el nombre de la primera categoría.");
      return;
    }

    setLoading(true);
    try {
      await onConfirm(
        year,
        mode === "clone" ? sourceYear : null,
        mode === "fresh"
          ? { name: initialCategoryName.trim(), type: initialCategoryType }
          : undefined
      );
      onClose();
    } catch (err) {
      console.error("Error al crear el año:", err);
      setError("No se pudo crear el año. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir nuevo año</DialogTitle>
          <DialogDescription>
            Configura las categorías para el nuevo año.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="year" className="text-right">
              Año
            </Label>
            <Input
              id="year"
              autoFocus
              type="number"
              min={1900}
              max={3000}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="mode" className="text-right">
              Modo
            </Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as "fresh" | "clone")}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona un modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fresh">Empezar de cero</SelectItem>
                <SelectItem value="clone">Clonar desde año anterior</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "clone" && availableYears.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sourceYear" className="text-right">
                Año origen
              </Label>
              <Select
                value={sourceYear ? String(sourceYear) : ""}
                onValueChange={(v) => setSourceYear(Number(v))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un año" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === "fresh" && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryType" className="text-right">
                  Tipo
                </Label>
                <Select
                  value={initialCategoryType}
                  onValueChange={(v) =>
                    setInitialCategoryType(v as "income" | "expense" | "asset")
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Tipo de categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="asset">Patrimonio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="initialCategory" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="initialCategory"
                  placeholder={
                    initialCategoryType === "income"
                      ? "Ej: Salario"
                      : initialCategoryType === "expense"
                      ? "Ej: Alquiler"
                      : "Ej: Cuenta corriente"
                  }
                  value={initialCategoryName}
                  onChange={(e) => setInitialCategoryName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Creando..." : "Crear año"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
