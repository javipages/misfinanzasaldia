import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types
interface MyInvestorMovement {
  fecha: string;
  isin: string;
  importe: number;
  participaciones: number;
  estado: string;
}

interface ProcessedMovement {
  fecha: string;
  isin: string;
  importe: number;
  participaciones: number;
  fundName: string;
  investmentId: string | null;
  status: "imported" | "duplicate" | "error" | "pending";
  error?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: number;
  movements: ProcessedMovement[];
  newFunds: string[];
}

interface ImportState {
  step: "upload" | "preview" | "importing" | "complete";
  movements: MyInvestorMovement[];
  result: ImportResult | null;
  error: string | null;
  isLoading: boolean;
}

// Parse number - handles both Spanish (1.234,56) and international (300.23) formats
function parseNumber(value: string | number): number {
  if (typeof value === "number") return value;
  
  const trimmed = value.trim();
  if (!trimmed) return 0;
  
  // Check for Spanish format: uses comma as decimal separator
  // Examples: "1.234,56" or "48,527" or "300,23"
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  
  if (hasComma && hasDot) {
    // Both present: Spanish format (1.234,56)
    // Dot is thousands separator, comma is decimal
    return parseFloat(trimmed.replace(/\./g, "").replace(",", ".")) || 0;
  }
  
  if (hasComma && !hasDot) {
    // Only comma: Spanish decimal (48,527 or 300,23)
    return parseFloat(trimmed.replace(",", ".")) || 0;
  }
  
  if (hasDot && !hasComma) {
    // Only dot: could be international decimal (300.23) or Spanish thousands (1.234)
    // If dot is followed by exactly 2 digits at end, treat as decimal
    const dotMatch = trimmed.match(/\.(\d+)$/);
    if (dotMatch && (dotMatch[1].length === 2 || dotMatch[1].length === 1)) {
      // International format: 300.23 or 300.2
      return parseFloat(trimmed) || 0;
    }
    // Otherwise Spanish thousands: 1.234 -> 1234
    return parseFloat(trimmed.replace(/\./g, "")) || 0;
  }
  
  // No separators: plain number
  return parseFloat(trimmed) || 0;
}

// Parse importe (e.g., "600 EUR" -> 600)
function parseImporte(value: string | number): number {
  if (typeof value === "number") return value;
  const match = value.match(/[\d.,]+/);
  if (!match) return 0;
  return parseNumber(match[0]);
}

// Parse CSV file
function parseCSVFile(file: File): Promise<MyInvestorMovement[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          throw new Error("El archivo CSV está vacío o no tiene datos");
        }

        // Parse header (first line) - handle different delimiters
        const delimiter = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/"/g, ""));

        // Find column indexes
        const fechaIdx = headers.findIndex((h) =>
          h.toLowerCase().includes("fecha")
        );
        const isinIdx = headers.findIndex((h) =>
          h.toLowerCase().includes("isin")
        );
        const importeIdx = headers.findIndex((h) =>
          h.toLowerCase().includes("importe")
        );
        const participacionesIdx = headers.findIndex((h) =>
          h.toLowerCase().includes("participaciones")
        );
        const estadoIdx = headers.findIndex((h) =>
          h.toLowerCase().includes("estado")
        );

        if (isinIdx === -1) {
          throw new Error("No se encontró la columna ISIN en el CSV");
        }

        // Parse data rows
        const movements: MyInvestorMovement[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(delimiter).map((v) => v.trim().replace(/"/g, ""));

          if (values.length < headers.length) continue;

          const fecha = fechaIdx >= 0 ? values[fechaIdx] : "";
          const isin = isinIdx >= 0 ? values[isinIdx] : "";
          const importeRaw = importeIdx >= 0 ? values[importeIdx] : "0";
          const participacionesRaw =
            participacionesIdx >= 0 ? values[participacionesIdx] : "0";
          const estado = estadoIdx >= 0 ? values[estadoIdx] : "";

          if (isin) {
            movements.push({
              fecha,
              isin: isin.trim(),
              importe: parseImporte(importeRaw),
              participaciones: parseNumber(participacionesRaw),
              estado: estado.trim(),
            });
          }
        }

        // Filter out empty rows
        const validMovements = movements.filter(
          (m) => m.isin && m.fecha && m.importe > 0
        );

        resolve(validMovements);
      } catch (error) {
        reject(
          new Error(
            `Error parsing CSV: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsText(file, "UTF-8");
  });
}

export function useMyInvestorImport() {
  const [state, setState] = useState<ImportState>({
    step: "upload",
    movements: [],
    result: null,
    error: null,
    isLoading: false,
  });

  const reset = useCallback(() => {
    setState({
      step: "upload",
      movements: [],
      result: null,
      error: null,
      isLoading: false,
    });
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const movements = await parseCSVFile(file);

      if (movements.length === 0) {
        throw new Error(
          "No se encontraron movimientos válidos en el archivo"
        );
      }

      setState({
        step: "preview",
        movements,
        result: null,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Error al procesar archivo",
      }));
    }
  }, []);

  const importMovements = useCallback(async () => {
    setState((prev) => ({ ...prev, step: "importing", isLoading: true }));

    try {
      const { data, error } = await supabase.functions.invoke(
        "import-myinvestor",
        {
          body: { movements: state.movements },
        }
      );

      if (error) throw error;

      setState({
        step: "complete",
        movements: state.movements,
        result: data as ImportResult,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        step: "preview",
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al importar movimientos",
      }));
    }
  }, [state.movements]);

  // Calculate stats for preview
  const previewStats = {
    total: state.movements.length,
    finalizadas: state.movements.filter(
      (m) => m.estado?.toLowerCase() === "finalizada"
    ).length,
    totalAmount: state.movements
      .filter((m) => m.estado?.toLowerCase() === "finalizada")
      .reduce((sum, m) => sum + m.importe, 0),
    uniqueIsins: [...new Set(state.movements.map((m) => m.isin))].length,
  };

  return {
    ...state,
    previewStats,
    handleFileUpload,
    importMovements,
    reset,
  };
}
