import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Types
interface MyInvestorMovement {
  fecha: string; // DD/MM/YYYY
  isin: string;
  importe: number; // Amount in EUR
  participaciones: number;
  estado: string;
}

interface EODHDSearchResult {
  Code: string;
  Exchange: string;
  Name: string;
  Type: string;
  ISIN: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: number;
  newFunds: string[];
}

// Fetch fund info from EODHD API by ISIN
async function fetchFundInfo(
  isin: string,
  apiToken: string
): Promise<EODHDSearchResult | null> {
  try {
    const url = `https://eodhd.com/api/search/${isin}?api_token=${apiToken}&fmt=json`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`EODHD API error for ${isin}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const match = data.find((item: EODHDSearchResult) => item.ISIN === isin);
      return match || data[0];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching EODHD data for ${isin}:`, error);
    return null;
  }
}

// Parse date from DD/MM/YYYY to YYYY-MM-DD
function parseDate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Map investment type from EODHD Type to our asset_type
function mapAssetType(
  eodhType: string | undefined
): "etf" | "stock" | "fund" | "crypto" | "bond" | "other" {
  if (!eodhType) return "fund";
  const type = eodhType.toUpperCase();
  if (type.includes("ETF")) return "etf";
  if (type.includes("STOCK") || type.includes("EQUITY")) return "stock";
  if (type.includes("CRYPTO")) return "crypto";
  if (type.includes("BOND")) return "bond";
  if (type.includes("FUND") || type.includes("MUTUAL")) return "fund";
  return "other";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const eodhApiToken = Deno.env.get("EODHD_API_TOKEN");

    if (!eodhApiToken) {
      throw new Error("EODHD_API_TOKEN not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    console.log(`📊 Processing MyInvestor import for user: ${user.id}`);

    const { movements } = (await req.json()) as { movements: MyInvestorMovement[] };

    if (!movements || !Array.isArray(movements) || movements.length === 0) {
      throw new Error("No movements provided");
    }

    // Filter only "Finalizada" movements
    const validMovements = movements.filter(
      (m) => m.estado?.toLowerCase() === "finalizada"
    );
    console.log(`✅ ${validMovements.length} valid movements`);

    // Get or create MyInvestor account in asset_categories
    let { data: myInvestorAccount } = await supabase
      .from("asset_categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "MyInvestor")
      .eq("type", "inversion")
      .maybeSingle();
      
    if (!myInvestorAccount) {
      console.log("📁 Creating MyInvestor account...");
      const { data: newAccount, error: accountError } = await supabase
        .from("asset_categories")
        .insert({
          user_id: user.id,
          name: "MyInvestor",
          type: "inversion",
          display_order: 0,
        })
        .select()
        .single();

      if (accountError) throw accountError;
      myInvestorAccount = newAccount;

      // Extract unique years from movements
      const yearsSet = new Set<number>();
      for (const m of validMovements) {
        const parts = m.fecha.split("/");
        if (parts.length === 3) {
          yearsSet.add(parseInt(parts[2], 10));
        }
      }
      
      // Add to asset_categories_years for each year
      for (const year of yearsSet) {
        await supabase.from("asset_categories_years").insert({
          category_id: newAccount.id,
          year,
        });
        console.log(`📅 Added MyInvestor to year ${year}`);
      }
    }

    // Group movements by ISIN to calculate total shares per fund
    const isinData: Record<string, { shares: number; totalAmount: number }> = {};
    for (const m of validMovements) {
      if (!isinData[m.isin]) {
        isinData[m.isin] = { shares: 0, totalAmount: 0 };
      }
      isinData[m.isin].shares += m.participaciones;
      isinData[m.isin].totalAmount += m.importe;
    }

    const uniqueIsins = Object.keys(isinData);
    console.log(`🔍 Found ${uniqueIsins.length} unique ISINs`);

    // Get existing holdings for this user with source='myinvestor'
    const { data: existingHoldings } = await supabase
      .from("holdings")
      .select("id, isin, quantity")
      .eq("user_id", user.id)
      .eq("source", "myinvestor")
      .in("isin", uniqueIsins);

    const holdingsMap = new Map(
      (existingHoldings || []).map((h: { id: string; isin: string; quantity: number }) => [h.isin, h])
    );

    const newFunds: string[] = [];

    // Process each unique ISIN - create or update holdings
    for (const isin of uniqueIsins) {
      const existing = holdingsMap.get(isin);
      const data = isinData[isin];
      
      if (existing) {
        // Update existing holding - add new shares
        const newQuantity = existing.quantity + data.shares;
        const newCostBasis = (existing.quantity * (await getHoldingCostBasis(supabase, existing.id)) + data.totalAmount) / newQuantity;
        
        await supabase
          .from("holdings")
          .update({ 
            quantity: newQuantity,
            cost_basis: newCostBasis,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);
        console.log(`📈 Updated ${isin}: +${data.shares} shares`);
        
        // Store holding_id for transactions
        holdingsMap.set(isin, { ...existing, id: existing.id });
      } else {
        // New ISIN - fetch fund info and create holding
        console.log(`🔎 Looking up ISIN ${isin} in EODHD...`);
        const fundInfo = await fetchFundInfo(isin, eodhApiToken);
        const fundName = fundInfo?.Name || `Fondo ${isin}`;
        const assetType = mapAssetType(fundInfo?.Type);

        // Create holding
        const { data: newHolding, error: holdingError } = await supabase
          .from("holdings")
          .insert({
            user_id: user.id,
            isin: isin,
            name: fundName,
            source: "myinvestor",
            asset_type: assetType,
            account_id: myInvestorAccount.id,
            quantity: data.shares,
            cost_basis: data.shares > 0 ? data.totalAmount / data.shares : 0,
            currency: "EUR",
            external_id: isin,
          })
          .select()
          .single();

        if (holdingError) {
          console.error(`Error creating holding for ${isin}:`, holdingError);
          continue;
        }

        holdingsMap.set(isin, { id: newHolding.id, isin, quantity: data.shares });
        newFunds.push(isin);
        console.log(`✨ Created "${fundName}" with ${data.shares} shares`);
      }
    }

    // Get existing transactions to detect duplicates
    const holdingIds = Array.from(holdingsMap.values()).map(h => h.id);
    const { data: existingTransactions } = await supabase
      .from("holding_transactions")
      .select("holding_id, transaction_date, amount")
      .eq("user_id", user.id)
      .in("holding_id", holdingIds);

    const existingTransactionsSet = new Set(
      (existingTransactions || []).map(
        (t: { holding_id: string; transaction_date: string; amount: number }) => 
          `${t.holding_id}|${t.transaction_date}|${t.amount}`
      )
    );

    // Create transactions for each movement
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const movement of validMovements) {
      const holding = holdingsMap.get(movement.isin);
      if (!holding) {
        errors++;
        continue;
      }

      try {
        const parsedDate = parseDate(movement.fecha);
        const key = `${holding.id}|${parsedDate}|${movement.importe}`;

        if (existingTransactionsSet.has(key)) {
          duplicates++;
          continue;
        }

        const { error: txError } = await supabase
          .from("holding_transactions")
          .insert({
            user_id: user.id,
            holding_id: holding.id,
            type: "buy",
            quantity: movement.participaciones,
            price: movement.participaciones > 0 ? movement.importe / movement.participaciones : 0,
            amount: movement.importe,
            transaction_date: parsedDate,
            description: `${movement.participaciones} participaciones`,
            imported_from: "myinvestor_csv",
          });

        if (txError) throw txError;
        existingTransactionsSet.add(key);
        imported++;
      } catch (error) {
        console.error(`Error processing movement:`, error);
        errors++;
      }
    }

    const result: ImportResult = {
      success: true,
      imported,
      duplicates,
      errors,
      newFunds,
    };

    console.log(`✅ Import complete: ${imported} imported, ${duplicates} duplicates, ${errors} errors`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error:", error);
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

// Helper to get current cost_basis of a holding
async function getHoldingCostBasis(supabase: any, holdingId: string): Promise<number> {
  const { data } = await supabase
    .from("holdings")
    .select("cost_basis")
    .eq("id", holdingId)
    .single();
  return data?.cost_basis || 0;
}
