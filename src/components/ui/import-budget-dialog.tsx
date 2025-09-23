import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    year: number;
    income_entries_created: number;
    expense_entries_created: number;
    total_entries_created: number;
  };
  error?: string;
}

interface ImportBudgetDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function ImportBudgetDialog({
  children,
  onSuccess,
}: ImportBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: async (budgetData: any): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke("import-budget", {
        body: budgetData,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as ImportResult;
    },
    onSuccess: (result) => {
      if (result.success && onSuccess) {
        onSuccess();
      }
    },
  });

  const validateAndParseJSON = (jsonString: string) => {
    try {
      setValidationError(null);
      const parsed = JSON.parse(jsonString);

      // Basic validation
      if (!parsed.year || typeof parsed.year !== "number") {
        throw new Error('El JSON debe contener un campo "year" numérico');
      }

      if (!parsed.incomes || !Array.isArray(parsed.incomes)) {
        throw new Error('El JSON debe contener un array "incomes"');
      }

      if (!parsed.expenses || !Array.isArray(parsed.expenses)) {
        throw new Error('El JSON debe contener un array "expenses"');
      }

      return parsed;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "JSON inválido";
      setValidationError(errorMessage);
      throw error;
    }
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setValidationError("Por favor, introduce el JSON del presupuesto");
      return;
    }

    try {
      const parsedData = validateAndParseJSON(jsonInput);
      await importMutation.mutateAsync(parsedData);
    } catch (error) {
      // Error already handled in validation
    }
  };

  const loadExampleData = () => {
    setJsonInput(`{
  "year": 2025,
  "incomes": [
    {
      "category": "TRABAJO",
      "monthly": {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 4456.13,
        "9": 2756.13
      }
    }
  ],
  "expenses": [
    {
      "category": "VIVIENDA",
      "monthly": {
        "1": 290.35,
        "2": 237.25,
        "3": 228.25,
        "4": 228.25,
        "5": 333.42,
        "6": 228.25,
        "7": 0,
        "8": 0,
        "9": 0
      }
    }
  ]
}`);
    setValidationError(null);
  };

  const handleClose = () => {
    setOpen(false);
    setJsonInput("");
    setValidationError(null);
    importMutation.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Presupuesto desde JSON
          </DialogTitle>
          <DialogDescription>
            Pega tu JSON de presupuesto para importarlo automáticamente. El
            formato debe incluir año, ingresos y gastos mensuales.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="budget-json">JSON del Presupuesto</Label>
            <Textarea
              id="budget-json"
              placeholder={`{
  "year": 2025,
  "incomes": [
    {
      "category": "TRABAJO",
      "monthly": {
        "1": 1000.00,
        "2": 1200.00,
        ...
      }
    }
  ],
  "expenses": [
    {
      "category": "VIVIENDA",
      "monthly": {
        "1": 500.00,
        "2": 500.00,
        ...
      }
    }
  ]
}`}
              value={jsonInput}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setJsonInput(e.target.value);
                setValidationError(null);
              }}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={loadExampleData}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Cargar Ejemplo
            </Button>
          </div>

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {importMutation.isSuccess && importMutation.data?.success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>¡Importación exitosa!</strong>
                <br />
                {importMutation.data.data && (
                  <>
                    Año: {importMutation.data.data.year}
                    <br />
                    Ingresos creados:{" "}
                    {importMutation.data.data.income_entries_created}
                    <br />
                    Gastos creados:{" "}
                    {importMutation.data.data.expense_entries_created}
                    <br />
                    Total: {importMutation.data.data.total_entries_created}{" "}
                    entradas
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {importMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error al importar:</strong>
                <br />
                {importMutation.error?.message || "Error desconocido"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            {importMutation.isSuccess ? "Cerrar" : "Cancelar"}
          </Button>
          <Button
            onClick={handleImport}
            disabled={importMutation.isPending || !jsonInput.trim()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {importMutation.isPending
              ? "Importando..."
              : "Importar Presupuesto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
