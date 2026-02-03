
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useExchangeRate } from "@/hooks/use-exchange-rate";

export interface InvestmentEvolutionPoint {
  date: string; // ISO date YYYY-MM-DD
  timestamp: number;
  
  // Totals (in Display Currency, default EUR)
  totalInvested: number;
  totalValue: number;
  
  // Breakdowns
  ibkrInvested: number;
  ibkrValue: number;
  otherInvested: number; // For non-IBKR, we assume Invested ~= Value for history if no granular data
  otherValue: number;
}

export function useInvestmentEvolution() {
  // We'll use EUR as base for calculation for now
  const { rate: usdToEur } = useExchangeRate("USD", "EUR");
  const exchangeRate = usdToEur || 0.92; // Fallback if loading
  
  return useQuery({
    queryKey: ["investment-evolution", exchangeRate],
    queryFn: async () => {
      // 1. Fetch IBKR History
      const { data: ibkrHistory, error: ibkrError } = await supabase
        .from("ibkr_sync_history")
        .select("sync_date, total_cost_usd, total_value_usd")
        .eq("status", "success")
        .order("sync_date", { ascending: true });
        
      if (ibkrError) throw ibkrError;

      // 2. Fetch Non-IBKR Transactions
      // We need transactions where holding->source != 'ibkr'
      // Supabase join syntax: holding_transactions!inner(..., holdings!inner(source))
      // But filtering on joined table is tricky with standard client. 
      // Let's fetch all transactions and holdings separately or use a join.
      
      const { data: transactions, error: txError } = await supabase
        .from("holding_transactions")
        .select(`
          transaction_date,
          amount,
          type,
          holdings!inner (
            source,
            currency
          )
        `)
        // .neq("holdings.source", "ibkr") // This syntax might not work directly on inner join filter depending on PostgREST version
        .order("transaction_date", { ascending: true });
        
      if (txError) throw txError;

      // Filter for non-IBKR transactions in memory
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const otherTransactions = (transactions || []).filter((tx: any) => 
        tx.holdings && tx.holdings.source !== "ibkr"
      );

      // 3. Construct Timeline
      const points = new Map<string, InvestmentEvolutionPoint>();
      
      // Helper to get or create point
      const getPoint = (dateStr: string) => {
        if (!points.has(dateStr)) {
          points.set(dateStr, {
            date: dateStr,
            timestamp: new Date(dateStr).getTime(),
            totalInvested: 0,
            totalValue: 0,
            ibkrInvested: 0,
            ibkrValue: 0,
            otherInvested: 0,
            otherValue: 0,
          });
        }
        return points.get(dateStr)!;
      };

      // Process IBKR History
      // IBKR history provides snapshots. We populate specific days.
      ibkrHistory?.forEach(entry => {
        const dateStr = new Date(entry.sync_date).toISOString().split('T')[0];
        const point = getPoint(dateStr);
        // Convert USD to EUR
        point.ibkrInvested = entry.total_cost_usd * exchangeRate;
        point.ibkrValue = entry.total_value_usd * exchangeRate;
      });

      // Process Transactions (Cumulative)
      // We need to calculate cumulative sum day by day
      // First, map transactions to dates
      const dailyNetInvested = new Map<string, number>();
      otherTransactions.forEach((tx: any) => {
        const dateStr = tx.transaction_date;
        const current = dailyNetInvested.get(dateStr) || 0;
        // Assuming 'amount' is the total money moved.
        // For 'buy', amount is positive (cost/invested increases)
        // For 'sell', amount is usually positive in DB (proceeds)? 
        // We need to check how amount is stored. Assuming amount is absolute value.
        // If type is 'buy', we ADD to invested.
        // If type is 'sell', we SUBTRACT from invested (reducing cost basis).
        let netChange = 0;
        const amount = Number(tx.amount);
        
        // Currency conversion if needed (assuming tx amount is in holding currency)
        // Simplified: assuming transaction amount is EUR for manual/myinvestor for now 
        // or effectively handling it as is.
        // TODO: Handle currency properly if holding.currency != EUR
        
        if (tx.type === 'buy' || tx.type === 'transfer') {
          netChange = amount;
        } else if (tx.type === 'sell') {
           netChange = -amount; // Reducing invested capital
        }
        
        dailyNetInvested.set(dateStr, current + netChange);
      });

      // 4. Merge and Forward Fill
      // Get all unique dates from both sources
      const allDates = new Set([
        ...Array.from(points.keys()),
        ...Array.from(dailyNetInvested.keys())
      ]);
      const sortedDates = Array.from(allDates).sort();

      const result: InvestmentEvolutionPoint[] = [];
      let lastIbkrInvested = 0;
      let lastIbkrValue = 0;
      let runningOtherInvested = 0;

      for (const date of sortedDates) {
        // Update cumulative 'other' invested
        if (dailyNetInvested.has(date)) {
          runningOtherInvested += dailyNetInvested.get(date)!;
        }

        // Check if we have an IBKR snapshot for this day
        // calculated in step 3 (points map)
        const snapshot = points.get(date);
        if (snapshot && snapshot.ibkrValue > 0) {
          lastIbkrInvested = snapshot.ibkrInvested;
          lastIbkrValue = snapshot.ibkrValue;
        }

        // Construct point
        result.push({
          date,
          timestamp: new Date(date).getTime(),
          ibkrInvested: lastIbkrInvested,
          ibkrValue: lastIbkrValue,
          otherInvested: runningOtherInvested,
          otherValue: runningOtherInvested, // Assuming Value = Cost for others
          totalInvested: lastIbkrInvested + runningOtherInvested,
          totalValue: lastIbkrValue + runningOtherInvested,
        });
      }

      return result;
    },
  });
}
