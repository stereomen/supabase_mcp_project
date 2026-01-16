// supabase/functions/abs-fetch-log/index.ts
// KMA API 호출 시 지점별 데이터 가용성을 추적하는 함수
// 매시간 크론잡으로 실행되어 각 관측소의 데이터 수집 현황을 기록

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- 상수 정의 ---
const KMA_API_ENDPOINT = 'https://apihub.kma.go.kr/api/typ01/url/sea_obs.php';
const KMA_AUTH_KEY = Deno.env.get('KMA_API_KEY') || 'xNM8m0T_SZyTPJtE__mcsQ';

/**
 * KMA API 요청에 필요한 시간 문자열(YYYYMMDDHHMI)을 생성합니다.
 * **KST(한국 표준시)를 기준으로** 가장 가까운 이전 정시 또는 30분 데이터를 요청합니다.
 * @returns {string} 포맷된 시간 문자열
 */
function getKmaRequestTime() {
  const now = new Date();
  // Explicitly convert current time to KST
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  // Use UTC methods on the KST-adjusted date to avoid server timezone interference
  const year = kstNow.getUTCFullYear();
  const month = (kstNow.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = kstNow.getUTCDate().toString().padStart(2, '0');
  const hours = kstNow.getUTCHours();
  const minutes = kstNow.getUTCMinutes();

  // Round down to nearest 00 or 30 minute
  let requestMinutes = '00';
  if (minutes >= 30) {
    requestMinutes = '30';
  }

  const requestHours = hours.toString().padStart(2, '0');
  return `${year}${month}${day}${requestHours}${requestMinutes}`;
}

/**
 * 값이 유효한지 확인합니다 (null이 아니고 invalid 값이 아닌지)
 * @param {any} value - 확인할 값
 * @param {string[]} invalidValues - 무효한 값으로 간주할 문자열 배열
 * @returns {boolean} 값이 유효하면 true
 */
function isValidValue(value: any, invalidValues = ['-99.0', '-99', '']): boolean {
  if (value === undefined || value === null) return false;

  const trimmedValue = String(value).trim();
  if (invalidValues.includes(trimmedValue) || trimmedValue === '') {
    return false;
  }

  const number = parseFloat(trimmedValue);
  return !isNaN(number);
}

/**
 * 문자열을 부동소수점 숫자로 파싱합니다. 유효하지 않은 값이면 null을 반환합니다.
 */
function parseFloatOrNull(value: any, invalidValues = ['-99.0', '-99', '']) {
  if (value === undefined || value === null) return null;

  const trimmedValue = String(value).trim();
  if (invalidValues.includes(trimmedValue) || trimmedValue === '') {
    return null;
  }

  const number = parseFloat(trimmedValue);
  return isNaN(number) ? null : number;
}

// --- 메인 함수 ---
Deno.serve(async (req) => {
  console.log('abs-fetch-log function invoked.');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 간단한 보안: 크론 토큰 확인 (선택적)
  const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'abs-fetch-log-secret-2026';
  const cronToken = req.headers.get('x-cron-secret');

  // 크론 토큰이 제공된 경우에만 검증 (없으면 통과)
  if (cronToken && cronToken !== CRON_SECRET) {
    console.error('[ERROR] Invalid cron secret');
    return new Response(
      JSON.stringify({ error: 'Invalid cron secret' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const requestTime = new Date(); // 현재 요청 시간 (UTC)
  const kmaRequestTimeStr = getKmaRequestTime(); // KMA API에 요청할 시간 문자열

  try {
    // Step 1: 최근 24시간 내 나타난 모든 unique 관측소 목록 조회
    console.log('[LOG] Fetching expected station list from recent logs...');
    const { data: recentStations, error: stationError } = await supabaseClient
      .from('abs_fetch_log')
      .select('station_id, station_name, observation_type, latitude, longitude')
      .gte('request_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('request_time', { ascending: false });

    if (stationError) {
      console.error('[ERROR] Failed to fetch recent stations:', stationError);
    }

    // Create expected stations map: key = "stationId_obsType"
    const expectedStationsMap = new Map();
    if (recentStations && recentStations.length > 0) {
      recentStations.forEach(s => {
        const key = `${s.station_id}_${s.observation_type}`;
        if (!expectedStationsMap.has(key)) {
          expectedStationsMap.set(key, {
            station_id: s.station_id,
            station_name: s.station_name,
            observation_type: s.observation_type,
            latitude: s.latitude,
            longitude: s.longitude
          });
        }
      });
    }

    console.log(`[LOG] Found ${expectedStationsMap.size} expected stations from recent logs.`);

    // Step 2: KMA API 호출
    const apiUrl = `${KMA_API_ENDPOINT}?tm=${kmaRequestTimeStr}&stn=0&help=0&authKey=${KMA_AUTH_KEY}`;
    console.log(`[LOG] Calling KMA API: ${apiUrl}`);

    const kmaResponse = await fetch(apiUrl);
    console.log(`[LOG] KMA API response status: ${kmaResponse.status}`);

    if (!kmaResponse.ok) {
      throw new Error(`KMA API request failed: ${kmaResponse.status} ${kmaResponse.statusText}`);
    }

    // Parse EUC-KR encoded response
    const buffer = await kmaResponse.arrayBuffer();
    const decoder = new TextDecoder('euc-kr');
    const rawData = decoder.decode(buffer);

    console.log(`[LOG] Raw data received from KMA (first 500 chars): ${rawData.substring(0, 500)}`);

    // Parse CSV lines (skip comments and empty lines)
    const lines = rawData
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes(','));

    console.log(`[LOG] Found ${lines.length} data lines from API response.`);

    // Step 3: API 응답에 있는 관측소 파싱
    const apiStationsMap = new Map(); // key = "stationId_obsType"
    const logsToInsert = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());

      if (parts.length < 14) {
        console.warn(`[LOG] Skipping malformed line: ${line}`);
        continue;
      }

      // Parse CSV fields
      // Format: obsType, tm, stnIdStr, stnKo, lonStr, latStr, wh, wd, ws, wsGst, tw, ta, pa, hm
      const [
        obsType,      // observation_type
        tm,           // observation_time_kst
        stnIdStr,     // station_id
        stnKo,        // station_name
        lonStr,       // longitude
        latStr,       // latitude
        wh,           // significant_wave_height
        wd,           // wind_direction
        ws,           // wind_speed
        wsGst,        // gust_wind_speed
        tw,           // water_temperature
        ta,           // air_temperature
        pa,           // pressure
        hm            // humidity
      ] = parts;

      const stationId = parseInt(stnIdStr, 10);
      if (isNaN(stationId)) {
        console.warn(`[LOG] Skipping line with invalid station ID: ${line}`);
        continue;
      }

      const key = `${stationId}_${obsType}`;

      // Check data availability for each field
      const logEntry = {
        request_time: requestTime.toISOString(),
        observation_time_kst: tm,
        station_id: stationId,
        station_name: stnKo,
        observation_type: obsType,
        longitude: parseFloatOrNull(lonStr),
        latitude: parseFloatOrNull(latStr),

        // Data availability flags
        significant_wave_height_available: isValidValue(wh),
        wind_direction_available: isValidValue(wd),
        wind_speed_available: isValidValue(ws),
        gust_wind_speed_available: isValidValue(wsGst),
        water_temperature_available: isValidValue(tw),
        air_temperature_available: isValidValue(ta),
        pressure_available: isValidValue(pa),
        humidity_available: isValidValue(hm),

        raw_line: line // Store original line for debugging
      };

      logsToInsert.push(logEntry);
      apiStationsMap.set(key, true); // Mark this station as received from API

      // Update expected stations map with latest info
      if (!expectedStationsMap.has(key)) {
        expectedStationsMap.set(key, {
          station_id: stationId,
          station_name: stnKo,
          observation_type: obsType,
          latitude: parseFloatOrNull(latStr),
          longitude: parseFloatOrNull(lonStr)
        });
      }
    }

    // Step 4: 예상했지만 API 응답에 없는 관측소를 "데이터 없음"으로 기록
    const missingStations = [];
    for (const [key, stationInfo] of expectedStationsMap) {
      if (!apiStationsMap.has(key)) {
        missingStations.push({
          request_time: requestTime.toISOString(),
          observation_time_kst: kmaRequestTimeStr,
          station_id: stationInfo.station_id,
          station_name: stationInfo.station_name,
          observation_type: stationInfo.observation_type,
          longitude: stationInfo.longitude,
          latitude: stationInfo.latitude,

          // All data flags are false (no data available)
          significant_wave_height_available: false,
          wind_direction_available: false,
          wind_speed_available: false,
          gust_wind_speed_available: false,
          water_temperature_available: false,
          air_temperature_available: false,
          pressure_available: false,
          humidity_available: false,

          raw_line: `[MISSING] Station ${stationInfo.station_id} (${stationInfo.observation_type}) not in API response`
        });
      }
    }

    if (missingStations.length > 0) {
      console.log(`[LOG] Found ${missingStations.length} missing stations. Adding as "no data" entries.`);
      logsToInsert.push(...missingStations);
    }

    console.log(`[LOG] Prepared ${logsToInsert.length} log entries for database insertion.`);

    if (logsToInsert.length > 0) {
      console.log(`[LOG] Inserting ${logsToInsert.length} records to 'abs_fetch_log'...`);

      const { error: insertError, count } = await supabaseClient
        .from('abs_fetch_log')
        .upsert(logsToInsert, {
          onConflict: 'station_id,observation_time_kst,request_time',
          count: 'exact'
        });

      if (insertError) {
        throw new Error(`Failed to insert logs: ${insertError.message}`);
      }

      console.log(`[LOG] Successfully inserted ${count} log records.`);

      return new Response(
        JSON.stringify({
          message: `Successfully logged data availability for ${count} stations.`,
          records_logged: count,
          stations_from_api: lines.length,
          missing_stations_added: missingStations.length,
          expected_stations: expectedStationsMap.size,
          request_time: requestTime.toISOString(),
          observation_time_kst: kmaRequestTimeStr
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      console.log('[LOG] No valid log entries to insert.');
      return new Response(
        JSON.stringify({ message: 'No valid log entries to insert', records_logged: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
  } catch (error) {
    console.error('[CRITICAL] Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
