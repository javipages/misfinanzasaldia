import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  Fragment,
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
import { MONTHS } from "@/utils/constants";

export type CategoryMatrixRef = {
  openAddDialog: (
    categoryId?: string | null,
    subcategoryId?: string | null,
    month?: number | null
  ) => void;
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
      matrix,
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
    console.log(matrix);
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
      subcategoryId: string | null;
      month: number | null;
    }>({ categoryId: null, subcategoryId: null, month: null });
    const [manageOpen, setManageOpen] = useState(false);
    const [manageCtx, setManageCtx] = useState<{
      categoryId: string | null;
      categoryName: string | null;
      subcategoryId: string | null;
      subcategoryName: string | null;
      month: number | null; // 1-12
    }>({
      categoryId: null,
      categoryName: null,
      subcategoryId: null,
      subcategoryName: null,
      month: null,
    });
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
      new Set()
    );

    const toggleCategory = (categoryId: string) => {
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        if (next.has(categoryId)) {
          next.delete(categoryId);
        } else {
          next.add(categoryId);
        }
        return next;
      });
    };

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
      openAddDialog: (
        categoryId?: string | null,
        subcategoryId?: string | null,
        month?: number | null
      ) => {
        setPreset({
          categoryId: categoryId ?? null,
          subcategoryId: subcategoryId ?? null,
          month: month ?? null,
        });
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
                  items={matrix.map((row) => row.category.id)}
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
                      {matrix.map((row, rowIdx) => (
                        <Fragment key={row.category.id}>
                          <SortableRow
                            id={row.category.id}
                            className={rowIdx % 2 === 1 ? "bg-muted/80" : ""}
                          >
                            <td className="p-3 font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <RowHandle id={row.category.id} />
                                {(row.subcategories ?? []).length > 0 && (
                                  <button
                                    onClick={() =>
                                      toggleCategory(row.category.id)
                                    }
                                    className="text-muted-foreground hover:text-foreground transition-transform duration-200"
                                    style={{
                                      transform: expandedCategories.has(
                                        row.category.id
                                      )
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                    }}
                                    aria-label={
                                      expandedCategories.has(row.category.id)
                                        ? "Colapsar subcategorías"
                                        : "Expandir subcategorías"
                                    }
                                  >
                                    ▶
                                  </button>
                                )}
                                <span className="flex-1">
                                  {row.category.name}
                                </span>
                                {(row.subcategories ?? []).length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({(row.subcategories ?? []).length})
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="shrink-0 hidden md:inline-flex"
                                  onClick={() => {
                                    setPreset({
                                      categoryId: row.category.id,
                                      subcategoryId: null,
                                      month: null,
                                    });
                                    setAddOpen(true);
                                  }}
                                >
                                  +
                                </Button>
                              </div>
                            </td>

                            {MONTHS.map((_, monthIndex) => (
                              <td key={monthIndex} className="p-1 text-center">
                                <div
                                  className="p-2 rounded cursor-pointer hover:bg-muted/50 font-medium"
                                  onClick={() => {
                                    setManageCtx({
                                      categoryId: row.category.id,
                                      categoryName: row.category.name,
                                      subcategoryId: null,
                                      subcategoryName: null,
                                      month: monthIndex + 1,
                                    });
                                    setManageOpen(true);
                                  }}
                                >
                                  €
                                  {Number(
                                    row.totals[monthIndex] ?? 0
                                  ).toLocaleString()}
                                </div>
                              </td>
                            ))}
                            <td className="p-3 text-center font-bold">
                              €{calculateRowTotal(row.totals).toLocaleString()}
                            </td>
                          </SortableRow>

                          {expandedCategories.has(row.category.id) &&
                            (row.subcategories ?? []).map((sub) => (
                              <tr
                                key={sub.id}
                                className="border-b border-border/50 bg-muted/20"
                              >
                                <td className="p-3 pl-10 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">•</span>
                                    <span className="flex-1">{sub.name}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="shrink-0 hidden md:inline-flex"
                                      onClick={() => {
                                        setPreset({
                                          categoryId: row.category.id,
                                          subcategoryId: sub.id,
                                          month: null,
                                        });
                                        setAddOpen(true);
                                      }}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </td>
                                {MONTHS.map((_, monthIndex) => (
                                  <td
                                    key={monthIndex}
                                    className="p-1 text-center"
                                  >
                                    <div
                                      className="p-2 rounded cursor-pointer hover:bg-muted/40 text-sm"
                                      onClick={() => {
                                        setManageCtx({
                                          categoryId: row.category.id,
                                          categoryName: row.category.name,
                                          subcategoryId: sub.id,
                                          subcategoryName: sub.name,
                                          month: monthIndex + 1,
                                        });
                                        setManageOpen(true);
                                      }}
                                    >
                                      €
                                      {Number(
                                        sub.totals[monthIndex] ?? 0
                                      ).toLocaleString()}
                                    </div>
                                  </td>
                                ))}
                                <td className="p-3 text-center font-medium text-muted-foreground">
                                  €
                                  {calculateRowTotal(
                                    sub.totals
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                        </Fragment>
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
          defaultSubcategoryId={preset.subcategoryId ?? undefined}
          defaultMonth={preset.month ?? undefined}
          onSubmit={async ({
            categoryId,
            subcategoryId,
            month,
            amount,
            description,
          }) => {
            await addEntry.mutateAsync({
              categoryId,
              subcategoryId,
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
                e.year === resolvedYear &&
                (manageCtx.subcategoryId
                  ? e.subcategory_id === manageCtx.subcategoryId
                  : e.subcategory_id == null)
            )
            .map((e) => ({
              id: e.id,
              amount: e.amount,
              description: e.description,
            }))}
          subcategoryName={manageCtx.subcategoryName ?? undefined}
          onCreate={async ({ amount, description }) => {
            if (!manageCtx.categoryId || !manageCtx.month) return;
            await addEntry.mutateAsync({
              categoryId: manageCtx.categoryId,
              subcategoryId: manageCtx.subcategoryId,
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
