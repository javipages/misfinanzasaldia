import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, FileText, FileImage, Loader2 } from "lucide-react";
import { useExport } from "@/hooks/use-export";
import { ExportFormat } from "@/utils/export";

export type ExportType = "movements" | "dashboard";

interface ExportDialogProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  defaultExportType?: ExportType;
}

export function ExportDialog({
  children,
  title = "Exportar Datos",
  description = "Selecciona el formato y personaliza el nombre del archivo",
  defaultExportType = "movements",
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [filename, setFilename] = useState("");
  const [exportType, setExportType] = useState<ExportType>(defaultExportType);
  const { exportToCSV, exportToPDF, isLoading } = useExport();

  const formatOptions = [
    {
      value: "csv" as ExportFormat,
      label: "CSV",
      description: "Archivo de texto plano, ideal para análisis de datos",
      icon: FileText,
    },
    {
      value: "pdf" as ExportFormat,
      label: "PDF",
      description: "Reporte formateado para impresión",
      icon: FileImage,
    },
  ];

  const exportTypeOptions = [
    {
      value: "movements" as ExportType,
      label: "Movimientos",
      description: "Exporta todos tus ingresos y gastos registrados",
    },
  ];

  const selectedFormatOption = formatOptions.find(
    (opt) => opt.value === format
  );
  const selectedExportTypeOption = exportTypeOptions.find(
    (opt) => opt.value === exportType
  );

  const handleExport = () => {
    const finalFilename = filename.trim() || undefined;

    if (exportType === "movements") {
      switch (format) {
        case "csv":
          exportToCSV(finalFilename);
          break;
        case "pdf":
          exportToPDF(finalFilename);
          break;
      }
    }

    setOpen(false);
    setFilename("");
  };

  const generateDefaultFilename = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `export-${year}-${month}-${day}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de datos</Label>
            <div className="grid grid-cols-1 gap-3">
              {exportTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`flex items-center p-3 border rounded-lg transition-colors text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    exportType === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setExportType(option.value)}
                  aria-pressed={exportType === option.value}
                >
                  <div className="h-5 w-5 mr-3 rounded-full bg-primary/20 flex items-center justify-center">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        exportType === option.value
                          ? "bg-primary"
                          : "bg-transparent"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Formato de exportación
            </Label>
            <div className="grid grid-cols-1 gap-3">
              {formatOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex items-center p-3 border rounded-lg transition-colors text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      format === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setFormat(option.value)}
                    aria-pressed={format === option.value}
                  >
                    <IconComponent className="h-5 w-5 mr-3 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                    <div className="ml-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          format === option.value
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {format === option.value && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filename Input */}
          <div className="space-y-2">
            <Label htmlFor="filename" className="text-sm font-medium">
              Nombre del archivo
            </Label>
            <div className="flex gap-2">
              <Input
                id="filename"
                placeholder={generateDefaultFilename()}
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilename(generateDefaultFilename())}
              >
                Generar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Se agregará automáticamente la extensión .{format}
            </p>
          </div>

          {/* Export Type and Format Description */}
          <div className="space-y-3">
            {selectedExportTypeOption && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <span className="text-sm font-medium">
                    {selectedExportTypeOption.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedExportTypeOption.description}
                </p>
              </div>
            )}

            {selectedFormatOption && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <selectedFormatOption.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedFormatOption.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedFormatOption.description}
                </p>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
