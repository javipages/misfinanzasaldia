import { ExportData } from "@/hooks/use-movements";

export type ExportFormat = "csv" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
}

// Utility function to download blob data
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper function to format numbers with comma as decimal separator (Spanish format)
const formatNumber = (num: number): string => {
  return num.toLocaleString("es-ES").replace(/\s/g, ""); // Remove spaces from number formatting
};

// CSV Export
export const exportToCSV = (
  data: ExportData,
  options: ExportOptions = { format: "csv", includeHeaders: true }
): void => {
  const filename = options.filename || `movimientos-${data.year}.csv`;

  if (data.movements.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  const headers = [
    "Fecha",
    "Tipo",
    "Categoría",
    "Descripción",
    "Cantidad (€)",
    "Año",
    "Mes",
  ];

  // Helper function to properly escape CSV fields
  const escapeCSVField = (field: string): string => {
    // If field contains comma, quotes, or newlines, wrap in quotes and escape internal quotes
    if (
      field.includes(",") ||
      field.includes('"') ||
      field.includes("\n") ||
      field.includes("\r")
    ) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvContent = [
    ...(options.includeHeaders ? [headers.join(",")] : []),
    ...data.movements.map((movement) =>
      [
        new Date(movement.created_at).toLocaleDateString("es-ES"),
        movement.type === "income" ? "Ingreso" : "Gasto",
        escapeCSVField(movement.category_name),
        escapeCSVField(movement.description || ""),
        formatNumber(movement.amount),
        movement.year.toString(),
        movement.month.toString(),
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
};

// PDF Export for movements
export const exportMovementsToPDF = (
  data: ExportData,
  options: ExportOptions = { format: "pdf" }
): void => {
  const filename = options.filename || `movimientos-${data.year}.pdf`;
  // Use filename variable to avoid linting warning
  console.log(`Exporting to: ${filename}`);

  // Create a new window with print-optimized content
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Por favor, habilita las ventanas emergentes para generar el PDF");
    return;
  }

  const summaryHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2563eb; text-align: center; margin-bottom: 30px;">Reporte de Movimientos ${
        data.year
      }</h1>

      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="color: #1e40af; margin-bottom: 20px;">Resumen</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold;">Año:</td>
            <td style="padding: 10px;">${data.year}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold;">Total Ingresos:</td>
            <td style="padding: 10px; color: #16a34a;">${data.totalIncome.toLocaleString(
              "es-ES"
            )} €</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold;">Total Gastos:</td>
            <td style="padding: 10px; color: #dc2626;">${data.totalExpenses.toLocaleString(
              "es-ES"
            )} €</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold;">Balance:</td>
            <td style="padding: 10px; color: ${
              data.balance >= 0 ? "#16a34a" : "#dc2626"
            };">${formatNumber(data.balance)} €</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Movimientos:</td>
            <td style="padding: 10px;">${data.movements.length}</td>
          </tr>
        </table>
      </div>

      <div>
        <h2 style="color: #1e40af; margin-bottom: 20px;">Detalle de Movimientos</h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Fecha</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Tipo</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Categoría</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Descripción</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Cantidad (€)</th>
            </tr>
          </thead>
          <tbody>
            ${data.movements
              .map(
                (movement, index) => `
              <tr style="background: ${
                index % 2 === 0 ? "#ffffff" : "#f8fafc"
              };">
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date(
                  movement.created_at
                ).toLocaleDateString("es-ES")}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">
                  <span style="background: ${
                    movement.type === "income" ? "#dcfce7" : "#fef2f2"
                  }; color: ${
                  movement.type === "income" ? "#166534" : "#991b1b"
                }; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                    ${movement.type === "income" ? "Ingreso" : "Gasto"}
                  </span>
                </td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${
                  movement.category_name
                }</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${
                  movement.description || ""
                }</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e2e8f0; color: ${
                  movement.type === "income" ? "#16a34a" : "#dc2626"
                };">
                  ${movement.type === "income" ? "+" : "-"}${formatNumber(
                  movement.amount
                )}
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 40px; text-align: center; color: #64748b; font-size: 12px;">
        <p>Generado el ${new Date().toLocaleDateString(
          "es-ES"
        )} a las ${new Date().toLocaleTimeString("es-ES")}</p>
      </div>
    </div>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Reporte de Movimientos ${data.year}</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${summaryHTML}
        <div class="no-print" style="text-align: center; margin: 20px;">
          <button onclick="window.print()" style="background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer;">
            Imprimir / Guardar como PDF
          </button>
          <button onclick="window.close()" style="background: #64748b; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; margin-left: 10px;">
            Cerrar
          </button>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
};

// Generic export function
export const exportData = (
  data: ExportData,
  format: ExportFormat,
  options?: Partial<ExportOptions>
): void => {
  const exportOptions: ExportOptions = {
    format,
    filename: options?.filename || `export-${data.year}-${format}`,
    includeHeaders: options?.includeHeaders ?? true,
  };

  switch (format) {
    case "csv":
      exportToCSV(data, exportOptions);
      break;
    case "pdf":
      exportMovementsToPDF(data, exportOptions);
      break;
    default:
      throw new Error(`Formato de exportación no soportado: ${format}`);
  }
};
