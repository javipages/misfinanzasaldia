import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listIncomeCategories,
  listExpenseCategories,
  listIncomeEntries,
  listExpenseEntries,
  createIncomeEntry,
  createExpenseEntry,
  updateIncomeEntry,
  updateExpenseEntry,
  deleteIncomeEntry,
  deleteExpenseEntry,
  type EntryRow,
  updateIncomeCategory,
  updateExpenseCategory,
} from "@/integrations/supabase/categories";
import { useUserStore } from "@/store/user";

type Kind = "income" | "expense";

type MatrixSubcategory = {
  id: string;
  category_id: string;
  name: string;
  display_order: number;
};

type MatrixCategory = {
  id: string;
  name: string;
  display_order: number;
  subcategories: MatrixSubcategory[];
};

const QK = {
  categories: (kind: Kind, year: number) =>
    ["categories", kind, year] as const,
  entries: (kind: Kind, year: number) => ["entries", kind, year] as const,
  // Summary-only categories (without subcategories) must use a different key
  categoriesSummary: (kind: Kind, year: number) =>
    ["categories-summary", kind, year] as const,
};

export function useAllCategories() {
  const year = useUserStore((s) => s.year);
  const incomeCategoriesQuery = useQuery({
    queryKey: QK.categoriesSummary("income", year),
    queryFn: async () => {
      const rows = await listIncomeCategories(year);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        display_order: r.display_order,
      }));
    },
  });

  const expenseCategoriesQuery = useQuery({
    queryKey: QK.categoriesSummary("expense", year),
    queryFn: async () => {
      const rows = await listExpenseCategories(year);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        display_order: r.display_order,
      }));
    },
  });

  return {
    incomeCategories: incomeCategoriesQuery.data ?? [],
    expenseCategories: expenseCategoriesQuery.data ?? [],
    isLoading:
      incomeCategoriesQuery.isLoading || expenseCategoriesQuery.isLoading,
    isFetching:
      incomeCategoriesQuery.isFetching || expenseCategoriesQuery.isFetching,
  };
}

