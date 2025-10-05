import { getHeatmapColor, calculateVariation } from "./aggregation";

type Props = {
  value: number;
  previousValue?: number;
  maxValue: number;
  kind: "income" | "expense";
  showHeatmap: boolean;
  showVariation: boolean;
  onClick?: () => void;
  className?: string;
};

export function MatrixCell({
  value,
  previousValue,
  maxValue,
  kind,
  showHeatmap,
  showVariation,
  onClick,
  className = "",
}: Props) {
  const backgroundColor = showHeatmap
    ? getHeatmapColor(value, maxValue, kind)
    : "transparent";

  const variation =
    showVariation && previousValue !== undefined
      ? calculateVariation(value, previousValue)
      : null;

  return (
    <td className={`p-1 text-center ${className}`}>
      <div
        className="p-2 rounded cursor-pointer hover:bg-muted/50 font-medium transition-colors"
        style={{ backgroundColor }}
        onClick={onClick}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span>{Number(value).toLocaleString()} €</span>
          {variation && (
            <span
              className={`text-xs ${
                variation.absolute > 0
                  ? "text-green-600 dark:text-green-400"
                  : variation.absolute < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              }`}
            >
              {variation.absolute > 0 ? "+" : ""}
              {variation.percentage.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </td>
  );
}
