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
    const { token, query_id } = await req.json()

    if (!token || !query_id) {
      throw new Error('Token and query_id are required')
    }

    console.log(`🔐 Encrypting credentials for user: ${user.id}`)

    // Encrypt the sensitive data
    const encryptedToken = await encrypt(token)
    const encryptedQueryId = await encrypt(query_id)

    console.log('✅ Credentials encrypted')

    // Save to database
    const { error } = await supabase
      .from('ibkr_config')
      .upsert({
        user_id: user.id,
        token: encryptedToken,
        query_id: encryptedQueryId,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    console.log('✅ Config saved to database')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Configuration saved successfully',
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
