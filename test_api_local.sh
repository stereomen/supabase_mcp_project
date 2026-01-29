#!/bin/bash
# Local API test script for AD_0001

source .env

echo "=== Testing AD_0001 with local Supabase client ==="

cat > /tmp/test_ad_0001.js << 'EOF'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Check tide_abs_region
const { data, error } = await supabase
  .from('tide_abs_region')
  .select('"Code", "a_STN ID", "b_STN ID"')
  .eq('Code', 'AD_0001')
  .single();

console.log('=== tide_abs_region 조회 결과 ===');
console.log('Error:', error);
console.log('Data:', JSON.stringify(data, null, 2));

if (data) {
  const stationIdA = data['a_STN ID'];
  const stationIdB = data['b_STN ID'];

  console.log('\n=== Station IDs ===');
  console.log('a_STN ID:', stationIdA);
  console.log('b_STN ID:', stationIdB);

  // Check marine_observations for station A
  if (stationIdA) {
    const { data: obsData } = await supabase
      .from('marine_observations')
      .select('station_id, observation_time_kst, water_temperature, significant_wave_height')
      .eq('station_id', stationIdA)
      .like('observation_time_kst', '20260118%')
      .order('observation_time_kst', { ascending: true })
      .limit(3);

    console.log('\n=== Marine Observations for A ===');
    console.log('Count:', obsData?.length || 0);
    if (obsData && obsData.length > 0) {
      console.log('First item:', JSON.stringify(obsData[0], null, 2));
    }
  }
}
EOF

deno run --allow-net --allow-env /tmp/test_ad_0001.js
