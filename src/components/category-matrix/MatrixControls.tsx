import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { PeriodType } from "./aggregation";

type Props = {
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  hideEmptyRows: boolean;
  onHideEmptyRowsChange: (hide: boolean) => void;
  showHeatmap: boolean;
  onShowHeatmapChange: (show: boolean) => void;
  showVariation: boolean;
  onShowVariationChange: (show: boolean) => void;
};

export function MatrixControls({
  periodType,
  onPeriodTypeChange,
  hideEmptyRows,
  onHideEmptyRowsChange,
  showHeatmap,
  onShowHeatmapChange,
  showVariation,
  onShowVariationChange,
}: Props) {
  const periods: { value: PeriodType; label: string }[] = [
    { value: "monthly", label: "Mensual" },
    { value: "quarterly", label: "Trimestral" },
    { value: "semiannual", label: "Semestral" },
    { value: "annual", label: "Anual" },
  ];

  return (
    <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3 md:p-4 shadow-xs">
      {/* Encabezado y layout responsivo */}
      <div className="flex flex-col gap-4 md:gap-5">
        {/* Selector de período (segmented) */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs md:text-sm font-medium text-muted-foreground">
            Período
          </Label>
          <div className="inline-flex flex-wrap items-center gap-1 rounded-md border bg-background p-1">
            {periods.map((period) => {
              const selected = periodType === period.value;
              return (
                <Button
                  key={period.value}
                  size="sm"
                  variant={selected ? "default" : "ghost"}
                  className={`rounded-md px-3 md:px-4 ${
                    selected ? "shadow-sm" : "hover:bg-accent/60"
                  }`}
                  aria-pressed={selected}
                  onClick={() => onPeriodTypeChange(period.value)}
                >
                  {period.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Opciones como chips */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => onHideEmptyRowsChange(!hideEmptyRows)}
            className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition-colors ${
              hideEmptyRows
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent text-foreground"
            }`}
            aria-pressed={hideEmptyRows}
          >
            <Checkbox
              id="hide-empty"
              checked={hideEmptyRows}
              aria-hidden
              className="pointer-events-none"
            />
            <Label
              htmlFor="hide-empty"
              className="cursor-default pointer-events-none"
            >
              Ocultar filas vacías
            </Label>
          </button>

          <button
            type="button"
            onClick={() => onShowHeatmapChange(!showHeatmap)}
            className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition-colors ${
              showHeatmap
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent text-foreground"
            }`}
            aria-pressed={showHeatmap}
          >
            <Checkbox
              id="show-heatmap"
              checked={showHeatmap}
              aria-hidden
              className="pointer-events-none"
            />
            <Label
              htmlFor="show-heatmap"
              className="cursor-default pointer-events-none"
            >
              Mapa de calor
            </Label>
          </button>

          <button
            type="button"
            onClick={() => onShowVariationChange(!showVariation)}
            className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition-colors ${
              showVariation
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent text-foreground"
            }`}
            aria-pressed={showVariation}
          >
            <Checkbox
              id="show-variation"
              checked={showVariation}
              aria-hidden
              className="pointer-events-none"
            />
            <Label
              htmlFor="show-variation"
              className="cursor-default pointer-events-none"
            >
              Mostrar variación
            </Label>
          </button>
        </div>
      </div>
    </div>
  );
}
