import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddValueDialog } from "@/components/ui/add-value-dialog";
import { ManageEntriesDialog } from "@/components/ui/manage-entries-dialog";

import {
  listIncomeCategories,
  listExpenseCategories,
  listIncomeEntries,
  listExpenseEntries,
  createIncomeEntry,
  createExpenseEntry,
  type EntryRow,
  updateIncomeEntry,
  updateExpenseEntry,
  deleteIncomeEntry,
  deleteExpenseEntry,
} from "@/integrations/supabase/categories";
import { useYearStore } from "@/store/year";

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

export function CategoryMatrix({ kind, year, onStatsChange }: Props) {
  const storeYear = useYearStore((s) => s.year);
  const resolvedYear = year ?? storeYear;
  const onStatsRef = useRef<typeof onStatsChange>(onStatsChange);
  useEffect(() => {
    onStatsRef.current = onStatsChange;
  }, [onStatsChange]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<number[][]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [preset, setPreset] = useState<{
    categoryId: string | null;
    month: number | null;
  }>({ categoryId: null, month: null });
  const [manageOpen, setManageOpen] = useState(false);
  const [manageCtx, setManageCtx] = useState<{
    categoryId: string | null;
    categoryName: string | null;
    month: number | null; // 1-12
  }>({ categoryId: null, categoryName: null, month: null });

  function buildMatrixFromEntries(
    cats: { id: string; name: string }[],
    allEntries: EntryRow[]
  ) {
    return cats.map((c) => {
      const row = Array(12).fill(0) as number[];
      allEntries
        .filter((v) => v.category_id === c.id)
        .forEach((v) => {
          row[v.month - 1] += Number(v.amount ?? 0);
        });
      return row;
    });
  }

  const refreshEntriesAndMatrix = useCallback(
    async (cats: { id: string; name: string }[]) => {
      const vals =
        kind === "income"
          ? await listIncomeEntries(resolvedYear)
          : await listExpenseEntries(resolvedYear);
      setEntries(vals);
      const matrix = buildMatrixFromEntries(cats, vals);
      setValues(matrix);
    },
    [kind, resolvedYear]
  );

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
        await refreshEntriesAndMatrix(cats);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [kind, refreshEntriesAndMatrix, resolvedYear]);

  const calculateRowTotal = (data: number[]) => data.reduce((s, v) => s + v, 0);
  const calculateColumnTotal = (all: number[][], monthIndex: number) =>
    all.reduce((sum, row) => sum + row[monthIndex], 0);

  useEffect(() => {
    if (!onStatsRef.current || values.length === 0) return;
    const monthlyTotals = MONTHS.map((_, i) => calculateColumnTotal(values, i));
    const yearTotal = monthlyTotals.reduce((s, v) => s + v, 0);
    const monthlyAverage = yearTotal / 12;
    let bestIndex = 0;
    for (let i = 1; i < monthlyTotals.length; i++) {
      if (monthlyTotals[i] > monthlyTotals[bestIndex]) bestIndex = i;
    }
    onStatsRef.current({
      monthlyTotals,
      yearTotal,
      monthlyAverage,
      bestMonth: { index: bestIndex, amount: monthlyTotals[bestIndex] ?? 0 },
    });
  }, [values, resolvedYear]);

  async function persistValue(
    categoryId: string,
    monthIndex: number,
    amount: number,
    description?: string | null
  ) {
    if (kind === "income") {
      await createIncomeEntry({
        category_id: categoryId,
        year: resolvedYear,
        month: monthIndex + 1,
        amount,
        description: description ?? null,
      });
    } else {
      await createExpenseEntry({
        category_id: categoryId,
        year: resolvedYear,
        month: monthIndex + 1,
        amount,
        description: description ?? null,
      });
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {kind === "income"
            ? `Ingresos ${resolvedYear}`
            : `Gastos ${resolvedYear}`}
          <Button
            onClick={() => {
              setPreset({ categoryId: null, month: null });
              setAddOpen(true);
            }}
          >
            {kind === "income" ? "Añadir ingreso" : "Añadir gasto"}
          </Button>
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
                    <td className="p-3 font-medium text-foreground flex justify-between items-center">
                      {category.name}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPreset({ categoryId: category.id, month: null });
                          setAddOpen(true);
                        }}
                      >
                        +
                      </Button>
                    </td>

                    {values[rowIdx].map((value, monthIndex) => (
                      <td key={monthIndex} className="p-1 text-center">
                        <div
                          className="p-2 rounded cursor-pointer hover:bg-muted/50 font-medium"
                          onClick={() => {
                            setManageCtx({
                              categoryId: category.id,
                              categoryName: category.name,
                              month: monthIndex + 1,
                            });
                            setManageOpen(true);
                          }}
                        >
                          €{Number(value).toLocaleString()}
                        </div>
                      </td>
                    ))}
                    <td className="p-3 text-center font-bold">
                      €{calculateRowTotal(values[rowIdx]).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-muted/20">
                  <td className="p-3 font-bold">TOTAL</td>
                  <td />
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
      <AddValueDialog
        open={addOpen}
        kind={kind}
        categories={categories}
        defaultCategoryId={preset.categoryId ?? undefined}
        defaultMonth={preset.month ?? undefined}
        onSubmit={async ({ categoryId, month, amount, description }) => {
          const monthIndex = month - 1;
          await persistValue(
            categoryId,
            monthIndex,
            amount,
            description ?? null
          );
          await refreshEntriesAndMatrix(categories);
        }}
        onClose={() => setAddOpen(false)}
      />
      <ManageEntriesDialog
        open={manageOpen}
        kind={kind}
        month={manageCtx.month ?? 1}
        categoryName={manageCtx.categoryName ?? ""}
        entries={entries
          .filter(
            (e) =>
              e.category_id === manageCtx.categoryId &&
              e.month === (manageCtx.month ?? 0) &&
              e.year === resolvedYear
          )
          .map((e) => ({
            id: e.id,
            amount: e.amount,
            description: e.description,
          }))}
        onCreate={async ({ amount, description }) => {
          if (!manageCtx.categoryId || !manageCtx.month) return;
          if (kind === "income") {
            await createIncomeEntry({
              category_id: manageCtx.categoryId,
              year: resolvedYear,
              month: manageCtx.month,
              amount,
              description: description ?? null,
            });
          } else {
            await createExpenseEntry({
              category_id: manageCtx.categoryId,
              year: resolvedYear,
              month: manageCtx.month,
              amount,
              description: description ?? null,
            });
          }
          await refreshEntriesAndMatrix(categories);
        }}
        onUpdate={async (id, patch) => {
          if (kind === "income") {
            await updateIncomeEntry(id, patch);
          } else {
            await updateExpenseEntry(id, patch);
          }
          await refreshEntriesAndMatrix(categories);
        }}
        onDelete={async (id) => {
          if (kind === "income") {
            await deleteIncomeEntry(id);
          } else {
            await deleteExpenseEntry(id);
          }
          await refreshEntriesAndMatrix(categories);
        }}
        onClose={() => setManageOpen(false)}
      />
    </Card>
  );
}