export function useCategoryMatrix(kind: Kind, year: number) {
  const qc = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: QK.categories(kind, year),
    queryFn: async (): Promise<MatrixCategory[]> => {
      const rows =
        kind === "income"
          ? await listIncomeCategories(year)
          : await listExpenseCategories(year);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        display_order: r.display_order,
        subcategories: (r.subcategories ?? []).map((s) => ({
          id: s.id,
          category_id: s.category_id,
          name: s.name,
          display_order: s.display_order,
        })),
      }));
    },
  });

  const entriesQuery = useQuery({
    queryKey: QK.entries(kind, year),
    queryFn: async (): Promise<EntryRow[]> => {
      return kind === "income"
        ? await listIncomeEntries(year)
        : await listExpenseEntries(year);
    },
  });

  const matrix = useMemo(() => {
    const categories = [...(categoriesQuery.data ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    );
    const entries = entriesQuery.data ?? [];

    const entriesByCategory = new Map<string, EntryRow[]>();
    const entriesBySubcategory = new Map<string, EntryRow[]>();

    for (const entry of entries) {
      if (entry.subcategory_id) {
        const collection = entriesBySubcategory.get(entry.subcategory_id);
        if (collection) {
          collection.push(entry);
        } else {
          entriesBySubcategory.set(entry.subcategory_id, [entry]);
        }
      } else {
        const collection = entriesByCategory.get(entry.category_id);
        if (collection) {
          collection.push(entry);
        } else {
          entriesByCategory.set(entry.category_id, [entry]);
        }
      }
    }

    return categories.map((category) => {
      const ownTotals = Array(12).fill(0) as number[];
      const totals = Array(12).fill(0) as number[];

      const sortedSubcategories = (category.subcategories ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order);

      const subcategories = sortedSubcategories.map((sub) => {
        const subTotals = Array(12).fill(0) as number[];
        for (const entry of entriesBySubcategory.get(sub.id) ?? []) {
          if (entry.category_id !== category.id) continue;
          const idx = Math.max(0, Math.min(11, entry.month - 1));
          const amount = Number(entry.amount ?? 0);
          subTotals[idx] += amount;
          totals[idx] += amount;
        }
        return {
          ...sub,
          totals: subTotals,
        };
      });

      for (const entry of entriesByCategory.get(category.id) ?? []) {
        const idx = Math.max(0, Math.min(11, entry.month - 1));
        const amount = Number(entry.amount ?? 0);
        ownTotals[idx] += amount;
        totals[idx] += amount;
      }

      return {
        category: {
          id: category.id,
          name: category.name,
          display_order: category.display_order,
        },
        subcategories,
        ownTotals,
        totals,
      };
    });
  }, [categoriesQuery.data, entriesQuery.data]);

  const values = useMemo(
    () => matrix.map((row) => row.totals),
    [matrix]
  );

  const swapOrder = useMutation({
    mutationFn: async ({
      aId,
      aOrder,
      bOrder,
    }: {
      aId: string;
      aOrder: number;
      bId: string;
      bOrder: number;
    }) => {
      // Calculate new positions properly
      const fromIndex = aOrder - 1; // Convert to 0-based index
      const toIndex = bOrder - 1; // Convert to 0-based index

      if (fromIndex === toIndex) return;

      const categories = [...(categoriesQuery.data ?? [])].sort(
        (a, b) => a.display_order - b.display_order
      );

      const movingCategory = categories.find((c) => c.id === aId);
      if (!movingCategory) return;

      // Remove the moving category from its current position
      categories.splice(fromIndex, 1);

      // Insert it at the new position
      categories.splice(toIndex, 0, movingCategory);

      // Update all display_order values to be consecutive
      const updates = categories.map((category, index) => ({
        id: category.id,
        display_order: index + 1,
      }));

      // Execute all updates
      if (kind === "income") {
        await Promise.all(
          updates.map((update) =>
            updateIncomeCategory(
              update.id,
              {
                display_order: update.display_order,
              },
              year
            )
          )
        );
      } else {
        await Promise.all(
          updates.map((update) =>
            updateExpenseCategory(
              update.id,
              {
                display_order: update.display_order,
              },
              year
            )
          )
        );
      }
    },
    onMutate: async ({ aId, aOrder, bOrder }) => {
      await qc.cancelQueries({ queryKey: QK.categories(kind, year) });
      const prev = qc.getQueryData<MatrixCategory[]>(
        QK.categories(kind, year)
      );

      if (prev) {
        // Calculate new positions for optimistic update
        const fromIndex = aOrder - 1;
        const toIndex = bOrder - 1;

        if (fromIndex !== toIndex) {
          const categories = [...prev].sort(
            (a, b) => a.display_order - b.display_order
          );
          const movingCategory = categories.find((c) => c.id === aId);

          if (movingCategory) {
            // Remove from current position
            categories.splice(fromIndex, 1);
            // Insert at new position
            categories.splice(toIndex, 0, movingCategory);

            // Update display_order values
            const next = categories.map((category, index) => ({
              ...category,
              display_order: index + 1,
            }));

            qc.setQueryData(QK.categories(kind, year), next);
          }
        }
      }

      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.categories(kind, year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.categories(kind, year) });
    },
  });

  const addEntry = useMutation({
    mutationFn: async ({
      categoryId,
      subcategoryId,
      month,
      amount,
      description,
    }: {
      categoryId: string;
      subcategoryId?: string | null;
      month: number; // 1-12
      amount: number;
      description?: string | null;
    }) => {
      if (kind === "income") {
        return createIncomeEntry({
          category_id: categoryId,
          subcategory_id: subcategoryId ?? null,
          year,
          month,
          amount,
          description: description ?? null,
        });
      }
      return createExpenseEntry({
        category_id: categoryId,
        subcategory_id: subcategoryId ?? null,
        year,
        month,
        amount,
        description: description ?? null,
      });
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: QK.entries(kind, year) });
      const prev = qc.getQueryData<EntryRow[]>(QK.entries(kind, year));
      const optimistic: EntryRow = {
        id: `tmp-${Math.random().toString(36).slice(2)}`,
        user_id: "",
        category_id: vars.categoryId,
        subcategory_id: vars.subcategoryId ?? null,
        year,
        month: vars.month,
        amount: vars.amount,
        description: vars.description ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<EntryRow[]>(QK.entries(kind, year), [
        optimistic,
        ...(prev ?? []),
      ]);
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.entries(kind, year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.entries(kind, year) });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<
        Pick<
          EntryRow,
          | "amount"
          | "description"
          | "month"
          | "category_id"
          | "subcategory_id"
          | "year"
        >
      >;
    }) => {
      return kind === "income"
        ? await updateIncomeEntry(id, patch)
        : await updateExpenseEntry(id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: QK.entries(kind, year) });
      const prev = qc.getQueryData<EntryRow[]>(QK.entries(kind, year));
      if (prev) {
        qc.setQueryData<EntryRow[]>(
          QK.entries(kind, year),
          prev.map((e) =>
            e.id === id
              ? { ...e, ...patch, updated_at: new Date().toISOString() }
              : e
          )
        );
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.entries(kind, year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.entries(kind, year) });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      return kind === "income"
        ? await deleteIncomeEntry(id)
        : await deleteExpenseEntry(id);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.entries(kind, year) });
      const prev = qc.getQueryData<EntryRow[]>(QK.entries(kind, year));
      if (prev) {
        qc.setQueryData<EntryRow[]>(
          QK.entries(kind, year),
          prev.filter((e) => e.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.entries(kind, year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.entries(kind, year) });
    },
  });

  const sortedCategories = useMemo(
    () =>
      matrix.map((row) => ({
        id: row.category.id,
        name: row.category.name,
        display_order: row.category.display_order,
        subcategories: (row.subcategories ?? []).map((sub) => ({
          id: sub.id,
          category_id: sub.category_id,
          name: sub.name,
          display_order: sub.display_order,
        })),
      })),
    [matrix]
  );

  return {
    categories: sortedCategories,
    entries: entriesQuery.data ?? [],
    matrix,
    values,
    isLoading: categoriesQuery.isLoading || entriesQuery.isLoading,
    isFetching: categoriesQuery.isFetching || entriesQuery.isFetching,
    addEntry,
    updateEntry,
    deleteEntry,
    swapOrder,
  };
}
