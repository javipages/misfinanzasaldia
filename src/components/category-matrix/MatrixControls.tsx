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
    <div className="flex flex-col gap-4 mb-4 p-4 bg-muted/30 rounded-lg border border-border">
      {/* Period selector */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Período</Label>
        <div className="flex flex-wrap gap-2">
          {periods.map((period) => (
            <Button
              key={period.value}
              size="sm"
              variant={periodType === period.value ? "default" : "outline"}
              onClick={() => onPeriodTypeChange(period.value)}
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="hide-empty"
            checked={hideEmptyRows}
            onCheckedChange={(checked) =>
              onHideEmptyRowsChange(checked === true)
            }
          />
          <Label htmlFor="hide-empty" className="text-sm cursor-pointer">
            Ocultar filas vacías
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="show-heatmap"
            checked={showHeatmap}
            onCheckedChange={(checked) => onShowHeatmapChange(checked === true)}
          />
          <Label htmlFor="show-heatmap" className="text-sm cursor-pointer">
            Mostrar mapa de calor
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="show-variation"
            checked={showVariation}
            onCheckedChange={(checked) =>
              onShowVariationChange(checked === true)
            }
          />
          <Label htmlFor="show-variation" className="text-sm cursor-pointer">
            Mostrar variación
          </Label>
        </div>
      </div>
    </div>
  );
}
