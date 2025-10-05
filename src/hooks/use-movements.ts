import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listIncomeEntries,
  listExpenseEntries,
  createIncomeEntry,
  createExpenseEntry,
  updateIncomeEntry,
  updateExpenseEntry,
  deleteIncomeEntry,
  deleteExpenseEntry,
  listIncomeCategories,
  listExpenseCategories,
  type EntryRow,
} from "@/integrations/supabase/categories";

export type MovementType = "income" | "expense";

export type MovementRow = EntryRow & {
  type: MovementType;
  category_name: string;
};

export interface ExportData {
  movements: MovementRow[];
  year: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

const QK = {
  movements: (year: number, token: number) =>
    ["movements", year, token] as const,
  incomeEntries: (year: number, token: number) =>
    ["income-entries", year, token] as const,
  expenseEntries: (year: number, token: number) =>
    ["expense-entries", year, token] as const,
  categories: (year: number, token: number) =>
    ["movement-categories", year, token] as const,
};

export function useMovements(year: number, refreshToken = 0) {
  const qc = useQueryClient();

  const incomeQuery = useQuery({
    queryKey: QK.incomeEntries(year, refreshToken),
    queryFn: async (): Promise<EntryRow[]> => {
      return await listIncomeEntries(year);
    },
  });

  const expenseQuery = useQuery({
    queryKey: QK.expenseEntries(year, refreshToken),
    queryFn: async (): Promise<EntryRow[]> => {
      return await listExpenseEntries(year);
    },
  });

  const categoriesQuery = useQuery({
    queryKey: QK.categories(year, refreshToken),
    queryFn: async () => {
      const [incomeCategories, expenseCategories] = await Promise.all([
        listIncomeCategories(year),
        listExpenseCategories(year),
      ]);

      return {
        income: incomeCategories,
        expense: expenseCategories,
      };
    },
  });

  const movements = useMemo(() => {
    const incomeEntries = (incomeQuery.data ?? []).map((entry) => ({
      ...entry,
      type: "income" as MovementType,
      category_name:
        categoriesQuery.data?.income.find((c) => c.id === entry.category_id)
          ?.name ?? "Desconocido",
    }));

    const expenseEntries = (expenseQuery.data ?? []).map((entry) => ({
      ...entry,
      type: "expense" as MovementType,
      category_name:
        categoriesQuery.data?.expense.find((c) => c.id === entry.category_id)
          ?.name ?? "Desconocido",
    }));

    return [...incomeEntries, ...expenseEntries].sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      if (a.created_at !== b.created_at)
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      return 0;
    });
  }, [incomeQuery.data, expenseQuery.data, categoriesQuery.data]);

  const createMovement = useMutation({
    mutationFn: async ({
      type,
      categoryId,
      month,
      amount,
      description,
    }: {
      type: MovementType;
      categoryId: string;
      month: number;
      amount: number;
      description?: string | null;
    }) => {
      if (type === "income") {
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
      await qc.cancelQueries({ queryKey: QK.movements(year, refreshToken) });
      const prev = qc.getQueryData<MovementRow[]>(
        QK.movements(year, refreshToken)
      );
      const optimistic: MovementRow = {
        id: `tmp-${Math.random().toString(36).slice(2)}`,
        user_id: "",
        category_id: vars.categoryId,
        year,
        month: vars.month,
        amount: vars.amount,
        description: vars.description ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        type: vars.type,
        category_name: "",
      };
      qc.setQueryData<MovementRow[]>(QK.movements(year, refreshToken), [
        optimistic,
        ...(prev ?? []),
      ]);
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(QK.movements(year, refreshToken), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.movements(year, refreshToken) });
    },
  });

  const updateMovement = useMutation({
    mutationFn: async ({
      id,
      type,
      patch,
    }: {
      id: string;
      type: MovementType;
      patch: Partial<
        Pick<
          EntryRow,
          "amount" | "description" | "month" | "category_id" | "year"
        >
      >;
    }) => {
      return type === "income"
        ? await updateIncomeEntry(id, patch)
        : await updateExpenseEntry(id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: QK.movements(year, refreshToken) });
      const prev = qc.getQueryData<MovementRow[]>(
        QK.movements(year, refreshToken)
      );
      if (prev) {
        qc.setQueryData<MovementRow[]>(
          QK.movements(year, refreshToken),
          prev.map((movement) =>
            movement.id === id
              ? { ...movement, ...patch, updated_at: new Date().toISOString() }
              : movement
          )
        );
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(QK.movements(year, refreshToken), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.movements(year, refreshToken) });
    },
  });

  const deleteMovement = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: MovementType }) => {
      return type === "income"
        ? await deleteIncomeEntry(id)
        : await deleteExpenseEntry(id);
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: QK.movements(year, refreshToken) });
      const prev = qc.getQueryData<MovementRow[]>(
        QK.movements(year, refreshToken)
      );
      if (prev) {
        qc.setQueryData<MovementRow[]>(
          QK.movements(year, refreshToken),
          prev.filter((movement) => movement.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(QK.movements(year, refreshToken), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.movements(year, refreshToken) });
    },
  });

  return {
    movements,
    categories: categoriesQuery.data,
    isLoading:
      incomeQuery.isLoading ||
      expenseQuery.isLoading ||
      categoriesQuery.isLoading,
    isFetching:
      incomeQuery.isFetching ||
      expenseQuery.isFetching ||
      categoriesQuery.isFetching,
    createMovement,
    updateMovement,
    deleteMovement,
  };
}
