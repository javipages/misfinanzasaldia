import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useMyInvestorImport } from "@/hooks/use-myinvestor-import";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MyInvestorImportDialog({ open, onClose, onSuccess }: Props) {
  const {
    step,
    movements,
    result,
    error,
    isLoading,
    previewStats,
    handleFileUpload,
    importMovements,
    reset,
  } = useMyInvestorImport();

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleComplete = () => {
    if (onSuccess) onSuccess();
    handleClose();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar MyInvestor (CSV)
          </DialogTitle>
          <DialogDescription>
            Importa tus movimientos desde un archivo CSV de MyInvestor
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                ${error ? "border-destructive" : ""}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">Procesando archivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    Arrastra tu archivo CSV aquí
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    o haz clic para seleccionar
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="excel-upload" className="cursor-pointer">
                      Seleccionar archivo
                    </label>
                  </Button>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
              <p className="font-medium mb-2">Formato esperado:</p>
              <p>
                El archivo debe contener las columnas: Fecha de la orden, ISIN,
                Importe estimado, Nº de participaciones, Estado
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{previewStats.total}</div>
                  <div className="text-xs text-muted-foreground">
                    Movimientos
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {previewStats.finalizadas}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    A importar
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {previewStats.uniqueIsins}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fondos únicos
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(previewStats.totalAmount)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </CardContent>
              </Card>
            </div>

            {/* Preview table */}
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.slice(0, 20).map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">
                        {m.fecha}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {m.isin}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(m.importe)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.estado?.toLowerCase() === "finalizada"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {m.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {movements.length > 20 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        ... y {movements.length - 20} más
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Subir otro archivo
              </Button>
              <Button onClick={importMovements} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Importar {previewStats.finalizadas} movimientos
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Importando movimientos...</p>
            <p className="text-sm text-muted-foreground">
              Consultando información de fondos y creando inversiones
            </p>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === "complete" && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  ¡Importación completada!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Se han procesado {result.imported + result.duplicates + result.errors} movimientos
                </p>
              </div>
            </div>

            {/* Results summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">
                    {result.imported}
                  </div>
                  <div className="text-xs text-muted-foreground">Importados</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {result.duplicates}
                  </div>
                  <div className="text-xs text-muted-foreground">Duplicados</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">
                    {result.errors}
                  </div>
                  <div className="text-xs text-muted-foreground">Errores</div>
                </CardContent>
              </Card>
            </div>

            {/* New funds created */}
            {result.newFunds.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Nuevos fondos creados automáticamente:
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.newFunds.map((isin) => (
                    <Badge key={isin} variant="secondary">
                      {isin}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleComplete}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
