import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Símbolos de los índices para Yahoo Finance
const BENCHMARKS = {
  SP500: '^GSPC',    // S&P 500 Index (el índice real)
  MSCI_WORLD: 'URTH' // iShares MSCI World ETF (MSCI World no tiene símbolo directo)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🌍 Starting benchmark fetch from Yahoo Finance...')

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results = []

    // Fetch each benchmark
    for (const [name, symbol] of Object.entries(BENCHMARKS)) {
      try {
        console.log(`\n📊 Fetching ${name} (${symbol})...`)

        // Fetch from Yahoo Finance (last 5 days to ensure we have recent data)
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`
        console.log(`🔗 URL: ${url}`)

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Yahoo Finance HTTP error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // Validate response structure
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
          console.error('❌ Invalid Yahoo Finance response structure')
          console.error('Response:', JSON.stringify(data).substring(0, 500))
          throw new Error('Invalid response from Yahoo Finance')
        }

        if (data.chart.error) {
          throw new Error(`Yahoo Finance error: ${data.chart.error.description}`)
        }

        const result = data.chart.result[0]
        const timestamps = result.timestamp
        const quotes = result.indicators.quote[0]
        const closePrices = quotes.close

        if (!timestamps || !closePrices || timestamps.length === 0) {
          throw new Error('No price data available')
        }

        // Get the last two valid close prices (skip nulls)
        const validPrices = closePrices
          .map((price: number | null, index: number) => ({
            price,
            timestamp: timestamps[index],
          }))
          .filter((item: any) => item.price !== null)
          .reverse() // Most recent first

        if (validPrices.length < 2) {
          throw new Error('Insufficient price data for change calculation')
        }

        const latestPrice = validPrices[0].price
        const previousPrice = validPrices[1].price
        const latestTimestamp = validPrices[0].timestamp

        // Convert Unix timestamp to date (YYYY-MM-DD)
        const latestDate = new Date(latestTimestamp * 1000).toISOString().split('T')[0]

        const changePercent = ((latestPrice - previousPrice) / previousPrice) * 100

        console.log(`✅ ${name}: $${latestPrice.toFixed(2)} on ${latestDate} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`)

        // Save to database (upsert)
        const { error: upsertError } = await supabase
          .from('benchmark_history')
          .upsert(
            {
              benchmark_name: name,
              date: latestDate,
              close_value: latestPrice,
              change_percent: changePercent,
            },
            {
              onConflict: 'benchmark_name,date',
            }
          )

        if (upsertError) {
          throw new Error(`DB error for ${name}: ${upsertError.message}`)
        }

        results.push({
          benchmark: name,
          symbol,
          date: latestDate,
          value: latestPrice,
          change: changePercent,
          status: 'success',
        })

        // Small delay to be polite (Yahoo Finance has no rate limit, but good practice)
        if (name !== 'MSCI_WORLD') {
          console.log('⏳ Waiting 1 second...')
          await new Promise(r => setTimeout(r, 1000))
        }

      } catch (benchmarkError) {
        const errorMessage = benchmarkError instanceof Error ? benchmarkError.message : 'Unknown error'
        console.error(`❌ Failed to fetch ${name}:`, errorMessage)

        results.push({
          benchmark: name,
          symbol,
          status: 'error',
          error: errorMessage,
        })
      }
    }

    console.log(`\n📊 Benchmark fetch completed: ${results.filter(r => r.status === 'success').length}/${results.length} successful`)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Benchmark fetch error:', error)
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
