import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  listIncomeCategories,
  listExpenseCategories,
  listIncomeValues,
  listExpenseValues,
  upsertIncomeValue,
  upsertExpenseValue,
} from "@/integrations/supabase/categories";

type Props = {
  kind: "income" | "expense";
  year?: number;
  onStatsChange?: (stats: {
    monthlyTotals: number[];
    yearTotal: number;
    monthlyAverage: number;
    bestMonth: { index: number; amount: number };
  }) => void;
};

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export function CategoryMatrix({
  kind,
  year = new Date().getFullYear(),
  onStatsChange,
}: Props) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<number[][]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows =
          kind === "income"
            ? await listIncomeCategories()
            : await listExpenseCategories();
        if (!mounted) return;
        const cats = rows.map((r) => ({ id: r.id, name: r.name }));
        setCategories(cats);
        const vals =
          kind === "income"
            ? await listIncomeValues(year)
            : await listExpenseValues(year);
        const matrix = cats.map((c) => {
          const row = Array(12).fill(0) as number[];
          vals
            .filter((v) => v.category_id === c.id)
            .forEach((v) => {
              row[v.month - 1] = Number(v.amount ?? 0);
            });
          return row;
        });
        setValues(matrix);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [kind, year]);

  const calculateRowTotal = (data: number[]) => data.reduce((s, v) => s + v, 0);
  const calculateColumnTotal = (all: number[][], monthIndex: number) =>
    all.reduce((sum, row) => sum + row[monthIndex], 0);

  useEffect(() => {
    if (!onStatsChange || values.length === 0) return;
    const monthlyTotals = MONTHS.map((_, i) => calculateColumnTotal(values, i));
    const yearTotal = monthlyTotals.reduce((s, v) => s + v, 0);
    const monthlyAverage = yearTotal / 12;
    let bestIndex = 0;
    for (let i = 1; i < monthlyTotals.length; i++) {
      if (monthlyTotals[i] > monthlyTotals[bestIndex]) bestIndex = i;
    }
    onStatsChange({
      monthlyTotals,
      yearTotal,
      monthlyAverage,
      bestMonth: { index: bestIndex, amount: monthlyTotals[bestIndex] ?? 0 },
    });
  }, [values, onStatsChange]);

  async function persistValue(
    categoryId: string,
    monthIndex: number,
    amount: number
  ) {
    if (kind === "income") {
      await upsertIncomeValue(categoryId, year, monthIndex + 1, amount);
    } else {
      await upsertExpenseValue(categoryId, year, monthIndex + 1, amount);
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>
          {kind === "income" ? `Ingresos ${year}` : `Gastos ${year}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-semibold text-foreground min-w-[150px]">
                    Categoría
                  </th>
                  {MONTHS.map((month) => (
                    <th
                      key={month}
                      className="text-center p-3 font-semibold text-foreground min-w-[80px]"
                    >
                      {month}
                    </th>
                  ))}
                  <th className="text-center p-3 font-semibold min-w-[100px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, rowIdx) => (
                  <tr
                    key={category.id}
                    className="border-b border-border/50 hover:bg-muted/30"
                  >
                    <td className="p-3 font-medium text-foreground">
                      {category.name}
                    </td>
                    {values[rowIdx].map((value, monthIndex) => {
                      const cellKey = `${category.id}-${monthIndex}`;
                      const isEditing = editingCell === cellKey;
                      return (
                        <td key={monthIndex} className="p-1 text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              defaultValue={value}
                              className="w-16 h-8 text-center"
                              autoFocus
                              onBlur={(e) => {
                                const next = Number(e.currentTarget.value || 0);
                                setValues((prev) => {
                                  const copy = prev.map((r) => [...r]);
                                  copy[rowIdx][monthIndex] = next;
                                  return copy;
                                });
                                void persistValue(
                                  category.id,
                                  monthIndex,
                                  next
                                );
                                setEditingCell(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target =
                                    e.currentTarget as HTMLInputElement;
                                  const next = Number(target.value || 0);
                                  setValues((prev) => {
                                    const copy = prev.map((r) => [...r]);
                                    copy[rowIdx][monthIndex] = next;
                                    return copy;
                                  });
                                  void persistValue(
                                    category.id,
                                    monthIndex,
                                    next
                                  );
                                  setEditingCell(null);
                                }
                                if (e.key === "Escape") {
                                  setEditingCell(null);
                                }
                              }}
                            />
                          ) : (
                            <div
                              className="p-2 rounded cursor-pointer hover:bg-muted/50 font-medium"
                              onClick={() => setEditingCell(cellKey)}
                            >
                              €{Number(value).toLocaleString()}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-bold">
                      €{calculateRowTotal(values[rowIdx]).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-muted/20">
                  <td className="p-3 font-bold">TOTAL</td>
                  {MONTHS.map((_, monthIndex) => (
                    <td key={monthIndex} className="p-3 text-center font-bold">
                      €
                      {calculateColumnTotal(
                        values,
                        monthIndex
                      ).toLocaleString()}
                    </td>
                  ))}
                  <td className="p-3" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
