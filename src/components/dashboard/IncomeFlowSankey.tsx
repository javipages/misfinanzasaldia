import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import type { TooltipProps } from "recharts";
import type { MonthlyData } from "@/hooks/use-dashboard-data";

type SankeyNodeDatum = {
  name: string;
  fill: string;
  labelPosition: "left" | "center" | "right";
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
    return "€0";
  }

  const abs = Math.abs(value);
  if (abs >= 1000) {
    const compact = value / 1000;
    const digits = abs >= 10000 ? 1 : 2;
    return `€${compact.toFixed(digits)}K`;
  }

  return `€${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const formatPercentage = (value?: number) => {
  if (value === undefined) {
    return undefined;
  }
  return `${(value * 100).toFixed(1)}%`;
};

const SankeyCustomNode = ({
  x,
  y,
  width,
  height,
  payload,
}: SankeyCustomNodeProps) => {
  const textAnchor =
    payload.labelPosition === "left"
      ? "end"
      : payload.labelPosition === "center"
      ? "middle"
      : "start";
  const textX =
    payload.labelPosition === "left"
      ? x - 16
      : payload.labelPosition === "center"
      ? x + width / 2
      : x + width + 16;
  const lineHeight = 18;
  const linesCount = 2;
  const baseY = y + height / 2 - ((linesCount - 1) * lineHeight) / 2;
  const percentageText = formatPercentage(payload.percentage);

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
        fontSize={13}
        fontWeight={600}
        fill="hsl(var(--foreground))"
      >
        {payload.name}
      </text>
      <text
        x={textX}
        y={baseY + lineHeight}
        textAnchor={textAnchor}
        fontSize={12}
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

const SankeyTooltipContent = ({
  active,
  payload,
}: TooltipProps<number, string>) => {
  if (!active || !payload?.length) {
    return null;
  }

  const datum = payload[0]?.payload as {
    source?: { name: string };
    target?: { name: string };
    value: number;
    percentage?: number;
  };

  if (!datum) {
    return null;
  }

  const percentageText = formatPercentage(datum.percentage);

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-sm">
      {datum.source?.name && datum.target?.name ? (
        <div className="mb-1 font-medium text-foreground">
          {datum.source.name} → {datum.target.name}
        </div>
      ) : null}
      <div className="text-foreground">
        {formatCurrency(datum.value)}
        {percentageText ? (
          <span className="text-muted-foreground">
            {" "}
            {`(${percentageText})`}
          </span>
        ) : null}
      </div>
    </div>
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
      labelPosition: "center",
      amount: totalIngresosValue,
      role: "income-total",
    });

    const gastoTotalIndex = nodes.length;
    nodes.push({
      name: "Gasto total",
      fill: "#b91c1c",
      labelPosition: "center",
      amount: totalGastosValue,
      percentage: totalIngresosValue
        ? totalGastosValue / totalIngresosValue
        : undefined,
      role: "expense-total",
    });

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

    let deficitIndex: number | null = null;
    if (totalGastosValue > totalIngresosValue) {
      const deficit = totalGastosValue - totalIngresosValue;
      nodes.push({
        name: "Déficit",
        fill: "#f97316",
        labelPosition: "right",
        amount: deficit,
        percentage: totalGastosValue ? deficit / totalGastosValue : undefined,
        role: "deficit",
      });
      deficitIndex = nodes.length - 1;
    }

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
      <CardContent className="h-[680px]">
        {sankeyData ? (
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              nodeWidth={18}
              nodePadding={48}
              iterations={48}
              margin={{ top: 24, bottom: 24, left: 48, right: 48 }}
              linkCurvature={0.45}
              node={(props) => (
                <SankeyCustomNode {...(props as SankeyCustomNodeProps)} />
              )}
              link={{ strokeOpacity: 0.35 }}
            >
              <Tooltip content={<SankeyTooltipContent />} cursor={false} />
            </Sankey>
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
