import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt } from '../_shared/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BINANCE_API_URL = 'https://api.binance.com'

interface BinanceBalance {
  asset: string
  total: number
  priceUSD: number
  valueUSD: number
  costBasis: number | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🕐 Starting Binance cron job...')

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all users with Binance config
    const { data: configs, error: configError } = await supabase
      .from('binance_config')
      .select('user_id, api_key, api_secret, last_sync_at')

    if (configError) {
      throw new Error(`Failed to fetch configs: ${configError.message}`)
    }

    if (!configs || configs.length === 0) {
      console.log('📭 No Binance configs found')
      return new Response(
        JSON.stringify({ success: true, message: 'No users to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`👥 Found ${configs.length} users with Binance config`)

    let syncedCount = 0
    let errorCount = 0
    const results = []

    // Sync each user
    for (const config of configs) {
      try {
        console.log(`\n🔄 Syncing user: ${config.user_id}`)

        // Decrypt credentials
        const apiKey = await decrypt(config.api_key)
        const apiSecret = await decrypt(config.api_secret)

        // Fetch from Binance
        const { balances, totalValueUSD } = await fetchBinanceData(apiKey, apiSecret)
        console.log(`📦 Got ${balances.length} positions`)

        // Update/insert holdings (skip dust < $1)
        for (const balance of balances) {
          if (balance.total === 0 || balance.valueUSD < 1) continue

          const holdingData = {
            user_id: config.user_id,
            symbol: balance.asset,
            name: getCryptoName(balance.asset),
            source: 'binance',
            asset_type: 'crypto',
            quantity: balance.total,
            cost_basis: balance.costBasis,
            current_price: balance.priceUSD,
            currency: 'USD',
            external_id: balance.asset,
            last_price_update: new Date().toISOString(),
          }

          // Upsert holding
          await supabase
            .from('holdings')
            .upsert(holdingData, {
              onConflict: 'user_id,source,external_id',
            })
        }

        // Handle stablecoins as cash balances (only if >= $1)
        const stablecoins = ['USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD']
        for (const balance of balances) {
          if (stablecoins.includes(balance.asset) && balance.total >= 1) {
            await supabase
              .from('cash_balances')
              .upsert({
                user_id: config.user_id,
                source: 'binance',
                currency: 'USD',
                amount: balance.total,
                last_sync_at: new Date().toISOString(),
              }, { onConflict: 'user_id,source,currency' })
          }
        }

        // Update last sync time
        await supabase
          .from('binance_config')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', config.user_id)

        syncedCount++
        results.push({
          user_id: config.user_id,
          status: 'success',
          positions: balances.length,
          totalValueUSD,
        })

        console.log(`✅ User ${config.user_id} synced: ${balances.length} positions, $${totalValueUSD.toFixed(2)}`)

        // Wait 2 seconds between users to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000))

      } catch (userError) {
        errorCount++
        const errorMessage = userError instanceof Error ? userError.message : 'Unknown error'
        console.error(`❌ Failed to sync user ${config.user_id}:`, errorMessage)

        results.push({
          user_id: config.user_id,
          status: 'error',
          error: errorMessage,
        })
      }
    }

    console.log(`\n📊 Cron job completed: ${syncedCount} synced, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        errors: errorCount,
        total: configs.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Cron job error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Get human-readable name for crypto
function getCryptoName(symbol: string): string {
  const names: Record<string, string> = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'BNB': 'Binance Coin',
    'SOL': 'Solana',
    'XRP': 'Ripple',
    'ADA': 'Cardano',
    'DOGE': 'Dogecoin',
    'DOT': 'Polkadot',
    'MATIC': 'Polygon',
    'LINK': 'Chainlink',
    'AVAX': 'Avalanche',
    'UNI': 'Uniswap',
    'ATOM': 'Cosmos',
    'LTC': 'Litecoin',
    'USDT': 'Tether USD',
    'USDC': 'USD Coin',
    'BUSD': 'Binance USD',
    'DAI': 'Dai',
    'FDUSD': 'First Digital USD',
  }
  return names[symbol] || symbol
}

// Create HMAC SHA256 signature for Binance API
async function createSignature(queryString: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(apiSecret)
  const messageData = encoder.encode(queryString)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Make authenticated request to Binance API
async function binanceRequest(endpoint: string, apiKey: string, apiSecret: string, params: Record<string, string> = {}): Promise<any> {
  const timestamp = Date.now()
  const queryParams = new URLSearchParams({ ...params, timestamp: timestamp.toString() })
  const queryString = queryParams.toString()
  const signature = await createSignature(queryString, apiSecret)
  
  const url = `${BINANCE_API_URL}${endpoint}?${queryString}&signature=${signature}`
  
  const res = await fetch(url, {
    headers: { 'X-MBX-APIKEY': apiKey },
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    if (res.status === 400 || res.status === 404) {
      return null
    }
    throw new Error(`Binance API error (${endpoint}): ${res.status} - ${errorText}`)
  }
  
  return res.json()
}

// Fetch all balances from Binance (Spot + Earn)
async function fetchBinanceData(apiKey: string, apiSecret: string): Promise<{
  balances: BinanceBalance[]
  totalValueUSD: number
}> {
  // 1. Get spot account balances
  const accountData = await binanceRequest('/api/v3/account', apiKey, apiSecret)
  
  const balanceMap = new Map<string, number>()
  
  for (const b of accountData.balances) {
    const total = parseFloat(b.free) + parseFloat(b.locked)
    if (total > 0) {
      balanceMap.set(b.asset, total)
    }
  }
  
  // 2. Get Simple Earn Flexible positions
  try {
    const flexibleData = await binanceRequest('/sapi/v1/simple-earn/flexible/position', apiKey, apiSecret, { size: '100' })
    if (flexibleData?.rows) {
      for (const pos of flexibleData.rows) {
        const amount = parseFloat(pos.totalAmount || '0')
        if (amount > 0) {
          const existing = balanceMap.get(pos.asset) || 0
          balanceMap.set(pos.asset, existing + amount)
        }
      }
    }
  } catch (e) {
    console.log('⚠️ Could not fetch Earn Flexible')
  }
  
  // 3. Get Simple Earn Locked positions
  try {
    const lockedData = await binanceRequest('/sapi/v1/simple-earn/locked/position', apiKey, apiSecret, { size: '100' })
    if (lockedData?.rows) {
      for (const pos of lockedData.rows) {
        const amount = parseFloat(pos.amount || '0')
        if (amount > 0) {
          const existing = balanceMap.get(pos.asset) || 0
          balanceMap.set(pos.asset, existing + amount)
        }
      }
    }
  } catch (e) {
    console.log('⚠️ Could not fetch Earn Locked')
  }
  
  // 4. Get prices
  const pricesRes = await fetch(`${BINANCE_API_URL}/api/v3/ticker/price`)
  const pricesData = await pricesRes.json()
  
  const priceMap = new Map<string, number>()
  for (const p of pricesData) {
    if (p.symbol.endsWith('USDT')) {
      priceMap.set(p.symbol.replace('USDT', ''), parseFloat(p.price))
    }
  }
  
  const stablecoins = ['USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD']
  stablecoins.forEach(s => priceMap.set(s, 1))
  
  // 5. Build final balance array (skip cost basis in cron to save time)
  const balances: BinanceBalance[] = []
  
  for (const [asset, total] of balanceMap.entries()) {
    const priceUSD = priceMap.get(asset) || 0
    balances.push({
      asset,
      total,
      priceUSD,
      valueUSD: total * priceUSD,
      costBasis: null, // Don't calculate in cron to avoid rate limits
    })
  }
  
  const totalValueUSD = balances.reduce((sum: number, b: BinanceBalance) => sum + b.valueUSD, 0)
  
  return { balances, totalValueUSD }
}
