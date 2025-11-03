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

    console.log(`🔄 Syncing IBKR for user: ${user.id}`)

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
    const positions = await fetchIBKRPositions(token, queryId)

    console.log(`📦 Got ${positions.length} positions from IBKR`)

    let created = 0
    let updated = 0

    // Process each position
    for (const pos of positions) {
      // Skip zero positions
      if (pos.quantity === 0) continue

      // Calculate P&L percentage
      const pnlPercent = pos.costBasis > 0
        ? ((pos.price - pos.costBasis) / pos.costBasis) * 100
        : 0

      // Check if exists
      const { data: existing } = await supabase
        .from('ibkr_positions')
        .select('id')
        .eq('user_id', user.id)
        .eq('conid', pos.conid)
        .maybeSingle()

      const positionData = {
        user_id: user.id,
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

      if (existing) {
        // Update
        await supabase
          .from('ibkr_positions')
          .update(positionData)
          .eq('id', existing.id)

        updated++
      } else {
        // Create
        await supabase
          .from('ibkr_positions')
          .insert(positionData)

        created++
      }
    }

    // Update last sync time in config
    await supabase
      .from('ibkr_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id)

    console.log(`✅ Done: ${created} created, ${updated} updated`)

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

// Fetch positions from IBKR Flex Web Service
async function fetchIBKRPositions(token: string, queryId: string) {
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
  // IBKR can take 1-2 minutes to generate statements
  for (let i = 0; i < 30; i++) {
    // Wait 5 seconds between attempts (except first one)
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
      return parsePositions(xml)
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
