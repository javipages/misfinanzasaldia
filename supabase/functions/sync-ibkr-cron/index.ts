import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt } from '../_shared/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🕐 Starting IBKR cron job...')

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all users with IBKR config
    const { data: configs, error: configError } = await supabase
      .from('ibkr_config')
      .select('user_id, token, query_id, last_sync_at')

    if (configError) {
      throw new Error(`Failed to fetch configs: ${configError.message}`)
    }

    if (!configs || configs.length === 0) {
      console.log('📭 No IBKR configs found')
      return new Response(
        JSON.stringify({ success: true, message: 'No users to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`👥 Found ${configs.length} users with IBKR config`)

    let syncedCount = 0
    let errorCount = 0
    const results = []

    // Sync each user
    for (const config of configs) {
      try {
        console.log(`\n🔄 Syncing user: ${config.user_id}`)

        // Decrypt credentials
        const token = await decrypt(config.token)
        const queryId = await decrypt(config.query_id)

        // Fetch from IBKR
        const { positions, cashBalances } = await fetchIBKRData(token, queryId)
        console.log(`📦 Got ${positions.length} positions`)
        console.log(`💰 Got cash balances: EUR=${cashBalances.EUR}, USD=${cashBalances.USD}`)

        // Calculate totals
        const totalValueUSD = positions.reduce((sum, pos) => sum + pos.positionValue, 0)
        const totalCostUSD = positions.reduce((sum, pos) => sum + (pos.quantity * pos.costBasis), 0)
        const totalPnlUSD = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0)

        // Update/insert positions
        for (const pos of positions) {
          if (pos.quantity === 0) continue

          const pnlPercent = pos.costBasis > 0
            ? ((pos.price - pos.costBasis) / pos.costBasis) * 100
            : 0

          const positionData = {
            user_id: config.user_id,
            symbol: pos.symbol,
            description: pos.description,
            conid: pos.conid,
            isin: pos.isin,
            quantity: pos.quantity,
            current_price: pos.price,
            cost_basis: pos.costBasis,
            position_value: pos.positionValue,
            unrealized_pnl: pos.unrealizedPnl,
            unrealized_pnl_percent: pnlPercent,
            asset_category: pos.assetCategory,
            currency: pos.currency,
            exchange: pos.exchange,
            last_sync_at: new Date().toISOString(),
          }

          // Upsert position
          await supabase
            .from('ibkr_positions')
            .upsert(positionData, {
              onConflict: 'user_id,conid',
            })
        }

        // Update last sync time
        await supabase
          .from('ibkr_config')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', config.user_id)

        // Save to history
        await supabase
          .from('ibkr_sync_history')
          .insert({
            user_id: config.user_id,
            positions_count: positions.length,
            total_value_usd: totalValueUSD,
            total_cost_usd: totalCostUSD,
            total_pnl_usd: totalPnlUSD,
            total_cash_eur: cashBalances.EUR,
            total_cash_usd: cashBalances.USD,
            status: 'success',
          })

        syncedCount++
        results.push({
          user_id: config.user_id,
          status: 'success',
          positions: positions.length,
        })

        console.log(`✅ User ${config.user_id} synced: ${positions.length} positions, $${totalValueUSD.toFixed(2)}`)

        // Wait 2 seconds between users to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000))

      } catch (userError) {
        errorCount++
        const errorMessage = userError instanceof Error ? userError.message : 'Unknown error'
        console.error(`❌ Failed to sync user ${config.user_id}:`, errorMessage)

        // Save error to history
        try {
          await supabase
            .from('ibkr_sync_history')
            .insert({
              user_id: config.user_id,
              positions_count: 0,
              total_value_usd: 0,
              total_cost_usd: 0,
              total_pnl_usd: 0,
              status: 'error',
              error_message: errorMessage,
            })
        } catch (historyError) {
          console.error('Failed to save error history:', historyError)
        }

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

// Fetch positions and cash from IBKR Flex Web Service
async function fetchIBKRData(token: string, queryId: string): Promise<{
  positions: Array<{
    symbol: string
    description: string
    conid: string
    isin: string | null
    quantity: number
    price: number
    costBasis: number
    positionValue: number
    unrealizedPnl: number
    assetCategory: string
    currency: string
    exchange: string
  }>
  cashBalances: { EUR: number; USD: number }
}> {
  // Step 1: Request
  const requestUrl = `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest?t=${token}&q=${queryId}&v=3`
  const requestRes = await fetch(requestUrl)
  const requestXml = await requestRes.text()

  // Check for rate limiting
  if (requestXml.includes('ErrorCode>1018<') || requestXml.includes('Too many requests')) {
    throw new Error('IBKR rate limit reached')
  }

  // Parse reference code
  const refCodeMatch = requestXml.match(/<ReferenceCode>([^<]+)<\/ReferenceCode>/)
  const refCode = refCodeMatch ? refCodeMatch[1] : null

  if (!refCode) {
    const errorMatch = requestXml.match(/<ErrorMessage>([^<]+)<\/ErrorMessage>/)
    if (errorMatch) {
      throw new Error('IBKR error: ' + errorMatch[1])
    }
    throw new Error('Failed to get reference code from IBKR')
  }

  console.log(`📋 Got reference code: ${refCode}`)

  // Step 2: Poll for statement (max 30 attempts)
  for (let i = 0; i < 30; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 5000))
    }

    const statementUrl = `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.GetStatement?q=${refCode}&t=${token}&v=3`
    const statementRes = await fetch(statementUrl)
    const xml = await statementRes.text()

    // Success
    if (xml.includes('<FlexStatements')) {
      console.log('✅ Statement ready')
      const positions = parsePositions(xml)
      const cashBalances = parseCashBalances(xml)
      return { positions, cashBalances }
    }

    // Rate limiting
    if (xml.includes('ErrorCode>1018<') || xml.includes('Too many requests')) {
      throw new Error('IBKR rate limit reached')
    }

    // Statement in progress
    if (xml.includes('Statement generation in progress') || xml.includes('Code>1019<')) {
      console.log(`⏳ Waiting... (${i + 1}/30)`)
      continue
    }

    // Other errors
    if (xml.includes('ErrorMessage') && !xml.includes('in progress')) {
      const errorMatch = xml.match(/<ErrorMessage>([^<]+)<\/ErrorMessage>/)
      const errorMsg = errorMatch ? errorMatch[1] : xml.substring(0, 200)
      throw new Error('IBKR error: ' + errorMsg)
    }
  }

  throw new Error('Timeout waiting for IBKR statement')
}

// Parse positions from XML
function parsePositions(xml: string) {
  const positions = []
  const positionRegex = /<OpenPosition\s+([^>]+)\/>/g
  const matches = xml.matchAll(positionRegex)

  for (const match of matches) {
    const attributes = match[1]

    const getAttr = (name: string) => {
      const regex = new RegExp(`${name}="([^"]*)"`)
      const match = attributes.match(regex)
      return match ? match[1] : ''
    }

    const quantity = parseFloat(getAttr('position') || '0')
    const price = parseFloat(getAttr('markPrice') || '0')
    const costBasis = parseFloat(getAttr('costBasisPrice') || '0')

    positions.push({
      symbol: getAttr('symbol'),
      description: getAttr('description'),
      conid: getAttr('conid'),
      isin: getAttr('isin') || null,
      quantity,
      price,
      costBasis,
      positionValue: quantity * price,
      unrealizedPnl: parseFloat(getAttr('fifoPnlUnrealized') || '0'),
      assetCategory: getAttr('assetCategory') || 'STK',
      currency: getAttr('currency') || 'USD',
      exchange: getAttr('listingExchange') || '',
    })
  }

  console.log(`📊 Parsed ${positions.length} positions`)
  return positions
}

// Parse cash balances from XML CashReport section
function parseCashBalances(xml: string): { EUR: number; USD: number } {
  const balances = { EUR: 0, USD: 0 }
  
  // Find all CashReportCurrency tags (one per currency)
  // Format: <CashReportCurrency currency="EUR" endingCash="1234.56" ... />
  const cashRegex = /<CashReportCurrency\s+([^>]+)\/>/g
  const matches = xml.matchAll(cashRegex)

  for (const match of matches) {
    const attributes = match[1]

    const getAttr = (name: string) => {
      const regex = new RegExp(`${name}="([^"]*)"`)
      const attrMatch = attributes.match(regex)
      return attrMatch ? attrMatch[1] : ''
    }

    const currency = getAttr('currency')
    const endingCash = parseFloat(getAttr('endingCash') || '0')

    if (currency === 'EUR') {
      balances.EUR = endingCash
    } else if (currency === 'USD') {
      balances.USD = endingCash
    }
  }

  // Also try CashReport tag (older format)
  // Format: <CashReport currency="EUR" endingCash="1234.56" ... />
  if (balances.EUR === 0 && balances.USD === 0) {
    const cashReportRegex = /<CashReport\s+([^>]+)\/>/g
    const cashReportMatches = xml.matchAll(cashReportRegex)

    for (const match of cashReportMatches) {
      const attributes = match[1]

      const getAttr = (name: string) => {
        const regex = new RegExp(`${name}="([^"]*)"`)
        const attrMatch = attributes.match(regex)
        return attrMatch ? attrMatch[1] : ''
      }

      const currency = getAttr('currency')
      const endingCash = parseFloat(getAttr('endingCash') || '0')

      if (currency === 'EUR') {
        balances.EUR = endingCash
      } else if (currency === 'USD') {
        balances.USD = endingCash
      }
    }
  }

  console.log(`💰 Parsed cash balances: EUR=${balances.EUR}, USD=${balances.USD}`)
  return balances
}
