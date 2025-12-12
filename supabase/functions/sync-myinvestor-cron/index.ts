import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Holding {
  id: string;
  user_id: string;
  isin: string;
  name: string;
  quantity: number;
}

// Fetch current price from EODHD (end-of-day)
async function fetchCurrentPrice(
  isin: string,
  apiToken: string
): Promise<number | null> {
  try {
    // First, search for the symbol by ISIN
    const searchUrl = `https://eodhd.com/api/search/${isin}?api_token=${apiToken}&fmt=json`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      console.error(`EODHD search error for ${isin}: ${searchRes.status}`);
      return null;
    }

    const searchData = await searchRes.json();
    if (!Array.isArray(searchData) || searchData.length === 0) {
      console.error(`No results found for ISIN ${isin}`);
      return null;
    }

    // Get the first match
    const symbol = searchData[0].Code;
    const exchange = searchData[0].Exchange;

    // Fetch end-of-day data (more reliable for funds)
    const eodUrl = `https://eodhd.com/api/eod/${symbol}.${exchange}?api_token=${apiToken}&fmt=json&period=d&order=d&limit=1`;
    const eodRes = await fetch(eodUrl);

    if (!eodRes.ok) {
      console.error(`EODHD EOD error for ${symbol}.${exchange}: ${eodRes.status}`);
      return null;
    }

    const eodData = await eodRes.json();
    if (Array.isArray(eodData) && eodData.length > 0) {
      const price = eodData[0].close;
      if (typeof price === 'number' && !isNaN(price)) {
        return price;
      }
    }
    
    console.error(`No valid EOD price for ${isin}`);
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${isin}:`, error);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const eodhApiToken = Deno.env.get("EODHD_API_TOKEN");

    if (!eodhApiToken) {
      throw new Error("EODHD_API_TOKEN not configured");
    }

    // Use service role for CRON (no user session)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🕐 Starting MyInvestor price sync CRON...");

    // Get all holdings with source='myinvestor' that have an ISIN
    const { data: allHoldings, error: holdingsError } = await supabase
      .from("holdings")
      .select("id, user_id, isin, name, quantity")
      .eq("source", "myinvestor")
      .not("isin", "is", null);

    if (holdingsError) throw holdingsError;

    if (!allHoldings || allHoldings.length === 0) {
      console.log("No MyInvestor holdings found, nothing to update");
      return new Response(JSON.stringify({ success: true, message: "No funds to update" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by ISIN to avoid duplicate API calls
    const isinToHoldings = new Map<string, Holding[]>();
    for (const holding of allHoldings as Holding[]) {
      if (!holding.isin) continue;
      const list = isinToHoldings.get(holding.isin) || [];
      list.push(holding);
      isinToHoldings.set(holding.isin, list);
    }

    console.log(`📊 Found ${isinToHoldings.size} unique ISINs to update`);

    let updated = 0;
    let errors = 0;

    // Fetch price for each unique ISIN
    for (const [isin, holdings] of isinToHoldings) {
      console.log(`💰 Fetching price for ${isin}...`);
      const price = await fetchCurrentPrice(isin, eodhApiToken);

      if (price === null) {
        console.error(`❌ Could not get price for ${isin}`);
        errors++;
        continue;
      }

      console.log(`✅ ${isin}: ${price} EUR per share`);

      // Save price to benchmark_history for historical tracking
      const today = new Date().toISOString().split("T")[0];
      const { error: benchmarkError } = await supabase
        .from("benchmark_history")
        .upsert(
          {
            benchmark_name: `ISIN:${isin}`,
            date: today,
            close_value: price,
          },
          { onConflict: "benchmark_name,date" }
        );
      
      if (benchmarkError) {
        console.error(`Error saving to benchmark_history:`, benchmarkError);
      } else {
        console.log(`📊 Saved ${isin} price to benchmark_history`);
      }

      // Update holdings with the new price
      for (const holding of holdings) {
        const { error: updateError } = await supabase
          .from("holdings")
          .update({ 
            current_price: price, 
            last_price_update: new Date().toISOString() 
          })
          .eq("id", holding.id);

        if (updateError) {
          console.error(`Error updating holding ${holding.id}:`, updateError);
          errors++;
        } else {
          const totalValue = holding.quantity * price;
          console.log(`📈 Updated ${holding.name}: ${holding.quantity} × ${price} = ${totalValue.toFixed(2)} EUR`);
          updated++;
        }
      }

      // Rate limiting - wait 200ms between ISIN requests
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`✅ CRON complete: ${updated} holdings updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        errors,
        isinsProcessed: isinToHoldings.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ CRON Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
