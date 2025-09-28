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

type Kind = "income" | "expense";

const QK = {
  categories: (kind: Kind) => ["categories", kind] as const,
  entries: (kind: Kind, year: number) => ["entries", kind, year] as const,
};

export function useAllCategories() {
  const incomeCategoriesQuery = useQuery({
    queryKey: QK.categories("income"),
    queryFn: async () => {
      const rows = await listIncomeCategories();
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        display_order: r.display_order,
      }));
    },
  });

  const expenseCategoriesQuery = useQuery({
    queryKey: QK.categories("expense"),
    queryFn: async () => {
      const rows = await listExpenseCategories();
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
    queryKey: QK.categories(kind),
    queryFn: async () => {
      const rows =
        kind === "income"
          ? await listIncomeCategories()
          : await listExpenseCategories();
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        display_order: r.display_order,
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

  const values = useMemo(() => {
    const cats = categoriesQuery.data ?? [];
    const all = entriesQuery.data ?? [];
    return cats.map((c) => {
      const row = Array(12).fill(0) as number[];
      all
        .filter((v) => v.category_id === c.id)
        .forEach((v) => {
          row[v.month - 1] += Number(v.amount ?? 0);
        });
      return row;
    });
  }, [categoriesQuery.data, entriesQuery.data]);

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
            updateIncomeCategory(update.id, {
              display_order: update.display_order,
            })
          )
        );
      } else {
        await Promise.all(
          updates.map((update) =>
            updateExpenseCategory(update.id, {
              display_order: update.display_order,
            })
          )
        );
      }
    },
    onMutate: async ({ aId, aOrder, bOrder }) => {
      await qc.cancelQueries({ queryKey: QK.categories(kind) });
      const prev = qc.getQueryData<
        { id: string; name: string; display_order: number }[]
      >(QK.categories(kind));

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

            qc.setQueryData(QK.categories(kind), next);
          }
        }
      }

      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.categories(kind), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.categories(kind) });
    },
  });

  const addEntry = useMutation({
    mutationFn: async ({
      categoryId,
      month,
      amount,
      description,
    }: {
      categoryId: string;
      month: number; // 1-12
      amount: number;
      description?: string | null;
    }) => {
      if (kind === "income") {
        return createIncomeEntry({
          category_id: categoryId,
          year,
          month,
          amount,
          description: description ?? null,
        });
      }
      return createExpenseEntry({
        category_id: categoryId,
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
          "amount" | "description" | "month" | "category_id" | "year"
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

  return {
    categories: (categoriesQuery.data ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order),
    entries: entriesQuery.data ?? [],
    values,
    isLoading: categoriesQuery.isLoading || entriesQuery.isLoading,
    isFetching: categoriesQuery.isFetching || entriesQuery.isFetching,
    addEntry,
    updateEntry,
    deleteEntry,
    swapOrder,
  };
}
