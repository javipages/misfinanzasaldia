import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encrypt } from '../_shared/crypto.ts'

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

    // Get request body
    const { api_key, api_secret } = await req.json()

    if (!api_key || !api_secret) {
      throw new Error('API Key and API Secret are required')
    }

    console.log(`🔐 Encrypting Binance credentials for user: ${user.id}`)

    // Encrypt the sensitive data
    const encryptedApiKey = await encrypt(api_key)
    const encryptedApiSecret = await encrypt(api_secret)

    console.log('✅ Credentials encrypted')

    // Save to database
    const { error } = await supabase
      .from('binance_config')
      .upsert({
        user_id: user.id,
        api_key: encryptedApiKey,
        api_secret: encryptedApiSecret,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    console.log('✅ Binance config saved to database')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Binance configuration saved successfully',
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
