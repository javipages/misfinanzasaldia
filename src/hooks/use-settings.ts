import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listIncomeCategories,
  listExpenseCategories,
  listAssetCategories,
  createIncomeCategory,
  createExpenseCategory,
  createAssetCategory,
  updateIncomeCategory,
  updateExpenseCategory,
  updateAssetCategory,
  deleteIncomeCategory,
  deleteExpenseCategory,
  deleteAssetCategory,
  type CategoryRow,
  type CategoryInput,
  type AssetCategoryRow,
  type AssetCategoryInput,
} from "@/integrations/supabase/categories";

type EditableCategory = Pick<CategoryRow, "id" | "name" | "display_order">;

const QK = {
  income: ["categories", "income"] as const,
  expense: ["categories", "expense"] as const,
  assets: ["categories", "assets"] as const,
};

export function useSettings() {
  const qc = useQueryClient();

  const incomeQuery = useQuery({
    queryKey: QK.income,
    queryFn: async (): Promise<EditableCategory[]> => {
      const data = await listIncomeCategories();
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        display_order: c.display_order,
      }));
    },
  });

  const expenseQuery = useQuery({
    queryKey: QK.expense,
    queryFn: async (): Promise<EditableCategory[]> => {
      const data = await listExpenseCategories();
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        display_order: c.display_order,
      }));
    },
  });

  const assetsQuery = useQuery({
    queryKey: QK.assets,
    queryFn: async (): Promise<
      (EditableCategory & { type: AssetCategoryRow["type"] })[]
    > => {
      const data = await listAssetCategories();
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        display_order: c.display_order,
        type: c.type,
      }));
    },
  });

  const sortedIncome = useMemo(
    () =>
      (incomeQuery.data ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order),
    [incomeQuery.data]
  );
  const sortedExpense = useMemo(
    () =>
      (expenseQuery.data ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order),
    [expenseQuery.data]
  );

  const sortedAssets = useMemo(
    () =>
      (assetsQuery.data ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order),
    [assetsQuery.data]
  );

  function nextOrder(arr: EditableCategory[]) {
    return arr.length ? Math.max(...arr.map((c) => c.display_order)) + 1 : 0;
  }

  const addIncome = useMutation({
    mutationFn: async (name: string) => {
      const input: CategoryInput = {
        name,
        display_order: nextOrder(incomeQuery.data ?? []),
      };
      return createIncomeCategory(input);
    },
    onMutate: async (name: string) => {
      await qc.cancelQueries({ queryKey: QK.income });
      const prev = qc.getQueryData<EditableCategory[]>(QK.income);
      const newCategory: EditableCategory = {
        id: `temp-${Date.now()}`, // Temporary ID for optimistic update
        name,
        display_order: nextOrder(prev ?? []),
      };
      if (prev) {
        qc.setQueryData<EditableCategory[]>(QK.income, [...prev, newCategory]);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income, ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.income });
    },
  });

  const addExpense = useMutation({
    mutationFn: async (name: string) => {
      const input: CategoryInput = {
        name,
        display_order: nextOrder(expenseQuery.data ?? []),
      };
      return createExpenseCategory(input);
    },
    onMutate: async (name: string) => {
      await qc.cancelQueries({ queryKey: QK.expense });
      const prev = qc.getQueryData<EditableCategory[]>(QK.expense);
      const newCategory: EditableCategory = {
        id: `temp-${Date.now()}`, // Temporary ID for optimistic update
        name,
        display_order: nextOrder(prev ?? []),
      };
      if (prev) {
        qc.setQueryData<EditableCategory[]>(QK.expense, [...prev, newCategory]);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense, ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.expense });
    },
  });

  const addAsset = useMutation({
    mutationFn: async ({
      name,
      type,
    }: {
      name: string;
      type: AssetCategoryInput["type"];
    }) => {
      const input: AssetCategoryInput = {
        name,
        type,
        display_order: nextOrder(assetsQuery.data ?? []),
      };
      return createAssetCategory(input);
    },
    onMutate: async ({ name, type }) => {
      await qc.cancelQueries({ queryKey: QK.assets });
      const prev = qc.getQueryData<
        (EditableCategory & { type: AssetCategoryRow["type"] })[]
      >(QK.assets);
      const newAsset: EditableCategory & { type: AssetCategoryRow["type"] } = {
        id: `temp-${Date.now()}`, // Temporary ID for optimistic update
        name,
        display_order: nextOrder(prev ?? []),
        type,
      };
      if (prev) {
        qc.setQueryData<
          (EditableCategory & { type: AssetCategoryRow["type"] })[]
        >(QK.assets, [...prev, newAsset]);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.assets, ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.assets });
    },
  });

  const renameIncome = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return updateIncomeCategory(id, { name });
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: QK.income });
      const prev = qc.getQueryData<EditableCategory[]>(QK.income);
      if (prev) {
        qc.setQueryData<EditableCategory[]>(
          QK.income,
          prev.map((c) => (c.id === id ? { ...c, name } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.income });
    },
  });

  const renameExpense = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return updateExpenseCategory(id, { name });
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: QK.expense });
      const prev = qc.getQueryData<EditableCategory[]>(QK.expense);
      if (prev) {
        qc.setQueryData<EditableCategory[]>(
          QK.expense,
          prev.map((c) => (c.id === id ? { ...c, name } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.expense });
    },
  });

  const deleteIncome = useMutation({
    mutationFn: async (id: string) => deleteIncomeCategory(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.income });
      const prev = qc.getQueryData<EditableCategory[]>(QK.income);
      if (prev) {
        qc.setQueryData<EditableCategory[]>(
          QK.income,
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.income });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => deleteExpenseCategory(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.expense });
      const prev = qc.getQueryData<EditableCategory[]>(QK.expense);
      if (prev) {
        qc.setQueryData<EditableCategory[]>(
          QK.expense,
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.expense });
    },
  });

  const renameAsset = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return updateAssetCategory(id, { name });
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: QK.assets });
      const prev = qc.getQueryData<
        (EditableCategory & { type: AssetCategoryRow["type"] })[]
      >(QK.assets);
      if (prev) {
        qc.setQueryData<
          (EditableCategory & { type: AssetCategoryRow["type"] })[]
        >(
          QK.assets,
          prev.map((c) => (c.id === id ? { ...c, name } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.assets, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.assets });
    },
  });

  const changeAssetType = useMutation({
    mutationFn: async ({
      id,
      type,
    }: {
      id: string;
      type: AssetCategoryRow["type"];
    }) => {
      return updateAssetCategory(id, { type });
    },
    onMutate: async ({ id, type }) => {
      await qc.cancelQueries({ queryKey: QK.assets });
      const prev = qc.getQueryData<
        (EditableCategory & { type: AssetCategoryRow["type"] })[]
      >(QK.assets);
      if (prev) {
        qc.setQueryData<
          (EditableCategory & { type: AssetCategoryRow["type"] })[]
        >(
          QK.assets,
          prev.map((c) => (c.id === id ? { ...c, type } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.assets, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.assets });
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => deleteAssetCategory(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.assets });
      const prev = qc.getQueryData<
        (EditableCategory & { type: AssetCategoryRow["type"] })[]
      >(QK.assets);
      if (prev) {
        qc.setQueryData<
          (EditableCategory & { type: AssetCategoryRow["type"] })[]
        >(
          QK.assets,
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.assets, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.assets });
    },
  });

  const moveIncome = useMutation({
    mutationFn: async ({
      id,
      direction,
    }: {
      id: string;
      direction: "up" | "down";
    }) => {
      // Get the current data from the database, not the cache
      const currentData = await listIncomeCategories();
      const current = currentData
        .map((c) => ({
          id: c.id,
          name: c.name,
          display_order: c.display_order,
        }))
        .sort((a, b) => a.display_order - b.display_order);

      const index = current.findIndex((c) => c.id === id);
      if (index < 0) return;

      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= current.length) return;

      const a = current[index];
      const b = current[swapWith];
      const tmp = a.display_order;

      // Update both items with their new display_order values
      await Promise.all([
        updateIncomeCategory(a.id, { display_order: b.display_order }),
        updateIncomeCategory(b.id, { display_order: tmp }),
      ]);
    },
    onMutate: async ({ id, direction }) => {
      await qc.cancelQueries({ queryKey: QK.income });
      const prev = qc.getQueryData<EditableCategory[]>(QK.income);
      if (prev) {
        const ordered = prev
          .slice()
          .sort((a, b) => a.display_order - b.display_order);
        const index = ordered.findIndex((c) => c.id === id);
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (index >= 0 && swapWith >= 0 && swapWith < ordered.length) {
          const a = ordered[index];
          const b = ordered[swapWith];
          const tmp = a.display_order;
          a.display_order = b.display_order;
          b.display_order = tmp;
          qc.setQueryData<EditableCategory[]>(QK.income, ordered);
        }
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.income });
    },
  });

  const moveExpense = useMutation({
    mutationFn: async ({
      id,
      direction,
    }: {
      id: string;
      direction: "up" | "down";
    }) => {
      // Get the current data from the database, not the cache
      const currentData = await listExpenseCategories();
      const current = currentData
        .map((c) => ({
          id: c.id,
          name: c.name,
          display_order: c.display_order,
        }))
        .sort((a, b) => a.display_order - b.display_order);

      const index = current.findIndex((c) => c.id === id);
      if (index < 0) return;

      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= current.length) return;

      const a = current[index];
      const b = current[swapWith];
      const tmp = a.display_order;

      // Update both items with their new display_order values
      await Promise.all([
        updateExpenseCategory(a.id, { display_order: b.display_order }),
        updateExpenseCategory(b.id, { display_order: tmp }),
      ]);
    },
    onMutate: async ({ id, direction }) => {
      await qc.cancelQueries({ queryKey: QK.expense });
      const prev = qc.getQueryData<EditableCategory[]>(QK.expense);
      if (prev) {
        const ordered = prev
          .slice()
          .sort((a, b) => a.display_order - b.display_order);
        const index = ordered.findIndex((c) => c.id === id);
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (index >= 0 && swapWith >= 0 && swapWith < ordered.length) {
          const a = ordered[index];
          const b = ordered[swapWith];
          const tmp = a.display_order;
          a.display_order = b.display_order;
          b.display_order = tmp;
          qc.setQueryData<EditableCategory[]>(QK.expense, ordered);
        }
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.expense });
    },
  });

  return {
    income: sortedIncome,
    expense: sortedExpense,
    assets: sortedAssets,
    isLoading: incomeQuery.isLoading || expenseQuery.isLoading,
    isFetching:
      incomeQuery.isFetching ||
      expenseQuery.isFetching ||
      assetsQuery.isFetching,
    // mutations
    addIncome,
    addExpense,
    addAsset,
    renameIncome,
    renameExpense,
    renameAsset,
    changeAssetType,
    moveIncome,
    moveExpense,
    deleteIncome,
    deleteExpense,
    deleteAsset,
  };
}
