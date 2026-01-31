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

  let userId: string | null = null
  let supabase: any = null

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    userId = user.id

    console.log(`🔄 Syncing IBKR for user: ${user.id}`)

    // Check if this is the first sync (manual sync only allowed on first time)
    const { data: syncHistory } = await supabase
      .from('ibkr_sync_history')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (syncHistory && syncHistory.length > 0) {
      throw new Error(
        '🤖 La sincronización manual solo está disponible la primera vez. ' +
        'Tus posiciones se actualizan automáticamente cada día a las 5 AM vía cron job. ' +
        'Puedes ver el historial de sincronizaciones en los gráficos de evolución.'
      )
    }

    console.log('✅ Primera sincronización detectada, procediendo...')

    // Get IBKR config
    const { data: config, error: configError } = await supabase
      .from('ibkr_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config) {
      throw new Error('No IBKR config found. Please configure IBKR first.')
    }

    // Decrypt credentials
    console.log('🔓 Decrypting credentials...')
    const token = await decrypt(config.token)
    const queryId = await decrypt(config.query_id)
    console.log('✅ Credentials decrypted')

    // Fetch from IBKR
    console.log('📡 Fetching from IBKR...')
    const { positions, cashBalances } = await fetchIBKRData(token, queryId)

    console.log(`📦 Got ${positions.length} positions from IBKR`)
    console.log(`💰 Got cash balances: EUR=${cashBalances.EUR}, USD=${cashBalances.USD}`)

    let created = 0
    let updated = 0

    // Process each position - upsert to holdings table
    for (const pos of positions) {
      // Skip zero positions
      if (pos.quantity === 0) continue

      // Check if exists in holdings
      const { data: existing } = await supabase
        .from('holdings')
        .select('id')
        .eq('user_id', user.id)
        .eq('source', 'ibkr')
        .eq('external_id', pos.conid)
        .maybeSingle()

      const holdingData = {
        user_id: user.id,
        symbol: pos.symbol,
        isin: pos.isin,
        name: pos.description || pos.symbol,
        source: 'ibkr',
        asset_type: mapAssetCategory(pos.assetCategory),
        quantity: pos.quantity,
        cost_basis: pos.costBasis,
        current_price: pos.price,
        currency: pos.currency || 'USD',
        external_id: pos.conid,
        exchange: pos.exchange,
        last_price_update: new Date().toISOString(),
      }

      if (existing) {
        // Update
        const { error: updateError } = await supabase
          .from('holdings')
          .update(holdingData)
          .eq('id', existing.id)
        
        if (updateError) {
          console.error(`❌ Error updating holding ${pos.symbol}:`, updateError)
          throw updateError
        }
        updated++
      } else {
        // Create
        const { error: insertError } = await supabase
          .from('holdings')
          .insert(holdingData)
        
        if (insertError) {
          console.error(`❌ Error creating holding ${pos.symbol}:`, insertError)
          throw insertError
        }
        created++
      }
    }

    // Update cash balances
    if (cashBalances.EUR > 0) {
      const { error: cashError } = await supabase
        .from('cash_balances')
        .upsert({
          user_id: user.id,
          source: 'ibkr',
          currency: 'EUR',
          amount: cashBalances.EUR,
          last_sync_at: new Date().toISOString(),
        }, { onConflict: 'user_id,source,currency' })
      
      if (cashError) {
        console.error('❌ Error updating EUR cash:', cashError)
        throw cashError
      }
    }

    if (cashBalances.USD > 0) {
      const { error: cashError } = await supabase
        .from('cash_balances')
        .upsert({
          user_id: user.id,
          source: 'ibkr',
          currency: 'USD',
          amount: cashBalances.USD,
          last_sync_at: new Date().toISOString(),
        }, { onConflict: 'user_id,source,currency' })

      if (cashError) {
        console.error('❌ Error updating USD cash:', cashError)
        throw cashError
      }
    }

    // Calculate totals for history
    const totalValueUSD = positions.reduce((sum, pos) => sum + pos.positionValue, 0)
    const totalCostUSD = positions.reduce((sum, pos) => sum + (pos.quantity * pos.costBasis), 0)
    const totalPnlUSD = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0)

    // Update last sync time in config
    await supabase
      .from('ibkr_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id)

    // Save sync history
    await supabase
      .from('ibkr_sync_history')
      .insert({
        user_id: user.id,
        positions_count: positions.length,
        total_value_usd: totalValueUSD,
        total_cost_usd: totalCostUSD,
        total_pnl_usd: totalPnlUSD,
        total_cash_eur: cashBalances.EUR,
        total_cash_usd: cashBalances.USD,
        status: 'success',
      })

    console.log(`✅ Done: ${created} created, ${updated} updated`)
    console.log(`📊 History saved: $${totalValueUSD.toFixed(2)} value, ${positions.length} positions`)

    return new Response(
      JSON.stringify({
        success: true,
        created,
        updated,
        total: positions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error:', error)

    // Save error in history if we have userId
    if (userId && supabase) {
      try {
        await supabase
          .from('ibkr_sync_history')
          .insert({
            user_id: userId,
            positions_count: 0,
            total_value_usd: 0,
            total_cost_usd: 0,
            total_pnl_usd: 0,
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
      } catch (historyError) {
        console.error('Failed to save error history:', historyError)
      }
    }

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

// Map IBKR asset category to our asset_type
function mapAssetCategory(category: string): 'etf' | 'stock' | 'fund' | 'crypto' | 'bond' | 'other' {
  const cat = category?.toUpperCase() || ''
  if (cat === 'STK') return 'stock'
  if (cat === 'ETF') return 'etf'
  if (cat === 'BOND') return 'bond'
  if (cat === 'CRYPTO') return 'crypto'
  if (cat === 'FUND') return 'fund'
  return 'other'
}

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

  // Check for rate limiting in the initial request
  if (requestXml.includes('ErrorCode>1018<') || requestXml.includes('Too many requests')) {
    throw new Error('⏳ IBKR está limitando las peticiones. Por favor, espera 2-3 minutos antes de intentar sincronizar de nuevo.')
  }

  // Parse reference code with regex (simple and works in Edge Functions)
  const refCodeMatch = requestXml.match(/<ReferenceCode>([^<]+)<\/ReferenceCode>/)
  const refCode = refCodeMatch ? refCodeMatch[1] : null

  if (!refCode) {
    // Check if there's an error message
    const errorMatch = requestXml.match(/<ErrorMessage>([^<]+)<\/ErrorMessage>/)
    if (errorMatch) {
      throw new Error('IBKR error: ' + errorMatch[1])
    }
    console.error('Request XML:', requestXml)
    throw new Error('Failed to get reference code from IBKR')
  }

  console.log(`📋 Got reference code: ${refCode}`)

  // Step 2: Poll for statement (max 30 attempts = 2.5 minutes)
  for (let i = 0; i < 30; i++) {
    if (i > 0) {
      console.log(`⏳ Esperando 5 segundos antes del intento ${i + 1}/30...`)
      await new Promise((r) => setTimeout(r, 5000))
    }

    const statementUrl = `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.GetStatement?q=${refCode}&t=${token}&v=3`
    console.log(`📡 Intento ${i + 1}/30: Consultando statement...`)

    const statementRes = await fetch(statementUrl)
    const xml = await statementRes.text()

    console.log(`📄 Respuesta IBKR (primeros 200 chars): ${xml}`)

    // Success - statement is ready
    if (xml.includes('<FlexStatements')) {
      console.log('✅ Statement listo!')
      const positions = parsePositions(xml)
      const cashBalances = parseCashBalances(xml)
      return { positions, cashBalances }
    }

    // Check for rate limiting
    if (xml.includes('ErrorCode>1018<') || xml.includes('Too many requests')) {
      throw new Error('⏳ IBKR está limitando las peticiones. Por favor, espera 2-3 minutos antes de intentar sincronizar de nuevo.')
    }

    // Check for statement in progress (this is expected)
    if (xml.includes('Statement generation in progress') || xml.includes('Code>1019<')) {
      console.log(`⏳ Statement en progreso... (intento ${i + 1}/30)`)
      continue
    }

    // Check for other errors
    if (xml.includes('ErrorMessage') && !xml.includes('in progress')) {
      const errorMatch = xml.match(/<ErrorMessage>([^<]+)<\/ErrorMessage>/)
      const errorMsg = errorMatch ? errorMatch[1] : xml.substring(0, 200)
      throw new Error('IBKR error: ' + errorMsg)
    }
  }

  throw new Error('⏰ Timeout: IBKR tardó más de 2.5 minutos en generar el statement. Esto puede pasar con cuentas grandes. Por favor, intenta de nuevo en unos minutos.')
}

// Parse positions from XML using regex (works in Edge Functions)
function parsePositions(xml: string) {
  const positions = []

  // Find all OpenPosition tags
  const positionRegex = /<OpenPosition\s+([^>]+)\/>/g
  const matches = xml.matchAll(positionRegex)

  for (const match of matches) {
    const attributes = match[1]

    // Extract attributes using regex
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
