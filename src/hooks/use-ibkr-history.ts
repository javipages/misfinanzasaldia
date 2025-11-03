import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IBKRHistoryEntry {
  id: string;
  user_id: string;
  sync_date: string;
  positions_count: number;
  total_value_usd: number;
  total_cost_usd: number;
  total_pnl_usd: number;
  status: "success" | "error";
  error_message: string | null;
  created_at: string;
}

/**
 * Hook to fetch IBKR sync history
 */
export function useIBKRHistory(limit: number = 30) {
  return useQuery({
    queryKey: ["ibkr-history", limit],
    queryFn: async (): Promise<IBKRHistoryEntry[]> => {
      const { data, error } = await supabase
        .from("ibkr_sync_history")
        .select("*")
        .order("sync_date", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as IBKRHistoryEntry[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get the latest successful sync
 */
export function useLatestSync() {
  return useQuery({
    queryKey: ["ibkr-latest-sync"],
    queryFn: async (): Promise<IBKRHistoryEntry | null> => {
      const { data, error } = await supabase
        .from("ibkr_sync_history")
        .select("*")
        .eq("status", "success")
        .order("sync_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data as IBKRHistoryEntry | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
