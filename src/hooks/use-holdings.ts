import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Types for the new holdings system
// These will be auto-generated once migrations are applied and types regenerated
// ============================================================================

export interface Holding {
  id: string;
  user_id: string;
  symbol: string | null;
  isin: string | null;
  name: string;
  source: "ibkr" | "myinvestor" | "manual";
  asset_type: "etf" | "stock" | "fund" | "crypto" | "bond" | "other";
  account_id: string | null;
  quantity: number;
  cost_basis: number | null;
  current_price: number | null;
  currency: string;
  external_id: string | null;
  exchange: string | null;
  last_price_update: string | null;
  created_at: string;
  updated_at: string;
  // Calculated fields
  position_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
}

export interface HoldingTransaction {
  id: string;
  user_id: string;
  holding_id: string;
  type: "buy" | "sell" | "dividend" | "transfer";
  quantity: number | null;
  price: number | null;
  amount: number;
  transaction_date: string;
  description: string | null;
  imported_from: string | null;
  created_at: string;
}

export interface CashBalance {
  id: string;
  user_id: string;
  source: "ibkr" | "myinvestor" | "manual";
  currency: string;
  amount: number;
  last_sync_at: string | null;
}

export interface HoldingInput {
  symbol?: string;
  isin?: string;
  name: string;
  source: "ibkr" | "myinvestor" | "manual";
  asset_type: "etf" | "stock" | "fund" | "crypto" | "bond" | "other";
  account_id?: string;
  quantity: number;
  cost_basis?: number;
  current_price?: number;
  currency?: string;
}

export interface TransactionInput {
  holding_id: string;
  type?: "buy" | "sell" | "dividend" | "transfer";
  quantity?: number;
  price?: number;
  amount: number;
  transaction_date: string;
  description?: string;
}

// ============================================================================
// Type-safe API helpers using generic Supabase client
// Note: Using `as any` for table names until types are regenerated
// ============================================================================

type DbHolding = Omit<Holding, "position_value" | "unrealized_pnl" | "unrealized_pnl_percent">;

// API Functions
async function listHoldings(): Promise<Holding[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("holdings")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  // Calculate derived fields
  return ((data as DbHolding[]) || []).map((h) => {
    const positionValue = h.quantity * (h.current_price || h.cost_basis || 0);
    const costValue = h.quantity * (h.cost_basis || 0);
    const unrealizedPnl = positionValue - costValue;
    const unrealizedPnlPercent = costValue > 0 ? (unrealizedPnl / costValue) * 100 : 0;

    return {
      ...h,
      position_value: positionValue,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_percent: unrealizedPnlPercent,
    } as Holding;
  });
}

async function listCashBalances(): Promise<CashBalance[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("cash_balances")
    .select("*")
    .order("source", { ascending: true });

  if (error) throw error;
  return (data as CashBalance[]) || [];
}

async function createHolding(input: HoldingInput): Promise<Holding> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("holdings")
    .insert({
      user_id: user.id,
      symbol: input.symbol,
      isin: input.isin,
      name: input.name,
      source: input.source,
      asset_type: input.asset_type,
      account_id: input.account_id,
      quantity: input.quantity,
      cost_basis: input.cost_basis,
      current_price: input.current_price || input.cost_basis,
      currency: input.currency || "EUR",
    })
    .select()
    .single();

  if (error) throw error;
  
  const h = data as DbHolding;
  const positionValue = h.quantity * (h.current_price || h.cost_basis || 0);
  const costValue = h.quantity * (h.cost_basis || 0);
  return {
    ...h,
    position_value: positionValue,
    unrealized_pnl: positionValue - costValue,
    unrealized_pnl_percent: costValue > 0 ? ((positionValue - costValue) / costValue) * 100 : 0,
  };
}

async function updateHolding(id: string, input: Partial<HoldingInput>): Promise<Holding> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("holdings")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  const h = data as DbHolding;
  const positionValue = h.quantity * (h.current_price || h.cost_basis || 0);
  const costValue = h.quantity * (h.cost_basis || 0);
  return {
    ...h,
    position_value: positionValue,
    unrealized_pnl: positionValue - costValue,
    unrealized_pnl_percent: costValue > 0 ? ((positionValue - costValue) / costValue) * 100 : 0,
  };
}

