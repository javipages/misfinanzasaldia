import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AddValueDialog } from "@/components/ui/add-value-dialog";
import { ManageEntriesDialog } from "@/components/ui/manage-entries-dialog";

import { useUserStore } from "@/store/user";
import { useCategoryMatrix } from "@/hooks/use-category-matrix";
import { Skeleton } from "@/components/ui/skeleton";

export type CategoryMatrixRef = {
  openAddDialog: (categoryId?: string | null, month?: number | null) => void;
};

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

export const CategoryMatrix = forwardRef<CategoryMatrixRef, Props>(
  function CategoryMatrix({ kind, year, onStatsChange }: Props, ref) {
    const storeYear = useUserStore((s) => s.year);
    const resolvedYear = year ?? storeYear;
    const onStatsRef = useRef<typeof onStatsChange>(onStatsChange);
    useEffect(() => {
      onStatsRef.current = onStatsChange;
    }, [onStatsChange]);
    const {
      categories,
      entries,
      values,
      isLoading,
      addEntry,
      updateEntry,
      deleteEntry,
      swapOrder,
    } = useCategoryMatrix(kind, resolvedYear);
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    function RowHandle({ id }: { id: string }) {
      const { attributes, listeners } = useSortable({ id });
      return (
        <button
          aria-label="Mover"
          className="cursor-grab px-1"
          {...attributes}
          {...listeners}
        >
          ≡
        </button>
      );
    }

    function SortableRow({
      id,
      children,
      className = "",
    }: {
      id: string;
      children: React.ReactNode;
      className?: string;
    }) {
      const { setNodeRef, transform, transition, isDragging } = useSortable({
        id,
      });
      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      } as React.CSSProperties;
      return (
        <tr
          ref={setNodeRef}
          style={style}
          id={id}
          className={`border-b border-border/50 hover:bg-muted/30 ${className}`}
        >
          {children}
        </tr>
      );
    }

    function onDragEnd(event: DragEndEvent) {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const current = categories;
      const fromIdx = current.findIndex((r) => r.id === String(active.id));
      const toIdx = current.findIndex((r) => r.id === String(over.id));
      if (fromIdx < 0 || toIdx < 0) return;
      const a = current[fromIdx];
      const b = current[toIdx];
      void swapOrder.mutateAsync({
        aId: a.id,
        aOrder: a.display_order,
        bId: b.id,
        bOrder: b.display_order,
      });
    }
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

    const calculateRowTotal = (data: number[]) =>
      data.reduce((s, v) => s + v, 0);
    const calculateColumnTotal = (all: number[][], monthIndex: number) =>
      all.reduce((sum, row) => sum + row[monthIndex], 0);
    const calculateGrandTotal = (all: number[][]) =>
      all.reduce((sum, row) => sum + calculateRowTotal(row), 0);

    useEffect(() => {
      if (!onStatsRef.current || values.length === 0) return;
      const monthlyTotals = MONTHS.map((_, i) =>
        calculateColumnTotal(values, i)
      );
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

    useImperativeHandle(ref, () => ({
      openAddDialog: (categoryId?: string | null, month?: number | null) => {
        setPreset({ categoryId: categoryId ?? null, month: month ?? null });
        setAddOpen(true);
      },
    }));

    return (
      <>
        <div className="sr-only" aria-hidden>
          {kind === "income"
            ? `Ingresos ${resolvedYear}`
            : `Gastos ${resolvedYear}`}
        </div>
        <div>
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left">
                      <Skeleton className="h-4 w-32" />
                    </th>
                    {MONTHS.map((month) => (
                      <th key={month} className="p-3 text-center">
                        <Skeleton className="h-4 w-16 mx-auto" />
                      </th>
                    ))}
                    <th className="p-3 text-center">
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, rowIdx) => (
                    <tr
                      key={`loading-row-${rowIdx}`}
                      className="border-b border-border/50"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-6 w-6 hidden md:block" />
                        </div>
                      </td>
                      {MONTHS.map((month) => (
                        <td key={`${month}-${rowIdx}`} className="p-2">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <Skeleton className="h-6 w-16 mx-auto" />
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="p-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    {MONTHS.map((month) => (
                      <td key={`total-${month}`} className="p-3">
                        <Skeleton className="h-4 w-12 mx-auto" />
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <SortableContext
                  items={categories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <table className="w-full text-sm">
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
                        <SortableRow
                          key={category.id}
                          id={category.id}
                          className={rowIdx % 2 === 1 ? "bg-muted/80" : ""}
                        >
                          <td className="flex items-center gap-2 p-3 font-medium text-foreground">
                            <RowHandle id={category.id} />
                            <span className="flex-1">{category.name}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 hidden md:inline-flex"
                              onClick={() => {
                                setPreset({
                                  categoryId: category.id,
                                  month: null,
                                });
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
                            €
                            {calculateRowTotal(values[rowIdx]).toLocaleString()}
                          </td>
                        </SortableRow>
                      ))}
                      <tr className="border-t-2 bg-muted/20">
                        <td className="p-3 font-bold">TOTAL</td>
                        {MONTHS.map((_, monthIndex) => (
                          <td
                            key={monthIndex}
                            className="p-3 text-center font-bold"
                          >
                            €
                            {calculateColumnTotal(
                              values,
                              monthIndex
                            ).toLocaleString()}
                          </td>
                        ))}
                        <td className="p-3 text-center font-extrabold">
                          €{calculateGrandTotal(values).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
        <AddValueDialog
          open={addOpen}
          kind={kind}
          categories={categories}
          defaultCategoryId={preset.categoryId ?? undefined}
          defaultMonth={preset.month ?? undefined}
          onSubmit={async ({ categoryId, month, amount, description }) => {
            await addEntry.mutateAsync({
              categoryId,
              month,
              amount,
              description: description ?? null,
            });
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
            await addEntry.mutateAsync({
              categoryId: manageCtx.categoryId,
              month: manageCtx.month,
              amount,
              description: description ?? null,
            });
          }}
          onUpdate={async (id, patch) => {
            await updateEntry.mutateAsync({ id, patch });
          }}
          onDelete={async (id) => {
            await deleteEntry.mutateAsync(id);
          }}
          onClose={() => setManageOpen(false)}
        />
      </>
    );
  }
);
