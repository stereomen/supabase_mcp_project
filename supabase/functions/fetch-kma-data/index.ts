// supabase/functions/fetch-kma-data/index.ts
// *** 최종 수정: KST 시간대 문제를 해결한 최종 버전 ***
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// --- 상수 정의 ---
const KMA_API_ENDPOINT = 'https://apihub.kma.go.kr/api/typ01/url/sea_obs.php';
const KMA_AUTH_KEY = Deno.env.get('KMA_API_KEY') || 'xNM8m0T_SZyTPJtE__mcsQ';
/**
 * KMA API 요청에 필요한 시간 문자열(YYYYMMDDHHMI)을 생성합니다.
 * **KST(한국 표준시)를 기준으로** 가장 가까운 이전 정시 또는 30분 데이터를 요청합니다.
 * @returns {string} 포맷된 시간 문자열
 */ function getKmaRequestTime() {
  const now = new Date();
  // THE FIX: Explicitly convert current time to KST before extracting parts.
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  // Use UTC methods on the KST-adjusted date to avoid server timezone interference
  const year = kstNow.getUTCFullYear();
  const month = (kstNow.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = kstNow.getUTCDate().toString().padStart(2, '0');
  const hours = kstNow.getUTCHours();
  const minutes = kstNow.getUTCMinutes();
  let requestMinutes = '00';
  if (minutes >= 30) {
    requestMinutes = '30';
  }
  const requestHours = hours.toString().padStart(2, '0');
  return `${year}${month}${day}${requestHours}${requestMinutes}`;
}
/**
 * 문자열을 부동소수점 숫자로 파싱합니다. 유효하지 않은 값이면 null을 반환합니다.
 */ function parseFloatOrNull(value, invalidValues = [
  '-99.0',
  '-99',
  ''
]) {
  if (value === undefined || value === null) return null;
  const trimmedValue = value.trim();
  if (invalidValues.includes(trimmedValue) || trimmedValue === '') {
    return null;
  }
  const number = parseFloat(trimmedValue);
  return isNaN(number) ? null : number;
}
/**
 * KST 시간 문자열을 UTC Date 객체로 변환합니다.
 * @param {string} kstTime - KST 시간 문자열 (YYYYMMDDHHMI 형식, 예: "202512040600")
 * @returns {Date|null} UTC Date 객체 (KST - 9시간)
 */ function convertKstToUtc(kstTime) {
  if (!kstTime || kstTime.length !== 12) return null;
  try {
    const year = parseInt(kstTime.substring(0, 4), 10);
    const month = parseInt(kstTime.substring(4, 6), 10) - 1;  // 0-based month
    const day = parseInt(kstTime.substring(6, 8), 10);
    const hour = parseInt(kstTime.substring(8, 10), 10);
    const minute = parseInt(kstTime.substring(10, 12), 10);

    // KST 시간 값을 UTC timestamp로 생성 후 9시간(KST offset)을 빼서 실제 UTC로 변환
    const kstTimestamp = Date.UTC(year, month, day, hour, minute);
    const utcTimestamp = kstTimestamp - 9 * 60 * 60 * 1000;
    return new Date(utcTimestamp);
  } catch (e) {
    console.error(`Failed to parse KST time: ${kstTime}`, e);
    return null;
  }
}
// --- 메인 함수 ---
Deno.serve(async (req)=>{
  console.log('fetch-kma-data function invoked.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const collectionTime = new Date();
  const requestTime = getKmaRequestTime();
  let recordsCollected = 0;
  let errorMessage = null;
  let status = 'success';
  try {
    const apiUrl = `${KMA_API_ENDPOINT}?tm=${requestTime}&stn=0&help=0&authKey=${KMA_AUTH_KEY}`;
    console.log(`[LOG] Calling KMA API: ${apiUrl}`);
    const kmaResponse = await fetch(apiUrl);
    console.log(`[LOG] KMA API response status: ${kmaResponse.status}`);
    if (!kmaResponse.ok) {
      throw new Error(`KMA API request failed: ${kmaResponse.status} ${kmaResponse.statusText}`);
    }
    const buffer = await kmaResponse.arrayBuffer();
    const decoder = new TextDecoder('euc-kr');
    const rawData = decoder.decode(buffer);
    console.log(`[LOG] Raw data received from KMA (first 500 chars): ${rawData.substring(0, 500)}`);
    const lines = rawData.split('\n').map((line)=>line.trim()).filter((line)=>line && !line.startsWith('#') && line.includes(','));
    console.log(`[LOG] Found ${lines.length} data lines to process.`);
    if (lines.length === 0) {
      console.warn('[LOG] No data lines found in the API response.');
      status = 'no_data';
    }
    const observationsToInsert = [];
    for (const line of lines){
      const parts = line.split(',').map((p)=>p.trim());
      if (parts.length < 14) {
        console.warn(`[LOG] Skipping malformed line: ${line}`);
        continue;
      }
      const [obsType, tm, stnIdStr, stnKo, lonStr, latStr, wh, wd, ws, wsGst, tw, ta, pa, hm] = parts;
      const stationId = parseInt(stnIdStr, 10);
      if (isNaN(stationId)) {
        console.warn(`[LOG] Skipping line with invalid station ID: ${line}`);
        continue;
      }
      const utcDate = convertKstToUtc(tm);
      const dataToInsert = {
        observation_type: obsType,
        station_id: stationId,
        station_name: stnKo,
        observation_time_kst: tm,
        observation_time_utc: utcDate ? utcDate.toISOString() : null,
        longitude: parseFloatOrNull(lonStr),
        latitude: parseFloatOrNull(latStr),
        significant_wave_height: parseFloatOrNull(wh),
        wind_direction: parseFloatOrNull(wd),
        wind_speed: parseFloatOrNull(ws),
        gust_wind_speed: parseFloatOrNull(wsGst),
        water_temperature: parseFloatOrNull(tw),
        air_temperature: parseFloatOrNull(ta),
        pressure: parseFloatOrNull(pa),
        humidity: parseFloatOrNull(hm)
      };
      const hasValues = Object.values(dataToInsert).slice(7).some((v)=>v !== null);
      if (hasValues) {
        observationsToInsert.push(dataToInsert);
        
      } else {
        console.log(`[LOG] Skipping data for station ${stationId} because it has no valid measurement values.`);
      }
    }
    console.log(`[LOG] Prepared ${observationsToInsert.length} records for database insertion.`);
    if (observationsToInsert.length > 0) {
      console.log(`[LOG] Upserting ${observationsToInsert.length} records to 'marine_observations'...`);
      const { error: upsertObsError, count } = await supabaseClient.from('marine_observations').upsert(observationsToInsert, {
        onConflict: 'station_id,observation_time_kst',
        count: 'exact'
      });
      if (upsertObsError) {
        throw new Error(`Failed to upsert observations: ${upsertObsError.message}`);
      }
      recordsCollected = count ?? 0;
      console.log(`[LOG] Successfully upserted ${recordsCollected} records.`);
    } else {
      console.log('[LOG] No valid records to insert.');
    }
    return new Response(JSON.stringify({
      message: `Successfully collected ${recordsCollected} observations.`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('[CRITICAL] Function error:', error);
    status = 'error';
    errorMessage = error.message;
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  } finally{
    try {
      const targetTimeDate = convertKstToUtc(requestTime);
      const logPayload = {
        collection_time: collectionTime.toISOString(),
        target_time: targetTimeDate ? targetTimeDate.toISOString() : null,
        status: status,
        records_collected: recordsCollected,
        error_message: errorMessage,
        function_name: 'fetch-kma-data'
      };
      console.log('[LOG] Writing to data_collection_logs:', logPayload);
      const { error: logError } = await supabaseClient.from('data_collection_logs').insert(logPayload);
      if (logError) {
        console.error('[CRITICAL] Failed to write to data_collection_logs:', logError);
      }
    } catch (logErr) {
      console.error('[CRITICAL] Error during final logging:', logErr);
    }
  }
});