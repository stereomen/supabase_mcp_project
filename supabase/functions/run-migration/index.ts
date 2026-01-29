import { corsHeaders } from '../_shared/cors.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Read migration SQL file
    const migrationSQL = await Deno.readTextFile('./apply_all_migrations.sql');

    // Get database connection URL from environment
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');

    if (!dbUrl) {
      // Construct DB URL from parts
      const projectRef = 'iwpgvdtfpwazzfeniusk';
      const dbPassword = Deno.env.get('DB_PASSWORD') || Deno.env.get('SUPABASE_DB_PASSWORD');

      if (!dbPassword) {
        return new Response(JSON.stringify({
          success: false,
          error: 'DB_PASSWORD environment variable not set',
          hint: 'This function needs direct database access. Please set DB_PASSWORD in Supabase Dashboard > Settings > Edge Functions > Secrets'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Execute migration using psql or pg client
    // Note: This requires the database password to be set as an environment variable

    return new Response(JSON.stringify({
      success: false,
      error: 'Migration execution requires database password',
      message: 'Please execute the SQL manually in Supabase SQL Editor',
      sql_file: 'apply_all_migrations.sql',
      instructions: [
        '1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/iwpgvdtfpwazzfeniusk/sql',
        '2. Copy contents from apply_all_migrations.sql',
        '3. Paste and run in SQL Editor'
      ]
    }), {
      status: 200,
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
