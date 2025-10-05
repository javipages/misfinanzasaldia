import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  listInvestmentAccounts,
  getInvestmentSummaryByMonth,
  createInvestmentValue,
  type InvestmentWithAccount,
  type InvestmentInput,
  type AssetCategoryWithYearRow,
  type InvestmentSummaryByMonth,
} from "@/integrations/supabase/categories";
import { useUserStore } from "@/store/user";

export type InvestmentItem = InvestmentWithAccount;

export type InvestmentAccount = AssetCategoryWithYearRow;

export function useInvestments() {
  const qc = useQueryClient();
  const year = useUserStore((s) => s.year);

  // Query for investments with account information
  const investmentsQuery = useQuery({
    queryKey: ["investments"],
    queryFn: async (): Promise<InvestmentItem[]> => {
      return await listInvestments();
    },
  });

  // Query for available investment accounts
  const accountsQuery = useQuery({
    queryKey: ["investment-accounts", year],
    queryFn: async (): Promise<InvestmentAccount[]> => {
      return await listInvestmentAccounts(year);
    },
  });

  // Query for monthly investment summary
  const monthlySummaryQuery = useQuery({
    queryKey: ["investment-monthly-summary"],
    queryFn: async (): Promise<InvestmentSummaryByMonth[]> => {
      return await getInvestmentSummaryByMonth();
    },
  });

  const investments = useMemo(
    () =>
      (investmentsQuery.data ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order),
    [investmentsQuery.data]
  );

  const accounts = useMemo(
    () =>
      (accountsQuery.data ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order),
    [accountsQuery.data]
  );

  function nextOrder(arr: InvestmentItem[]) {
    return arr.length ? Math.max(...arr.map((c) => c.display_order)) + 1 : 0;
  }

  const addInvestment = useMutation({
    mutationFn: async (input: Omit<InvestmentInput, "display_order">) => {
      const inputWithOrder: InvestmentInput = {
        ...input,
        display_order: nextOrder(investmentsQuery.data ?? []),
      };
      return createInvestment(inputWithOrder);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["investments"] });
      void qc.invalidateQueries({ queryKey: ["investment-monthly-summary"] });
    },
  });

  const updateInvestmentMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<
        Pick<
          InvestmentWithAccount,
          | "name"
          | "type"
          | "initial_amount"
          | "account_id"
          | "purchase_date"
          | "description"
          | "display_order"
        >
      >;
    }) => {
      return updateInvestment(id, input);
    },
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: ["investments"] });
      const prev = qc.getQueryData<InvestmentItem[]>(["investments"]);
      if (prev) {
        const updatedInvestment = prev.find((inv) => inv.id === id);
        if (updatedInvestment) {
          // For optimistic updates, we need to recalculate profit/loss if account changed
          qc.setQueryData<InvestmentItem[]>(
            ["investments"],
            prev.map((inv) => (inv.id === id ? { ...inv, ...input } : inv))
          );
        }
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["investments"], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["investments"] });
      void qc.invalidateQueries({ queryKey: ["investment-monthly-summary"] });
    },
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: string) => deleteInvestment(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["investments"] });
      const prev = qc.getQueryData<InvestmentItem[]>(["investments"]);
      if (prev) {
        qc.setQueryData<InvestmentItem[]>(
          ["investments"],
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["investments"], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["investments"] });
      void qc.invalidateQueries({ queryKey: ["investment-monthly-summary"] });
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
      const current = (investmentsQuery.data ?? []).map((x) => x.display_order);
      const maxOrder = current.length ? Math.max(...current) : 0;
      const tempOrder = Math.max(maxOrder + 1, aOrder + 1, bOrder + 1);
      // Step 1: move A to temp
      await updateInvestment(aId, { display_order: tempOrder });
      // Step 2: move B into A's slot
      await updateInvestment(bId, { display_order: aOrder });
      // Step 3: move A into B's slot
      await updateInvestment(aId, { display_order: bOrder });
    },
    onMutate: async ({ aId, aOrder, bId, bOrder }) => {
      await qc.cancelQueries({ queryKey: ["investments"] });
      const prev = qc.getQueryData<InvestmentItem[]>(["investments"]);
      if (prev) {
        // Optimistically swap display_order and reorder array
        const next = prev.map((c) => {
          if (c.id === aId) return { ...c, display_order: bOrder };
          if (c.id === bId) return { ...c, display_order: aOrder };
          return c;
        });
        next.sort((a, b) => a.display_order - b.display_order);
        qc.setQueryData<InvestmentItem[]>(["investments"], next);
      }
      return { prev } as const;
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["investments"], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["investments"] });
      void qc.invalidateQueries({ queryKey: ["investment-monthly-summary"] });
    },
  });

  const addInvestmentValue = useMutation({
    mutationFn: async ({
      investmentId,
      amount,
      contributionDate,
      description,
    }: {
      investmentId: string;
      amount: number;
      contributionDate?: string;
      description?: string;
    }) => {
      return await createInvestmentValue(
        investmentId,
        amount,
        contributionDate,
        description
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["investments"] });
      void qc.invalidateQueries({ queryKey: ["investment-monthly-summary"] });
    },
  });

  return {
    investments,
    accounts,
    monthlySummary: monthlySummaryQuery.data ?? [],
    isLoading:
      investmentsQuery.isLoading ||
      accountsQuery.isLoading ||
      monthlySummaryQuery.isLoading,
    isFetching:
      investmentsQuery.isFetching ||
      accountsQuery.isFetching ||
      monthlySummaryQuery.isFetching,
    addInvestment,
    updateInvestment: updateInvestmentMutation,
    deleteInvestment: deleteInvestmentMutation,
    swapOrder,
    addInvestmentValue,
  } as const;
}
