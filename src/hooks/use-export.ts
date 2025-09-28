import { useMemo } from "react";
import { useMovements, ExportData } from "@/hooks/use-movements";
import { exportData as exportToFile, ExportFormat } from "@/utils/export";
import { useUserStore } from "@/store/user";

export function useExport() {
  const year = useUserStore((s) => s.year);
  const { movements, isLoading } = useMovements(year);

  const movementExportData: ExportData | null = useMemo(() => {
    if (isLoading || !movements) {
      return null;
    }

    const totalIncome = movements
      .filter((m) => m.type === "income")
      .reduce((sum, m) => sum + m.amount, 0);

    const totalExpenses = movements
      .filter((m) => m.type === "expense")
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      movements,
      year,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  }, [movements, year, isLoading]);

  const exportMovementsToFormat = (format: ExportFormat, filename?: string) => {
    if (!movementExportData) {
      alert("No hay datos disponibles para exportar");
      return;
    }

    exportToFile(movementExportData, format, { filename });
  };

  const exportToCSV = (filename?: string) =>
    exportMovementsToFormat("csv", filename);
  const exportToPDF = (filename?: string) =>
    exportMovementsToFormat("pdf", filename);

  return {
    exportData: movementExportData,
    isLoading,
    // Movements export
    exportToCSV,
    exportToPDF,
    exportMovementsToFormat,
    // Dashboard export
  };
}
