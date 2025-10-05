import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAssetCategories,
  updateAssetCategory,
  createAssetCategory,
  deleteAssetCategory,
  type AssetCategoryInput,
  listAssetValues,
  upsertAssetValue,
  type AssetValueRow,
} from "@/integrations/supabase/categories";
import { useUserStore } from "@/store/user";

export type AssetType = AssetCategoryInput["type"];

export type AssetItem = {
  id: string;
  name: string;
  type: AssetType;
  display_order: number;
  monthly?: number[]; // length 12, 1-indexed months placed at idx-1
};

export function useAssets() {
  const qc = useQueryClient();
  const year = useUserStore((s) => s.year);

  const assetsQuery = useQuery({
    queryKey: ["categories", "assets", year],
    queryFn: async (): Promise<AssetItem[]> => {
      const data = await listAssetCategories(year);
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        display_order: c.display_order,
      }));
    },
  });

  const valuesQuery = useQuery({
    queryKey: ["asset_values", year],
    queryFn: async () => {
      const data = await listAssetValues(year);
      return data;
    },
  });

  const assets = useMemo(
    () =>
      (assetsQuery.data ?? [])
        .slice()
        .map((a) => {
          const months = new Array(12).fill(0);
          for (const v of valuesQuery.data ?? []) {
            if (v.category_id === a.id && v.month >= 1 && v.month <= 12) {
              months[v.month - 1] = v.amount;
            }
          }
          return { ...a, monthly: months };
        })
        .sort((a, b) => a.display_order - b.display_order),
    [assetsQuery.data, valuesQuery.data]
  );

  function nextOrder(arr: AssetItem[]) {
    return arr.length ? Math.max(...arr.map((c) => c.display_order)) + 1 : 0;
  }

  const addAsset = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: AssetType }) => {
      const input: AssetCategoryInput = {
        name,
        type,
        display_order: nextOrder(assetsQuery.data ?? []),
      };
      return createAssetCategory(input, year);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories", "assets", year] });
    },
  });

  const renameAsset = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) =>
      updateAssetCategory(id, { name }, year),
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: ["categories", "assets", year] });
      const prev = qc.getQueryData<AssetItem[]>(["categories", "assets", year]);
      if (prev) {
        qc.setQueryData<AssetItem[]>(
          ["categories", "assets", year],
          prev.map((c) => (c.id === id ? { ...c, name } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(["categories", "assets", year], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["categories", "assets", year] });
    },
  });

  const changeAssetType = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: AssetType }) =>
      updateAssetCategory(id, { type }, year),
    onMutate: async ({ id, type }) => {
      await qc.cancelQueries({ queryKey: ["categories", "assets", year] });
      const prev = qc.getQueryData<AssetItem[]>(["categories", "assets", year]);
      if (prev) {
        qc.setQueryData<AssetItem[]>(
          ["categories", "assets", year],
          prev.map((c) => (c.id === id ? { ...c, type } : c))
        );
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(["categories", "assets", year], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["categories", "assets", year] });
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => deleteAssetCategory(id, year),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["categories", "assets", year] });
      const prev = qc.getQueryData<AssetItem[]>(["categories", "assets", year]);
      if (prev) {
        qc.setQueryData<AssetItem[]>(
          ["categories", "assets", year],
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(["categories", "assets", year], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["categories", "assets", year] });
    },
  });

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
      // Use a temporary slot to avoid unique constraint conflicts
      const current = (assetsQuery.data ?? []).map((x) => x.display_order);
      const maxOrder = current.length ? Math.max(...current) : 0;
      const tempOrder = Math.max(maxOrder + 1, aOrder + 1, bOrder + 1);
      // Step 1: move A to temp
      await updateAssetCategory(aId, { display_order: tempOrder }, year);
      // Step 2: move B into A's slot
      await updateAssetCategory(bId, { display_order: aOrder }, year);
      // Step 3: move A into B's slot
      await updateAssetCategory(aId, { display_order: bOrder }, year);
    },
    onMutate: async ({ aId, aOrder, bId, bOrder }) => {
      await qc.cancelQueries({ queryKey: ["categories", "assets", year] });
      const prev = qc.getQueryData<AssetItem[]>(["categories", "assets", year]);
      if (prev) {
        // Optimistically swap display_order and reorder array
        const next = prev.map((c) => {
          if (c.id === aId) return { ...c, display_order: bOrder };
          if (c.id === bId) return { ...c, display_order: aOrder };
          return c;
        });
        next.sort((a, b) => a.display_order - b.display_order);
        qc.setQueryData<AssetItem[]>(["categories", "assets", year], next);
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(["categories", "assets", year], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["categories", "assets", year] });
    },
  });

  const updateAssetValue = useMutation({
    mutationFn: async ({
      categoryId,
      month,
      amount,
    }: {
      categoryId: string;
      month: number;
      amount: number;
    }) => {
      return upsertAssetValue(categoryId, year, month, amount);
    },
    onMutate: async ({ categoryId, month, amount }) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: ["asset_values", year] });

      // Snapshot the previous value
      const prev = qc.getQueryData<AssetValueRow[]>(["asset_values", year]);

      // Optimistically update to the new value
      if (prev) {
        const next = prev.map((v) =>
          v.category_id === categoryId && v.month === month
            ? { ...v, amount }
            : v
        );
        qc.setQueryData(["asset_values", year], next);
      }

      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["asset_values", year], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["asset_values", year] });
    },
  });

  return {
    assets,
    isLoading: assetsQuery.isLoading,
    isFetching: assetsQuery.isFetching || valuesQuery.isFetching,
    addAsset,
    renameAsset,
    changeAssetType,
    deleteAsset,
    swapOrder,
    updateAssetValue,
  } as const;
}
