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
  free: number
  locked: number
  earnFlexible: number
  earnLocked: number
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
    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    console.log(`🔄 Syncing Binance for user: ${user.id}`)

    // Get Binance config
    const { data: config, error: configError } = await supabase
      .from('binance_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config) {
      throw new Error('No Binance config found. Please configure Binance first.')
    }

    // Decrypt credentials
    console.log('🔓 Decrypting credentials...')
    const apiKey = await decrypt(config.api_key)
    const apiSecret = await decrypt(config.api_secret)
    console.log('✅ Credentials decrypted')

    // Fetch all data from Binance
    console.log('📡 Fetching from Binance...')
    const { balances, totalValueUSD } = await fetchBinanceData(apiKey, apiSecret)

    console.log(`📦 Got ${balances.length} non-zero balances from Binance`)

    let created = 0
    let updated = 0

    // Process each balance - upsert to holdings table
    for (const balance of balances) {
      // Skip zero balances or dust (less than $1 value)
      if (balance.total === 0 || balance.valueUSD < 1) continue

      // Check if exists in holdings by symbol (external_id)
      const { data: existing } = await supabase
        .from('holdings')
        .select('id')
        .eq('user_id', user.id)
        .eq('source', 'binance')
        .eq('external_id', balance.asset)
        .maybeSingle()

      const holdingData = {
        user_id: user.id,
        symbol: balance.asset,
        name: getCryptoName(balance.asset),
        source: 'binance' as const,
        asset_type: 'crypto' as const,
        quantity: balance.total,
        cost_basis: balance.costBasis,
        current_price: balance.priceUSD,
        currency: 'USD',
        external_id: balance.asset,
        last_price_update: new Date().toISOString(),
      }

      if (existing) {
        // Update existing holding
        const { error: updateError } = await supabase
          .from('holdings')
          .update(holdingData)
          .eq('id', existing.id)
        
        if (updateError) {
          console.error(`Failed to update ${balance.asset}:`, updateError)
        } else {
          updated++
        }
      } else {
        // Insert new holding
        const { error: insertError } = await supabase
          .from('holdings')
          .insert(holdingData)
        
        if (insertError) {
          console.error(`Failed to insert ${balance.asset}:`, insertError)
        } else {
          created++
        }
      }
    }

    // Handle stablecoins as cash balances (only if > $1)
    const stablecoins = ['USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD']
    for (const balance of balances) {
      if (stablecoins.includes(balance.asset) && balance.total >= 1) {
        await supabase
          .from('cash_balances')
          .upsert({
            user_id: user.id,
            source: 'binance',
            currency: 'USD',
            amount: balance.total,
            last_sync_at: new Date().toISOString(),
          }, { onConflict: 'user_id,source,currency' })
      }
    }

    // Update last sync time in config
    await supabase
      .from('binance_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id)

    console.log(`✅ Done: ${created} created, ${updated} updated`)
    console.log(`📊 Total value: $${totalValueUSD.toFixed(2)}, ${balances.length} positions`)

    return new Response(
      JSON.stringify({
        success: true,
        created,
        updated,
        total: balances.length,
        totalValueUSD,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error:', error)

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
    // Don't throw for 400 errors on optional endpoints (like Earn when not available)
    if (res.status === 400 || res.status === 404) {
      console.log(`⚠️ Endpoint ${endpoint} not available:`, errorText)
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
  console.log('📊 Fetching spot balances...')
  const accountData = await binanceRequest('/api/v3/account', apiKey, apiSecret)
  
  // Build balance map
  const balanceMap = new Map<string, { free: number; locked: number; earnFlexible: number; earnLocked: number }>()
  
  for (const b of accountData.balances) {
    const free = parseFloat(b.free)
    const locked = parseFloat(b.locked)
    if (free > 0 || locked > 0) {
      balanceMap.set(b.asset, { free, locked, earnFlexible: 0, earnLocked: 0 })
    }
  }
  
  // 2. Get Simple Earn Flexible positions
  console.log('💰 Fetching Earn Flexible positions...')
  try {
    const flexibleData = await binanceRequest('/sapi/v1/simple-earn/flexible/position', apiKey, apiSecret, { size: '100' })
    if (flexibleData?.rows) {
      for (const pos of flexibleData.rows) {
        const asset = pos.asset
        const amount = parseFloat(pos.totalAmount || '0')
        if (amount > 0) {
          const existing = balanceMap.get(asset) || { free: 0, locked: 0, earnFlexible: 0, earnLocked: 0 }
          existing.earnFlexible += amount
          balanceMap.set(asset, existing)
          console.log(`  📈 Earn Flexible: ${amount} ${asset}`)
        }
      }
    }
  } catch (e) {
    console.log('⚠️ Could not fetch Earn Flexible:', e)
  }
  
  // 3. Get Simple Earn Locked positions
  console.log('🔒 Fetching Earn Locked positions...')
  try {
    const lockedData = await binanceRequest('/sapi/v1/simple-earn/locked/position', apiKey, apiSecret, { size: '100' })
    if (lockedData?.rows) {
      for (const pos of lockedData.rows) {
        const asset = pos.asset
        const amount = parseFloat(pos.amount || '0')
        if (amount > 0) {
          const existing = balanceMap.get(asset) || { free: 0, locked: 0, earnFlexible: 0, earnLocked: 0 }
          existing.earnLocked += amount
          balanceMap.set(asset, existing)
          console.log(`  🔐 Earn Locked: ${amount} ${asset}`)
        }
      }
    }
  } catch (e) {
    console.log('⚠️ Could not fetch Earn Locked:', e)
  }
  
  // 4. Get prices for all assets
  console.log('💵 Fetching prices...')
  const pricesRes = await fetch(`${BINANCE_API_URL}/api/v3/ticker/price`)
  const pricesData = await pricesRes.json()
  
  const priceMap = new Map<string, number>()
  for (const p of pricesData) {
    if (p.symbol.endsWith('USDT')) {
      const asset = p.symbol.replace('USDT', '')
      priceMap.set(asset, parseFloat(p.price))
    }
  }
  
  // Stablecoins are 1:1 with USD
  const stablecoins = ['USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD']
  stablecoins.forEach(s => priceMap.set(s, 1))
  
  // 5. Calculate cost basis from trade history
  console.log('📜 Fetching trade history for cost basis...')
  const costBasisMap = await calculateCostBasis(apiKey, apiSecret, Array.from(balanceMap.keys()))
  
  // 6. Build final balance array
  const balances: BinanceBalance[] = []
  
  for (const [asset, bal] of balanceMap.entries()) {
    const total = bal.free + bal.locked + bal.earnFlexible + bal.earnLocked
    if (total > 0) {
      const priceUSD = priceMap.get(asset) || 0
      balances.push({
        asset,
        free: bal.free,
        locked: bal.locked,
        earnFlexible: bal.earnFlexible,
        earnLocked: bal.earnLocked,
        total,
        priceUSD,
        valueUSD: total * priceUSD,
        costBasis: costBasisMap.get(asset) || null,
      })
    }
  }
  
  const totalValueUSD = balances.reduce((sum: number, b: BinanceBalance) => sum + b.valueUSD, 0)
  
  console.log(`📊 Total: ${balances.length} assets, $${totalValueUSD.toFixed(2)} value`)
  
  return { balances, totalValueUSD }
}

// Calculate average cost basis from trade history
async function calculateCostBasis(
  apiKey: string, 
  apiSecret: string, 
  assets: string[]
): Promise<Map<string, number>> {
  const costBasisMap = new Map<string, number>()
  
  // Only get trades for non-stablecoin assets
  const stablecoins = ['USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD']
  const tradableAssets = assets.filter(a => !stablecoins.includes(a))
  
  for (const asset of tradableAssets) {
    try {
      // Get trades for asset/USDT pair
      const symbol = `${asset}USDT`
      const trades = await binanceRequest('/api/v3/myTrades', apiKey, apiSecret, { 
        symbol,
        limit: '1000' 
      })
      
      if (!trades || trades.length === 0) continue
      
      // Calculate weighted average cost basis
      let totalQty = 0
      let totalCost = 0
      
      for (const trade of trades) {
        const qty = parseFloat(trade.qty)
        const price = parseFloat(trade.price)
        const isBuyer = trade.isBuyer
        
        if (isBuyer) {
          // Buying - add to position
          totalCost += qty * price
          totalQty += qty
        } else {
          // Selling - reduce position (FIFO simplified)
          if (totalQty > 0) {
            const avgCost = totalCost / totalQty
            const sellQty = Math.min(qty, totalQty)
            totalCost -= sellQty * avgCost
            totalQty -= sellQty
          }
        }
      }
      
      if (totalQty > 0) {
        const avgCostBasis = totalCost / totalQty
        costBasisMap.set(asset, avgCostBasis)
        console.log(`  💰 ${asset}: avg cost $${avgCostBasis.toFixed(4)}`)
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100))
      
    } catch (e) {
      // Many pairs might not have trades or exist
      console.log(`  ⚠️ No trades for ${asset}`)
    }
  }
  
  return costBasisMap
}
