import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('지역 코드 중복 분석 시작...');

    // 1. 각 예보 유형별 고유 지역 코드 개수
    const { data: typeCounts } = await supabase
      .from('medium_term_forecasts')
      .select('forecast_type, reg_id')
      .in('forecast_type', ['land', 'temperature', 'marine']);

    // 각 예보 유형별 고유 지역 통계
    const stats = {};
    typeCounts?.forEach(row => {
      if (!stats[row.forecast_type]) {
        stats[row.forecast_type] = new Set();
      }
      stats[row.forecast_type].add(row.reg_id);
    });

    const typeStats = Object.entries(stats).map(([type, regIds]) => ({
      forecast_type: type,
      unique_regions: regIds.size,
      total_records: typeCounts?.filter(r => r.forecast_type === type).length || 0
    }));

    console.log('예보 유형별 통계:', typeStats);

    // 2. 각 예보 유형별 지역 코드 샘플
    const samples = {};
    for (const type of ['temperature', 'land', 'marine']) {
      const { data } = await supabase
        .from('medium_term_forecasts')
        .select('reg_id, reg_name')
        .eq('forecast_type', type)
        .limit(10);
      
      // 중복 제거
      const uniqueRegions = [];
      const seen = new Set();
      data?.forEach(row => {
        if (!seen.has(row.reg_id)) {
          seen.add(row.reg_id);
          uniqueRegions.push(row);
        }
      });
      
      samples[type] = uniqueRegions.slice(0, 10);
    }

    // 3. 중복 지역 확인
    const tempRegions = new Set(samples.temperature?.map(r => r.reg_id) || []);
    const landRegions = new Set(samples.land?.map(r => r.reg_id) || []);
    const marineRegions = new Set(samples.marine?.map(r => r.reg_id) || []);

    // 전체 데이터에서 중복 확인
    const allTempRegions = new Set(stats.temperature || []);
    const allLandRegions = new Set(stats.land || []);
    const allMarineRegions = new Set(stats.marine || []);

    const overlaps = {
      temperature_land: [...allTempRegions].filter(id => allLandRegions.has(id)),
      temperature_marine: [...allTempRegions].filter(id => allMarineRegions.has(id)),
      land_marine: [...allLandRegions].filter(id => allMarineRegions.has(id)),
      all_three: [...allTempRegions].filter(id => allLandRegions.has(id) && allMarineRegions.has(id))
    };

    // 4. 지역 코드 패턴 분석
    const patterns = {};
    Object.entries(stats).forEach(([type, regIds]) => {
      patterns[type] = {};
      [...regIds].forEach(regId => {
        const prefix = regId.substring(0, 2);
        if (!patterns[type][prefix]) {
          patterns[type][prefix] = [];
        }
        patterns[type][prefix].push(regId);
      });
    });

    const result = {
      summary: {
        temperature_regions: allTempRegions.size,
        land_regions: allLandRegions.size,
        marine_regions: allMarineRegions.size
      },
      type_stats: typeStats,
      samples: samples,
      overlaps: {
        temperature_land_count: overlaps.temperature_land.length,
        temperature_land_regions: overlaps.temperature_land.slice(0, 5), // 처음 5개만
        temperature_marine_count: overlaps.temperature_marine.length,
        temperature_marine_regions: overlaps.temperature_marine.slice(0, 5),
        land_marine_count: overlaps.land_marine.length,
        land_marine_regions: overlaps.land_marine.slice(0, 5),
        all_three_count: overlaps.all_three.length,
        all_three_regions: overlaps.all_three
      },
      patterns: Object.entries(patterns).map(([type, typePatterns]) => ({
        forecast_type: type,
        patterns: Object.entries(typePatterns).map(([prefix, codes]) => ({
          prefix,
          count: codes.length,
          first_code: codes[0],
          last_code: codes[codes.length - 1]
        }))
      }))
    };

    console.log('분석 결과:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('오류 발생:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});