import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Textarea component - using a simple textarea element instead
import { type InvestmentItem } from "@/hooks/use-investments";

type InvestmentMode = "create_new" | "add_to_existing";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (investment: {
    name: string;
    type: "etf" | "acciones" | "crypto" | "fondos" | "bonos" | "otros";
    initial_amount: number;
    account_id: string;
    purchase_date: string;
    description?: string;
  }) => void;
  onAddToExisting?: (
    existingInvestmentId: string,
    amount: number,
    date: string,
    description?: string
  ) => void;
  initialData?: Partial<InvestmentItem>;
  availableAccounts?: Array<{ id: string; name: string }>;
  existingInvestments?: Array<{
    id: string;
    name: string;
    account_name: string;
    total_amount: number;
  }>;
  isEditing?: boolean;
};

const INVESTMENT_TYPES = [
  { value: "etf", label: "ETF" },
  { value: "acciones", label: "Acciones" },
  { value: "crypto", label: "Criptomonedas" },
  { value: "fondos", label: "Fondos de Inversión" },
  { value: "bonos", label: "Bonos" },
  { value: "otros", label: "Otros" },
] as const;

export function AddInvestmentDialog({
  open,
  onClose,
  onSubmit,
  onAddToExisting,
  initialData,
  availableAccounts = [],
  existingInvestments = [],
  isEditing = false,
}: Props) {
  const [investmentMode, setInvestmentMode] = useState<InvestmentMode>(
    initialData ? "create_new" : "create_new"
  );
  const [selectedExistingInvestment, setSelectedExistingInvestment] =
    useState<string>("");

  const [formData, setFormData] = useState({
    name: initialData?.name ?? "",
    type: (initialData?.type ?? "etf") as InvestmentItem["type"],
    initial_amount: initialData?.initial_amount?.toString() ?? "",
    account_id: initialData?.account_id ?? availableAccounts[0]?.id ?? "",
    purchase_date: initialData?.purchase_date
      ? new Date(initialData.purchase_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    description: initialData?.description ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (investmentMode === "create_new") {
      if (!formData.name.trim()) {
        newErrors.name = "El nombre es requerido";
      }

      if (!formData.account_id) {
        newErrors.account_id = "Debe seleccionar una cuenta de inversión";
      }
    } else if (investmentMode === "add_to_existing") {
      if (!selectedExistingInvestment) {
        newErrors.selectedInvestment =
          "Debe seleccionar una inversión existente";
      }
    }

    if (!formData.initial_amount || parseFloat(formData.initial_amount) <= 0) {
      newErrors.initial_amount = "El importe debe ser mayor que 0";
    }

    if (!formData.purchase_date) {
      newErrors.purchase_date = "La fecha es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (investmentMode === "create_new") {
      onSubmit({
        name: formData.name.trim(),
        type: formData.type,
        initial_amount: parseFloat(formData.initial_amount),
        account_id: formData.account_id,
        purchase_date: formData.purchase_date,
        description: formData.description.trim() || undefined,
      });
    } else if (investmentMode === "add_to_existing" && onAddToExisting) {
      onAddToExisting(
        selectedExistingInvestment,
        parseFloat(formData.initial_amount),
        formData.purchase_date,
        formData.description.trim() || undefined
      );
    }

    onClose();
  };

  const handleClose = () => {
    setInvestmentMode("create_new");
    setSelectedExistingInvestment("");
    setFormData({
      name: "",
      type: "etf",
      initial_amount: "",
      account_id: availableAccounts[0]?.id ?? "",
      purchase_date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[min(100vw-2rem,520px)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Editar Inversión"
              : investmentMode === "create_new"
              ? "Nueva Inversión"
              : "Añadir Aporte"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los detalles de tu inversión"
              : investmentMode === "create_new"
              ? "Crea una nueva inversión en tu portafolio"
              : "Añade dinero a una inversión existente"}
          </DialogDescription>
        </DialogHeader>

        {/* Mode selector */}
        <div className="space-y-2">
          <Label>¿Qué quieres hacer?</Label>
          <Select
            value={investmentMode}
            onValueChange={(value: InvestmentMode) => {
              if (
                value === "add_to_existing" &&
                existingInvestments.length === 0
              ) {
                // Don't allow switching to add mode if no investments exist
                return;
              }

              setInvestmentMode(value);
              setSelectedExistingInvestment("");

              if (value === "create_new") {
                setFormData((prev) => ({
                  ...prev,
                  name: "",
                  account_id: availableAccounts[0]?.id ?? "",
                }));
              } else if (value === "add_to_existing") {
                // Clear form data when switching to add mode
                setFormData((prev) => ({
                  ...prev,
                  name: "",
                  account_id: "",
                }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="create_new">Crear nueva inversión</SelectItem>
              <SelectItem
                value="add_to_existing"
                disabled={existingInvestments.length === 0}
              >
                Añadir a inversión existente
                {existingInvestments.length === 0 && " (sin inversiones)"}
              </SelectItem>
            </SelectContent>
          </Select>

          {existingInvestments.length === 0 &&
            investmentMode === "create_new" && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                💡 Una vez que crees tu primera inversión, podrás seleccionar
                "Añadir a inversión existente" para hacer aportes adicionales.
              </div>
            )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {investmentMode === "create_new" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la inversión *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: ETF Vanguard Global, Bitcoin, etc."
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="existing_investment">
                Seleccionar inversión *
              </Label>
              <Select
                value={selectedExistingInvestment}
                onValueChange={(value) => {
                  setSelectedExistingInvestment(value);

                  // Pre-fill form data with existing investment info
                  if (value) {
                    const selectedInv = existingInvestments.find(
                      (inv) => inv.id === value
                    );
                    if (selectedInv) {
                      setFormData((prev) => ({
                        ...prev,
                        name: selectedInv.name,
                        account_id: selectedInv.account_name,
                      }));
                      // Clear errors when a valid investment is selected
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.selectedInvestment;
                        return newErrors;
                      });
                    }
                  } else {
                    // Clear form data when no investment is selected
                    setFormData((prev) => ({
                      ...prev,
                      name: "",
                      account_id: "",
                    }));
                    // Clear errors when switching selections
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.selectedInvestment;
                      return newErrors;
                    });
                  }
                }}
              >
                <SelectTrigger
                  className={
                    errors.selectedInvestment ? "border-destructive" : ""
                  }
                >
                  <SelectValue placeholder="Selecciona una inversión" />
                </SelectTrigger>
                <SelectContent>
                  {existingInvestments.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No hay inversiones disponibles
                    </div>
                  ) : (
                    existingInvestments.map((investment) => (
                      <SelectItem key={investment.id} value={investment.id}>
                        {investment.name} - {investment.account_name} (
                        {investment.total_amount.toLocaleString("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        })}
                        )
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.selectedInvestment && (
                <p className="text-sm text-destructive">
                  {errors.selectedInvestment}
                </p>
              )}
            </div>
          )}

          {investmentMode === "create_new" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de inversión *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: InvestmentItem["type"]) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_id">Cuenta de inversión *</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, account_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.account_id && (
                  <p className="text-sm text-destructive">
                    {errors.account_id}
                  </p>
                )}
              </div>
            </>
          )}

          {investmentMode === "add_to_existing" &&
            selectedExistingInvestment && (
              <div className="space-y-2">
                <Label>Información de la inversión seleccionada</Label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  <div>
                    <strong>Nombre:</strong>{" "}
                    {formData.name || "Sin seleccionar"}
                  </div>
                  <div>
                    <strong>Cuenta:</strong>{" "}
                    {formData.account_id || "Sin seleccionar"}
                  </div>
                </div>
              </div>
            )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="initial_amount">
                {investmentMode === "create_new"
                  ? "Importe inicial (€) *"
                  : "Importe del aporte (€) *"}
              </Label>
              <Input
                id="initial_amount"
                type="number"
                step="0.01"
                value={formData.initial_amount}
                onChange={(e) =>
                  setFormData({ ...formData, initial_amount: e.target.value })
                }
                placeholder={
                  investmentMode === "create_new" ? "1000.00" : "500.00"
                }
                className={errors.initial_amount ? "border-destructive" : ""}
              />
              {errors.initial_amount && (
                <p className="text-sm text-destructive">
                  {errors.initial_amount}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase_date">Fecha de compra *</Label>
            <Input
              id="purchase_date"
              type="date"
              value={formData.purchase_date}
              onChange={(e) =>
                setFormData({ ...formData, purchase_date: e.target.value })
              }
              className={errors.purchase_date ? "border-destructive" : ""}
            />
            {errors.purchase_date && (
              <p className="text-sm text-destructive">{errors.purchase_date}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Notas adicionales sobre esta inversión..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing
                ? "Actualizar Inversión"
                : investmentMode === "create_new"
                ? "Crear Inversión"
                : "Añadir Aporte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
