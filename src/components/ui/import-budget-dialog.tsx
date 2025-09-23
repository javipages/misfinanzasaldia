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
import {
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  Bot,
  Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllCategories } from "@/hooks/use-category-matrix";
import { Alert, AlertDescription } from "./alert";

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
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Get user's categories for the AI prompt
  const {
    incomeCategories,
    expenseCategories,
    isLoading: categoriesLoading,
  } = useAllCategories();

  const importMutation = useMutation({
    mutationFn: async (budgetData): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke("import-budget", {
        body: budgetData as any,
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

      // Allow empty or missing arrays (handled by backend)
      if (parsed.incomes !== undefined && !Array.isArray(parsed.incomes)) {
        throw new Error(
          'El campo "incomes" debe ser un array si está presente'
        );
      }

      if (parsed.expenses !== undefined && !Array.isArray(parsed.expenses)) {
        throw new Error(
          'El campo "expenses" debe ser un array si está presente'
        );
      }

      // At least one of incomes or expenses must be present
      if (
        (!parsed.incomes || parsed.incomes.length === 0) &&
        (!parsed.expenses || parsed.expenses.length === 0)
      ) {
        throw new Error(
          "El JSON debe contener al menos algunos ingresos o gastos"
        );
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
    } catch {
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

  const generateAIPrompt = () => {
    const incomeCats = incomeCategories.map((cat) => cat.name).join('", "');
    const expenseCats = expenseCategories.map((cat) => cat.name).join('", "');

    return `Analiza esta imagen o extracto bancario y conviértelo en un JSON estructurado para importar presupuestos financieros.

TUS CATEGORÍAS DISPONIBLES:
INGRESOS: "${incomeCats}"
GASTOS: "${expenseCats}"

El formato JSON debe ser exactamente así:

{
  "year": 2025,
  "incomes": [
    {
      "category": "CATEGORÍA_DE_INGRESO_EXISTENTE",
      "monthly": {
        "1": 1000.00,
        "2": 1200.00,
        "3": 1100.00,
        "4": 1200.00,
        "5": 1300.00,
        "6": 1100.00,
        "7": 1000.00,
        "8": 1200.00,
        "9": 1100.00,
        "10": 1200.00,
        "11": 1100.00,
        "12": 1000.00
      }
    }
  ],
  "expenses": [
    {
      "category": "CATEGORÍA_DE_GASTO_EXISTENTE",
      "monthly": {
        "1": 500.00,
        "2": 600.00,
        "3": 550.00,
        "4": 600.00,
        "5": 700.00,
        "6": 550.00,
        "7": 500.00,
        "8": 600.00,
        "9": 550.00,
        "10": 600.00,
        "11": 550.00,
        "12": 500.00
      }
    }
  ]
}

INSTRUCCIONES IMPORTANTES:
- Usa SOLO las categorías de ingresos que te mostré arriba
- Usa SOLO las categorías de gastos que te mostré arriba
- Para ingresos: usa solo los meses donde hay ingresos (puede estar vacío {})
- Para gastos: usa solo los meses donde hay gastos (puede estar vacío {})
- Si no hay ingresos en un mes, pon 0.00 o omite esa entrada del objeto monthly
- Si no hay gastos en un mes, pon 0.00 o omite esa entrada del objeto monthly
- Categoriza correctamente: ingresos van a "incomes", gastos van a "expenses"
- Usa solo números decimales con 2 decimales (ej: 1234.56)
- El campo "year" debe ser el año del presupuesto
- Si hay descripciones adicionales, puedes agregar un campo "description" opcional

Responde ÚNICAMENTE con el JSON válido, sin explicaciones adicionales.`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
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

          <div className="space-y-3">
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-sm">Generar JSON con IA</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Usa ChatGPT, Gemini u otro LLM para convertir tus extractos
                bancarios en JSON.
              </p>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Usa ChatGPT, Gemini u otro LLM para convertir tus extractos
                  bancarios en JSON.
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    📸 <strong>Opción 1:</strong> Sube una imagen de tu extracto
                    bancario
                  </p>
                  <p className="text-xs text-muted-foreground">
                    📄 <strong>Opción 2:</strong> Copia y pega el texto de tu
                    extracto bancario
                  </p>
                  <p className="text-xs text-muted-foreground">
                    🤖 <strong>Opción 3:</strong> Describe tus ingresos y gastos
                    manualmente
                  </p>
                </div>

                {categoriesLoading ? (
                  <div className="text-xs text-muted-foreground">
                    Cargando tus categorías...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="text-green-600">↗</span>{" "}
                      <strong>Tus categorías de ingresos:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {incomeCategories.map((cat) => (
                          <span
                            key={cat.id}
                            className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs">
                      <span className="text-red-600">↘</span>{" "}
                      <strong>Tus categorías de gastos:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {expenseCategories.map((cat) => (
                          <span
                            key={cat.id}
                            className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generateAIPrompt())}
                className="flex items-center gap-2 mt-3 w-full"
                disabled={categoriesLoading}
              >
                {copiedPrompt ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    ¡Prompt copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Prompt para IA
                  </>
                )}
              </Button>
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