async function deleteHolding(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("holdings")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

async function createTransaction(input: TransactionInput): Promise<HoldingTransaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("holding_transactions")
    .insert({
      user_id: user.id,
      holding_id: input.holding_id,
      type: input.type || "buy",
      quantity: input.quantity,
      price: input.price,
      amount: input.amount,
      transaction_date: input.transaction_date,
      description: input.description,
      imported_from: "manual",
    })
    .select()
    .single();

  if (error) throw error;
  return data as HoldingTransaction;
}

async function listTransactions(holdingId: string): Promise<HoldingTransaction[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("holding_transactions")
    .select("*")
    .eq("holding_id", holdingId)
    .order("transaction_date", { ascending: false });

  if (error) throw error;
  return (data as HoldingTransaction[]) || [];
}

// ============================================================================
// React Query Hook
// ============================================================================

export function useHoldings(filters?: { source?: string; asset_type?: string }) {
  const qc = useQueryClient();

  // Query for all holdings
  const holdingsQuery = useQuery({
    queryKey: ["holdings", filters],
    queryFn: async () => {
      let holdings = await listHoldings();
      
      // Apply filters
      if (filters?.source) {
        holdings = holdings.filter((h) => h.source === filters.source);
      }
      if (filters?.asset_type) {
        holdings = holdings.filter((h) => h.asset_type === filters.asset_type);
      }
      
      return holdings;
    },
  });

  // Query for cash balances
  const cashQuery = useQuery({
    queryKey: ["cash_balances"],
    queryFn: listCashBalances,
  });

  // Mutations
  const addHolding = useMutation({
    mutationFn: createHolding,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["holdings"] });
    },
  });

  const updateHoldingMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<HoldingInput> }) =>
      updateHolding(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["holdings"] });
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: deleteHolding,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["holdings"] });
    },
  });

  const addTransaction = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["holdings"] });
    },
  });

  // Computed values
  const holdings = useMemo(() => holdingsQuery.data || [], [holdingsQuery.data]);
  const cashBalances = useMemo(() => cashQuery.data || [], [cashQuery.data]);

  // Group by source
  const holdingsBySource = useMemo(() => {
    const groups: Record<string, Holding[]> = {};
    for (const h of holdings) {
      if (!groups[h.source]) groups[h.source] = [];
      groups[h.source].push(h);
    }
    return groups;
  }, [holdings]);

  // Totals (in EUR - assumes IBKR positions are USD and need conversion)
  const totals = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => sum + h.position_value, 0);
    const totalCost = holdings.reduce(
      (sum, h) => sum + h.quantity * (h.cost_basis || 0),
      0
    );
    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
    };
  }, [holdings]);

  // Cash totals
  const cashTotals = useMemo(() => {
    const bySource: Record<string, { EUR: number; USD: number }> = {};
    for (const c of cashBalances) {
      if (!bySource[c.source]) bySource[c.source] = { EUR: 0, USD: 0 };
      if (c.currency === "EUR") bySource[c.source].EUR = c.amount;
      if (c.currency === "USD") bySource[c.source].USD = c.amount;
    }
    return bySource;
  }, [cashBalances]);

  return {
    // Data
    holdings,
    holdingsBySource,
    cashBalances,
    cashTotals,
    totals,
    
    // Loading states
    isLoading: holdingsQuery.isLoading || cashQuery.isLoading,
    isFetching: holdingsQuery.isFetching || cashQuery.isFetching,
    
    // Mutations
    addHolding,
    updateHolding: updateHoldingMutation,
    deleteHolding: deleteHoldingMutation,
    addTransaction,
    
    // Utils
    listTransactions,
  } as const;
}

// Helper hook for a single holding's transactions
export function useHoldingTransactions(holdingId: string | null) {
  return useQuery({
    queryKey: ["holding_transactions", holdingId],
    queryFn: () => (holdingId ? listTransactions(holdingId) : []),
    enabled: !!holdingId,
  });
}
