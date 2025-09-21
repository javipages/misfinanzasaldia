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
      bId,
      bOrder,
    }: {
      aId: string;
      aOrder: number;
      bId: string;
      bOrder: number;
    }) => {
      const current = (categoriesQuery.data ?? []).map((x) => x.display_order);
      const maxOrder = current.length ? Math.max(...current) : 0;
      const tempOrder = Math.max(maxOrder + 1, aOrder + 1, bOrder + 1);
      if (kind === "income") {
        await updateIncomeCategory(aId, { display_order: tempOrder });
        await updateIncomeCategory(bId, { display_order: aOrder });
        await updateIncomeCategory(aId, { display_order: bOrder });
      } else {
        await updateExpenseCategory(aId, { display_order: tempOrder });
        await updateExpenseCategory(bId, { display_order: aOrder });
        await updateExpenseCategory(aId, { display_order: bOrder });
      }
    },
    onMutate: async ({ aId, aOrder, bId, bOrder }) => {
      await qc.cancelQueries({ queryKey: QK.categories(kind) });
      const prev = qc.getQueryData<
        { id: string; name: string; display_order: number }[]
      >(QK.categories(kind));
      if (prev) {
        const next = prev.map((c) => {
          if (c.id === aId) return { ...c, display_order: bOrder };
          if (c.id === bId) return { ...c, display_order: aOrder };
          return c;
        });
        next.sort((a, b) => a.display_order - b.display_order);
        qc.setQueryData(QK.categories(kind), next);
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
