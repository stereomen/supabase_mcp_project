import { corsHeaders } from '../_shared/cors.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const results = [];

    // Step 1: Check if password column exists and add default passwords
    try {
      // Get all partners
      const { data: partners, error: fetchError } = await supabase
        .from('ad_partners')
        .select('partner_id, password');

      if (fetchError) {
        // Password column might not exist yet
        if (fetchError.message.includes('column') && fetchError.message.includes('does not exist')) {
          results.push({
            step: '1. Password column',
            status: 'needs_manual_migration',
            message: 'Please run SQL manually: ALTER TABLE ad_partners ADD COLUMN password TEXT;'
          });
        } else {
          throw fetchError;
        }
      } else {
        results.push({ step: '1. Password column', status: 'exists' });

        // Step 2: Set default passwords for partners without password
        const partnersWithoutPassword = partners?.filter(p => !p.password) || [];

        if (partnersWithoutPassword.length > 0) {
          let updatedCount = 0;
          for (const partner of partnersWithoutPassword) {
            const { error: updateError } = await supabase
              .from('ad_partners')
              .update({ password: partner.partner_id })
              .eq('partner_id', partner.partner_id);

            if (!updateError) updatedCount++;
          }
          results.push({
            step: '2. Set default passwords',
            status: 'success',
            rowsUpdated: updatedCount
          });
        } else {
          results.push({
            step: '2. Set default passwords',
            status: 'skipped',
            message: 'All partners already have passwords'
          });
        }
      }
    } catch (e: any) {
      results.push({ step: '1-2. Password setup', status: 'error', error: e.message });
    }

    // Step 3: Check if password_history table exists
    try {
      const { data, error } = await supabase
        .from('ad_partner_password_history')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          results.push({
            step: '3. Password history table',
            status: 'needs_manual_migration',
            message: 'Please run the CREATE TABLE SQL manually from the migration file'
          });
        } else {
          throw error;
        }
      } else {
        results.push({ step: '3. Password history table', status: 'exists' });
      }
    } catch (e: any) {
      results.push({ step: '3. Password history check', status: 'error', error: e.message });
    }

    return new Response(JSON.stringify({
      success: true,
      message: '✅ Password migration completed',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
