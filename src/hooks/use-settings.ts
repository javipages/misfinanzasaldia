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
  createIncomeSubcategory,
  createExpenseSubcategory,
  updateIncomeSubcategory,
  updateExpenseSubcategory,
  deleteIncomeSubcategory,
  deleteExpenseSubcategory,
  type CategoryRow,
  type CategoryInput,
  type AssetCategoryRow,
  type AssetCategoryInput,
  type SubcategoryRow,
  type SubcategoryInput,
} from "@/integrations/supabase/categories";
import { useUserStore } from "@/store/user";

type BaseCategory = Pick<CategoryRow, "id" | "name" | "display_order">;
type EditableSubcategory = Pick<
  SubcategoryRow,
  "id" | "category_id" | "name" | "display_order"
>;
type EditableCategoryTree = BaseCategory & {
  subcategories: EditableSubcategory[];
};

const QK = {
  income: (year: number) => ["categories", "income", year] as const,
  expense: (year: number) => ["categories", "expense", year] as const,
  assets: (year: number) => ["categories", "assets", year] as const,
};

export function useSettings() {
  const qc = useQueryClient();
  const year = useUserStore((s) => s.year);
  const refreshAvailableYears = useUserStore((s) => s.refreshAvailableYears);

  const incomeQuery = useQuery({
    queryKey: QK.income(year),
    queryFn: async (): Promise<EditableCategoryTree[]> => {
      const data = await listIncomeCategories(year);
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        display_order: c.display_order,
        subcategories: (c.subcategories ?? []).map((s) => ({
          id: s.id,
          category_id: s.category_id,
          name: s.name,
          display_order: s.display_order,
        })),
      }));
    },
  });

  const expenseQuery = useQuery({
    queryKey: QK.expense(year),
    queryFn: async (): Promise<EditableCategoryTree[]> => {
      const data = await listExpenseCategories(year);
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        display_order: c.display_order,
        subcategories: (c.subcategories ?? []).map((s) => ({
          id: s.id,
          category_id: s.category_id,
          name: s.name,
          display_order: s.display_order,
        })),
      }));
    },
  });

  const assetsQuery = useQuery({
    queryKey: QK.assets(year),
    queryFn: async (): Promise<
      (BaseCategory & { type: AssetCategoryRow["type"] })[]
    > => {
      const data = await listAssetCategories(year);
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        display_order: c.display_order,
        type: c.type,
      }));
    },
  });

  const sortedIncome = useMemo(() => {
    return (incomeQuery.data ?? [])
      .map((category) => ({
        ...category,
        subcategories: (category.subcategories ?? [])
          .slice()
          .sort((a, b) => a.display_order - b.display_order),
      }))
      .sort((a, b) => a.display_order - b.display_order);
  }, [incomeQuery.data]);

  const sortedExpense = useMemo(() => {
    return (expenseQuery.data ?? [])
      .map((category) => ({
        ...category,
        subcategories: (category.subcategories ?? [])
          .slice()
          .sort((a, b) => a.display_order - b.display_order),
      }))
      .sort((a, b) => a.display_order - b.display_order);
  }, [expenseQuery.data]);

  const sortedAssets = useMemo(
    () =>
      (assetsQuery.data ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order),
    [assetsQuery.data]
  );

  function nextOrder<T extends { display_order: number }>(arr: T[]) {
    return arr.length ? Math.max(...arr.map((c) => c.display_order)) + 1 : 0;
  }

  const addIncome = useMutation({
    mutationFn: async (name: string) => {
      const input: CategoryInput = {
        name,
        display_order: nextOrder(incomeQuery.data ?? []),
      };
      return createIncomeCategory(input, year);
    },
    onMutate: async (name: string) => {
      await qc.cancelQueries({ queryKey: QK.income(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.income(year));
      const newCategory: EditableCategoryTree = {
        id: `temp-${Date.now()}`, // Temporary ID for optimistic update
        name,
        display_order: nextOrder(prev ?? []),
        subcategories: [],
      };
      if (prev) {
        qc.setQueryData<EditableCategoryTree[]>(QK.income(year), [
          ...prev,
          newCategory,
        ]);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income(year), ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.income(year) });
      void refreshAvailableYears();
    },
  });

  const addExpense = useMutation({
    mutationFn: async (name: string) => {
      const input: CategoryInput = {
        name,
        display_order: nextOrder(expenseQuery.data ?? []),
      };
      return createExpenseCategory(input, year);
    },
    onMutate: async (name: string) => {
      await qc.cancelQueries({ queryKey: QK.expense(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.expense(year));
      const newCategory: EditableCategoryTree = {
        id: `temp-${Date.now()}`, // Temporary ID for optimistic update
        name,
        display_order: nextOrder(prev ?? []),
        subcategories: [],
      };
      if (prev) {
        qc.setQueryData<EditableCategoryTree[]>(QK.expense(year), [
          ...prev,
          newCategory,
        ]);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense(year), ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.expense(year) });
      void refreshAvailableYears();
    },
  });

  const addIncomeSubcategory = useMutation({
    mutationFn: async ({
      categoryId,
      name,
    }: {
      categoryId: string;
      name: string;
    }) => {
      const parent = incomeQuery.data?.find((c) => c.id === categoryId);
      const display_order = nextOrder(parent?.subcategories ?? []);
      const input: SubcategoryInput = {
        category_id: categoryId,
        name,
        display_order,
      };
      return createIncomeSubcategory(input, year);
    },
    onMutate: async ({ categoryId, name }) => {
      await qc.cancelQueries({ queryKey: QK.income(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.income(year));
      const display_order = nextOrder(
        prev?.find((c) => c.id === categoryId)?.subcategories ?? []
      );
      if (prev) {
        const optimistic = prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                subcategories: [
                  ...(category.subcategories ?? []),
                  {
                    id: `temp-sub-${Date.now()}`,
                    category_id: categoryId,
                    name,
                    display_order,
                  },
                ],
              }
            : category
        );
        qc.setQueryData(QK.income(year), optimistic);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income(year), ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.income(year) });
      void refreshAvailableYears();
    },
  });

  const addExpenseSubcategory = useMutation({
    mutationFn: async ({
      categoryId,
      name,
    }: {
      categoryId: string;
      name: string;
    }) => {
      const parent = expenseQuery.data?.find((c) => c.id === categoryId);
      const display_order = nextOrder(parent?.subcategories ?? []);
      const input: SubcategoryInput = {
        category_id: categoryId,
        name,
        display_order,
      };
      return createExpenseSubcategory(input, year);
    },
    onMutate: async ({ categoryId, name }) => {
      await qc.cancelQueries({ queryKey: QK.expense(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.expense(year));
      const display_order = nextOrder(
        prev?.find((c) => c.id === categoryId)?.subcategories ?? []
      );
      if (prev) {
        const optimistic = prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                subcategories: [
                  ...(category.subcategories ?? []),
                  {
                    id: `temp-sub-${Date.now()}`,
                    category_id: categoryId,
                    name,
                    display_order,
                  },
                ],
              }
            : category
        );
        qc.setQueryData(QK.expense(year), optimistic);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense(year), ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.expense(year) });
      void refreshAvailableYears();
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
      return createAssetCategory(input, year);
    },
    onMutate: async ({ name, type }) => {
      await qc.cancelQueries({ queryKey: QK.assets(year) });
      const prev = qc.getQueryData<
        (BaseCategory & { type: AssetCategoryRow["type"] })[]
      >(QK.assets(year));
      const newAsset: BaseCategory & { type: AssetCategoryRow["type"] } = {
        id: `temp-${Date.now()}`, // Temporary ID for optimistic update
        name,
        display_order: nextOrder(prev ?? []),
        type,
      };
      if (prev) {
        qc.setQueryData<
          (BaseCategory & { type: AssetCategoryRow["type"] })[]
        >(QK.assets(year), [...prev, newAsset]);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.assets(year), ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.assets(year) });
      void refreshAvailableYears();
    },
  });

  const renameIncome = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return updateIncomeCategory(id, { name }, year);
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: QK.income(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.income(year));
      if (prev) {
        qc.setQueryData<EditableCategoryTree[]>(
          QK.income(year),
          prev.map((c) => (c.id === id ? { ...c, name } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.income(year) });
      void refreshAvailableYears();
    },
  });

  const renameExpense = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return updateExpenseCategory(id, { name }, year);
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: QK.expense(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.expense(year));
      if (prev) {
        qc.setQueryData<EditableCategoryTree[]>(
          QK.expense(year),
          prev.map((c) => (c.id === id ? { ...c, name } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.expense(year) });
      void refreshAvailableYears();
    },
  });

  const renameIncomeSubcategory = useMutation({
    mutationFn: async ({
      id,
      name,
    }: {
      id: string;
      name: string;
      categoryId: string;
    }) => {
      return updateIncomeSubcategory(id, { name }, year);
    },
    onMutate: async ({ id, name, categoryId }) => {
      await qc.cancelQueries({ queryKey: QK.income(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.income(year));
      if (prev) {
        const optimistic = prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                subcategories: (category.subcategories ?? []).map((sub) =>
                  sub.id === id ? { ...sub, name } : sub
                ),
              }
            : category
        );
        qc.setQueryData(QK.income(year), optimistic);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.income(year) });
    },
  });

  const renameExpenseSubcategory = useMutation({
    mutationFn: async ({
      id,
      name,
    }: {
      id: string;
      name: string;
      categoryId: string;
    }) => {
      return updateExpenseSubcategory(id, { name }, year);
    },
    onMutate: async ({ id, name, categoryId }) => {
      await qc.cancelQueries({ queryKey: QK.expense(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.expense(year));
      if (prev) {
        const optimistic = prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                subcategories: (category.subcategories ?? []).map((sub) =>
                  sub.id === id ? { ...sub, name } : sub
                ),
              }
            : category
        );
        qc.setQueryData(QK.expense(year), optimistic);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.expense(year) });
    },
  });

  const deleteIncome = useMutation({
    mutationFn: async (id: string) => deleteIncomeCategory(id, year),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.income(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.income(year));
      if (prev) {
        qc.setQueryData<EditableCategoryTree[]>(
          QK.income(year),
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.income(year) });
      void refreshAvailableYears();
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => deleteExpenseCategory(id, year),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.expense(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.expense(year));
      if (prev) {
        qc.setQueryData<EditableCategoryTree[]>(
          QK.expense(year),
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.expense(year) });
      void refreshAvailableYears();
    },
  });

  const removeIncomeSubcategory = useMutation({
    mutationFn: async ({ id }: { id: string; categoryId: string }) => {
      return deleteIncomeSubcategory(id, year);
    },
    onMutate: async ({ id, categoryId }) => {
      await qc.cancelQueries({ queryKey: QK.income(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.income(year));
      if (prev) {
        const optimistic = prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                subcategories: (category.subcategories ?? []).filter(
                  (sub) => sub.id !== id
                ),
              }
            : category
        );
        qc.setQueryData(QK.income(year), optimistic);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income(year), ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.income(year) });
      void refreshAvailableYears();
    },
  });

  const removeExpenseSubcategory = useMutation({
    mutationFn: async ({ id }: { id: string; categoryId: string }) => {
      return deleteExpenseSubcategory(id, year);
    },
    onMutate: async ({ id, categoryId }) => {
      await qc.cancelQueries({ queryKey: QK.expense(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.expense(year));
      if (prev) {
        const optimistic = prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                subcategories: (category.subcategories ?? []).filter(
                  (sub) => sub.id !== id
                ),
              }
            : category
        );
        qc.setQueryData(QK.expense(year), optimistic);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense(year), ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.expense(year) });
      void refreshAvailableYears();
    },
  });

  const renameAsset = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return updateAssetCategory(id, { name }, year);
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: QK.assets(year) });
      const prev = qc.getQueryData<
        (BaseCategory & { type: AssetCategoryRow["type"] })[]
      >(QK.assets(year));
      if (prev) {
        qc.setQueryData<
          (BaseCategory & { type: AssetCategoryRow["type"] })[]
        >(
          QK.assets(year),
          prev.map((c) => (c.id === id ? { ...c, name } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.assets(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.assets(year) });
      void refreshAvailableYears();
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
      return updateAssetCategory(id, { type }, year);
    },
    onMutate: async ({ id, type }) => {
      await qc.cancelQueries({ queryKey: QK.assets(year) });
      const prev = qc.getQueryData<
        (BaseCategory & { type: AssetCategoryRow["type"] })[]
      >(QK.assets(year));
      if (prev) {
        qc.setQueryData<
          (BaseCategory & { type: AssetCategoryRow["type"] })[]
        >(
          QK.assets(year),
          prev.map((c) => (c.id === id ? { ...c, type } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.assets(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.assets(year) });
      void refreshAvailableYears();
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => deleteAssetCategory(id, year),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.assets(year) });
      const prev = qc.getQueryData<
        (BaseCategory & { type: AssetCategoryRow["type"] })[]
      >(QK.assets(year));
      if (prev) {
        qc.setQueryData<
          (BaseCategory & { type: AssetCategoryRow["type"] })[]
        >(
          QK.assets(year),
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.assets(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.assets(year) });
      void refreshAvailableYears();
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
      const currentData = await listIncomeCategories(year);
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
        updateIncomeCategory(a.id, { display_order: b.display_order }, year),
        updateIncomeCategory(b.id, { display_order: tmp }, year),
      ]);
    },
    onMutate: async ({ id, direction }) => {
      await qc.cancelQueries({ queryKey: QK.income(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.income(year));
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
          qc.setQueryData<EditableCategoryTree[]>(QK.income(year), ordered);
        }
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.income(year) });
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
      const currentData = await listExpenseCategories(year);
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
        updateExpenseCategory(
          a.id,
          { display_order: b.display_order },
          year
        ),
        updateExpenseCategory(
          b.id,
          { display_order: tmp },
          year
        ),
      ]);
    },
    onMutate: async ({ id, direction }) => {
      await qc.cancelQueries({ queryKey: QK.expense(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.expense(year));
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
          qc.setQueryData<EditableCategoryTree[]>(QK.expense(year), ordered);
        }
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.expense(year) });
    },
  });

  const moveIncomeSubcategory = useMutation({
    mutationFn: async ({
      categoryId,
      subcategoryId,
      direction,
    }: {
      categoryId: string;
      subcategoryId: string;
      direction: "up" | "down";
    }) => {
      const currentData = await listIncomeCategories(year);
      const category = currentData.find((c) => c.id === categoryId);
      if (!category) return;

      const ordered = (category.subcategories ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order);
      const index = ordered.findIndex((sub) => sub.id === subcategoryId);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= ordered.length) return;

      const moving = ordered[index];
      ordered.splice(index, 1);
      ordered.splice(swapWith, 0, moving);

      await Promise.all(
        ordered.map((sub, idx) =>
          updateIncomeSubcategory(sub.id, { display_order: idx + 1 }, year)
        )
      );
    },
    onMutate: async ({ categoryId, subcategoryId, direction }) => {
      await qc.cancelQueries({ queryKey: QK.income(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.income(year));
      if (prev) {
        const optimistic = prev.map((category) => {
          if (category.id !== categoryId) return category;
          const ordered = category.subcategories
            .slice()
            .sort((a, b) => a.display_order - b.display_order);
          const index = ordered.findIndex((sub) => sub.id === subcategoryId);
          const swapWith = direction === "up" ? index - 1 : index + 1;
          if (index < 0 || swapWith < 0 || swapWith >= ordered.length) {
            return category;
          }
          const moving = ordered[index];
          ordered.splice(index, 1);
          ordered.splice(swapWith, 0, moving);
          return {
            ...category,
            subcategories: ordered.map((sub, idx) => ({
              ...sub,
              display_order: idx + 1,
            })),
          };
        });
        qc.setQueryData(QK.income(year), optimistic);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.income(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.income(year) });
    },
  });

  const moveExpenseSubcategory = useMutation({
    mutationFn: async ({
      categoryId,
      subcategoryId,
      direction,
    }: {
      categoryId: string;
      subcategoryId: string;
      direction: "up" | "down";
    }) => {
      const currentData = await listExpenseCategories(year);
      const category = currentData.find((c) => c.id === categoryId);
      if (!category) return;

      const ordered = (category.subcategories ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order);
      const index = ordered.findIndex((sub) => sub.id === subcategoryId);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= ordered.length) return;

      const moving = ordered[index];
      ordered.splice(index, 1);
      ordered.splice(swapWith, 0, moving);

      await Promise.all(
        ordered.map((sub, idx) =>
          updateExpenseSubcategory(sub.id, { display_order: idx + 1 }, year)
        )
      );
    },
    onMutate: async ({ categoryId, subcategoryId, direction }) => {
      await qc.cancelQueries({ queryKey: QK.expense(year) });
      const prev = qc.getQueryData<EditableCategoryTree[]>(QK.expense(year));
      if (prev) {
        const optimistic = prev.map((category) => {
          if (category.id !== categoryId) return category;
          const ordered = category.subcategories
            .slice()
            .sort((a, b) => a.display_order - b.display_order);
          const index = ordered.findIndex((sub) => sub.id === subcategoryId);
          const swapWith = direction === "up" ? index - 1 : index + 1;
          if (index < 0 || swapWith < 0 || swapWith >= ordered.length) {
            return category;
          }
          const moving = ordered[index];
          ordered.splice(index, 1);
          ordered.splice(swapWith, 0, moving);
          return {
            ...category,
            subcategories: ordered.map((sub, idx) => ({
              ...sub,
              display_order: idx + 1,
            })),
          };
        });
        qc.setQueryData(QK.expense(year), optimistic);
      }
      return { prev } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.expense(year), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QK.expense(year) });
    },
  });

  return {
    income: sortedIncome,
    expense: sortedExpense,
    assets: sortedAssets,
    isLoading:
      incomeQuery.isLoading || expenseQuery.isLoading || assetsQuery.isLoading,
    isFetching:
      incomeQuery.isFetching ||
      expenseQuery.isFetching ||
      assetsQuery.isFetching,
    // category mutations
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
    // subcategory mutations
    addIncomeSubcategory,
    addExpenseSubcategory,
    renameIncomeSubcategory,
    renameExpenseSubcategory,
    deleteIncomeSubcategory: removeIncomeSubcategory,
    deleteExpenseSubcategory: removeExpenseSubcategory,
    moveIncomeSubcategory,
    moveExpenseSubcategory,
  };
}
