// supabase/functions/analyze-data/index.ts
// 최종 수정 버전: 별도의 'analysis_results' 테이블에 분석 결과를 저장하여 안정성을 확보합니다.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
console.log("analyze-data function script started!");
// 이 RPC 함수는 데이터베이스에 이미 존재해야 합니다.
// (이전 단계에서 생성했으므로, 그대로 사용합니다)
async function getLocationsForData(supabase, column) {
  const { data, error } = await supabase.rpc('get_locations_for_column', {
    column_name: column
  });
  if (error) {
    console.error(`'${column}' 컬럼에 대한 위치 정보 조회 중 오류 발생 (RPC 호출):`, error);
    throw new Error(`'${column}'에 대한 데이터 조회에 실패했습니다.`);
  }
  return data || [];
}
Deno.serve(async (_req)=>{
  if (_req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      global: {
        headers: {
          Authorization: `Bearer ${Deno.env.get('SERVICE_ROLE_KEY')}`
        }
      }
    });
    console.log("모든 카테고리에 대한 데이터 조회를 시작합니다...");
    const [windDirectionLocations, waterTemperatureLocations, waveHeightLocations] = await Promise.all([
      getLocationsForData(supabaseClient, 'wind_direction'),
      getLocationsForData(supabaseClient, 'water_temperature'),
      getLocationsForData(supabaseClient, 'significant_wave_height')
    ]);
    // 1. 기존 분석 결과를 모두 삭제하여 항상 최신 상태를 유지합니다.
    console.log("기존 분석 결과 삭제 중...");
    const { error: deleteError } = await supabaseClient.from('analysis_results').delete().neq('id', -1); // 모든 행을 삭제하는 구문
    if (deleteError) {
      console.error("기존 분석 결과 삭제 실패:", deleteError);
      throw new Error("Failed to clear previous analysis results.");
    }
    // 2. 새로 삽입할 데이터를 준비합니다.
    const rowsToInsert = [];
    windDirectionLocations.forEach((loc)=>{
      rowsToInsert.push({
        category: 'wind_direction_locations',
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude
      });
    });
    waterTemperatureLocations.forEach((loc)=>{
      rowsToInsert.push({
        category: 'water_temperature_locations',
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude
      });
    });
    waveHeightLocations.forEach((loc)=>{
      rowsToInsert.push({
        category: 'wave_height_locations',
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude
      });
    });
    // 3. 새로운 분석 결과를 'analysis_results' 테이블에 저장합니다.
    if (rowsToInsert.length > 0) {
      console.log(`${rowsToInsert.length}개의 새로운 분석 결과를 저장합니다...`);
      const { error: insertError } = await supabaseClient.from('analysis_results').insert(rowsToInsert);
      if (insertError) {
        console.error("새로운 분석 결과 저장 실패:", insertError);
        throw new Error("Failed to save new analysis results.");
      }
    } else {
      console.log("저장할 새로운 분석 결과가 없습니다.");
    }
    const responsePayload = {
      message: "분석이 성공적으로 완료되었습니다. 'analysis_results' 테이블에서 결과를 확인하세요.",
      timestamp: new Date().toISOString(),
      inserted_rows: rowsToInsert.length
    };
    console.log("분석 완료. 성공 메시지��� 전송합니다.");
    return new Response(JSON.stringify(responsePayload), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error("예기치 않은 오류가 발생했습니다:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
