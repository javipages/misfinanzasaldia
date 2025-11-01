import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, Sankey } from "recharts";
import type { MonthlyData } from "@/hooks/use-dashboard-data";

type SankeyNodeDatum = {
  name: string;
  fill: string;
  labelPosition: "left" | "center" | "right" | "top";
  amount: number;
  percentage?: number;
  role:
    | "income"
    | "income-total"
    | "expense-total"
    | "expense"
    | "savings"
    | "deficit";
};

type SankeyLinkDatum = {
  source: number;
  target: number;
  value: number;
  fill?: string;
  stroke?: string;
  percentage?: number;
};

type SankeyCustomNodeProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: SankeyNodeDatum;
};

interface IncomeCategory {
  name: string;
  value: number;
  color: string;
}

interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

interface IncomeFlowSankeyProps {
  monthlyData: MonthlyData[];
  incomeCategories: IncomeCategory[];
  expenseCategories: ExpenseCategory[];
  totalIngresos: number;
  totalGastos: number;
  selectedMonth?: number;
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) {
    return "0€";
  }

  const abs = Math.abs(value);
  if (abs >= 1000) {
    const compact = value / 1000;
    const digits = abs >= 10000 ? 1 : 2;
    return `${compact.toFixed(digits)}K€`;
  }

  const num = value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${num}€`;
};

const formatPercentage = (value?: number) => {
  if (value === undefined) {
    return undefined;
  }
  return `${(value * 100).toFixed(1)}%`;
};

const truncateMobileWords = (text: string, isMobile: boolean, maxLen = 10) => {
  if (!isMobile) return text;
  return text
    .split(" ")
    .map((word) => (word.length > maxLen ? `${word.slice(0, maxLen)}…` : word))
    .join(" ");
};

const SankeyCustomNode = ({
  x,
  y,
  width,
  height,
  payload,
}: SankeyCustomNodeProps) => {
  const isMobile = useIsMobile();
  const isTopLabel = payload.labelPosition === "top";
  const textAnchor = isTopLabel
    ? "middle"
    : payload.labelPosition === "left"
    ? "end"
    : payload.labelPosition === "center"
    ? "middle"
    : "start";

  const lineHeight = isMobile ? 16 : 18;
  const linesCount = 2;
  const percentageText = formatPercentage(payload.percentage);
  const displayName = truncateMobileWords(payload.name, isMobile);

  let textX: number;
  let baseY: number;

  const textOffset = isMobile ? 2 : 8;

  if (isTopLabel) {
    // Texto arriba del nodo
    textX = x + width / 2;
    baseY = y - 32;
  } else {
    // Texto al lado del nodo (comportamiento original)
    textX =
      payload.labelPosition === "left"
        ? x - textOffset
        : payload.labelPosition === "center"
        ? x + width / 2
        : x + width + textOffset;
    baseY = y + height / 2 - ((linesCount - 1) * lineHeight) / 2;
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.fill}
        rx={6}
        ry={6}
        opacity={
          payload.role === "income" || payload.role === "expense" ? 0.65 : 0.85
        }
      />
      <text
        x={textX}
        y={baseY}
        textAnchor={textAnchor}
        fontSize={isMobile ? 11 : 13}
        fontWeight={600}
        fill="hsl(var(--foreground))"
      >
        {displayName}
      </text>
      <text
        x={textX}
        y={baseY + lineHeight}
        textAnchor={textAnchor}
        fontSize={isMobile ? 10 : 12}
        fontWeight={500}
        fill="hsl(var(--foreground))"
      >
        {formatCurrency(payload.amount)}
        {percentageText ? (
          <tspan fill="hsl(var(--muted-foreground))">{` (${percentageText})`}</tspan>
        ) : null}
      </text>
    </g>
  );
};

export const IncomeFlowSankey = ({
  monthlyData,
  incomeCategories,
  expenseCategories,
  totalIngresos,
  totalGastos,
  selectedMonth,
  isLoading,
}: IncomeFlowSankeyProps) => {
  const isMobile = useIsMobile();
  const sankeyData = useMemo(() => {
    if (isLoading) {
      return null;
    }

    const isMonthlyView = selectedMonth !== undefined;
    const totalIngresosValue = isMonthlyView
      ? monthlyData[0]?.ingresos ?? 0
      : totalIngresos;
    const totalGastosValue = isMonthlyView
      ? monthlyData[0]?.gastos ?? 0
      : totalGastos;

    if (totalIngresosValue <= 0 && totalGastosValue <= 0) {
      return null;
    }

    const ahorro = totalIngresosValue - totalGastosValue;

    const incomeLimit = 5;
    const expenseLimit = 8;

    const topIncomeSources = incomeCategories.slice(0, incomeLimit);
    const remainingIncomeSources = incomeCategories.slice(incomeLimit);
    const remainingIncomeTotal = remainingIncomeSources.reduce(
      (sum, category) => sum + category.value,
      0
    );
    const incomeDisplay =
      remainingIncomeTotal > 0
        ? [
            ...topIncomeSources,
            {
              name: "Otros ingresos",
              value: remainingIncomeTotal,
              color: "#16a34a",
            },
          ]
        : topIncomeSources;

    const topExpenseCategories = expenseCategories.slice(0, expenseLimit);
    const remainingExpenseCategories = expenseCategories.slice(expenseLimit);
    const remainingExpenseTotal = remainingExpenseCategories.reduce(
      (sum, category) => sum + category.value,
      0
    );
    const expenseDisplay =
      remainingExpenseTotal > 0
        ? [
            ...topExpenseCategories,
            {
              name: "Resto",
              value: remainingExpenseTotal,
              color: "#fca5a5",
            },
          ]
        : topExpenseCategories;

    const nodes: SankeyNodeDatum[] = [];
    const links: SankeyLinkDatum[] = [];

    const incomeNodeIndices: number[] = [];
    incomeDisplay.forEach((income) => {
      if (income.value <= 0) {
        return;
      }
      nodes.push({
        name: income.name,
        fill: income.color,
        labelPosition: "left",
        amount: income.value,
        percentage: totalIngresosValue
          ? income.value / totalIngresosValue
          : undefined,
        role: "income",
      });
      incomeNodeIndices.push(nodes.length - 1);
    });

    const ingresoTotalIndex = nodes.length;
    nodes.push({
      name: "Ingreso total",
      fill: "#15803d",
      labelPosition: "top",
      amount: totalIngresosValue,
      role: "income-total",
    });

    // Déficit primero (si existe, irá arriba)
    let deficitIndex: number | null = null;
    if (totalGastosValue > totalIngresosValue) {
      const deficit = totalGastosValue - totalIngresosValue;
      nodes.push({
        name: "Déficit",
        fill: "#f97316",
        labelPosition: "left",
        amount: deficit,
        percentage: totalGastosValue ? deficit / totalGastosValue : undefined,
        role: "deficit",
      });
      deficitIndex = nodes.length - 1;
    }

    const gastoTotalIndex = nodes.length;
    nodes.push({
      name: "Gasto total",
      fill: "#b91c1c",
      labelPosition: "top",
      amount: totalGastosValue,
      percentage: totalIngresosValue
        ? totalGastosValue / totalIngresosValue
        : undefined,
      role: "expense-total",
    });

    // Añadimos los nodos de gastos (para que queden arriba)
    const expenseNodeIndices: number[] = [];
    expenseDisplay.forEach((expense) => {
      if (expense.value <= 0) {
        return;
      }
      nodes.push({
        name: expense.name,
        fill: expense.color,
        labelPosition: "right",
        amount: expense.value,
        percentage: totalGastosValue
          ? expense.value / totalGastosValue
          : undefined,
        role: "expense",
      });
      expenseNodeIndices.push(nodes.length - 1);
    });

    // Ahorro al final (para que quede abajo)
    let ahorroIndex: number | null = null;
    if (ahorro > 0) {
      nodes.push({
        name: "Ahorro",
        fill: "#2563eb",
        labelPosition: "right",
        amount: ahorro,
        percentage: totalIngresosValue
          ? ahorro / totalIngresosValue
          : undefined,
        role: "savings",
      });
      ahorroIndex = nodes.length - 1;
    }

    // Links
    incomeNodeIndices.forEach((index) => {
      const node = nodes[index];
      links.push({
        source: index,
        target: ingresoTotalIndex,
        value: node.amount,
        fill: node.fill,
        stroke: node.fill,
        percentage: node.percentage,
      });
    });

    if (deficitIndex !== null) {
      const node = nodes[deficitIndex];
      links.push({
        source: deficitIndex,
        target: gastoTotalIndex,
        value: node.amount,
        fill: node.fill,
        stroke: node.fill,
        percentage: node.percentage,
      });
    }

    const gastoFlow = Math.min(totalIngresosValue, totalGastosValue);
    if (gastoFlow > 0) {
      links.push({
        source: ingresoTotalIndex,
        target: gastoTotalIndex,
        value: gastoFlow,
        fill: "#ef4444",
        stroke: "#ef4444",
        percentage: totalIngresosValue
          ? gastoFlow / totalIngresosValue
          : undefined,
      });
    }

    expenseNodeIndices.forEach((index) => {
      const node = nodes[index];
      links.push({
        source: gastoTotalIndex,
        target: index,
        value: node.amount,
        fill: node.fill,
        stroke: node.fill,
        percentage: node.percentage,
      });
    });

    if (ahorroIndex !== null) {
      const node = nodes[ahorroIndex];
      links.push({
        source: ingresoTotalIndex,
        target: ahorroIndex,
        value: node.amount,
        fill: node.fill,
        stroke: node.fill,
        percentage: node.percentage,
      });
    }

    if (!links.length) {
      return null;
    }

    return { nodes, links };
  }, [
    expenseCategories,
    incomeCategories,
    isLoading,
    monthlyData,
    totalGastos,
    totalIngresos,
    selectedMonth,
  ]);

  return (
    <Card className="shadow-card md:col-span-2">
      <CardHeader>
        <CardTitle>Flujo de Ingresos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualiza cómo tus ingresos se reparten entre gastos, ahorro y
          financiación adicional.
        </p>
      </CardHeader>
      <CardContent className="h-[550px] px-0 md:px-4">
        {sankeyData ? (
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              nodeWidth={isMobile ? 12 : 18}
              nodePadding={isMobile ? 50 : 42}
              iterations={48}
              margin={
                isMobile
                  ? { top: 32, bottom: 16, left: 80, right: 85 }
                  : { top: 48, bottom: 24, left: 120, right: 120 }
              }
              linkCurvature={0.45}
              sort={false}
              node={(props) => (
                <SankeyCustomNode {...(props as SankeyCustomNodeProps)} />
              )}
              link={{ strokeOpacity: 0.35 }}
            ></Sankey>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay datos suficientes para mostrar el flujo de ingresos.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
