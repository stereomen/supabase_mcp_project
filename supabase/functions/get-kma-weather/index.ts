// 4. 동네예보(초단기실황·초단기예보·단기예보) 조회
//기준 시간 설정 (base_date, base_time):
//- 발표 시간: 매일 02, 05, 08, 11, 14, 17, 20, 23시 (총 8회)
//- 현재 시간(KST) 기준으로 가장 최근 발표된 시간을 선택
//- 예: 현재 15시면 → 14시 발표 데이터 사용
//- 예: 현재 01시면 → 전날 23시 발표 데이터 사용
//예측 날짜 범위:
//- 기준 시간부터 3일 후까지 예보 데이터 수집
//- 기상청 API에서 최대 1000개 레코드 요청 (numOfRows: '1000')
//수집 관측소:
//- tide_weather_region 테이블의 모든 관측소 (178개)
//- 고유한 격자 좌표(nx, ny)별로 API 호출하여 중복 요청 최소화
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// --- 상수 및 설정 ---
const KMA_API_URL = 'https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst';
const KMA_AUTH_KEY = Deno.env.get('KMA_AUTH_KEY') || 'L7BLiqT7RsiwS4qk-8bIhQ';
const PUBLISH_TIMES = [
  2,
  5,
  8,
  11,
  14,
  17,
  20,
  23
];
// --- 헬퍼 함수 ---
function delay(ms) {
  return new Promise((resolve)=>setTimeout(resolve, ms));
}
function getLatestBaseDateTime() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const currentHourKST = kstNow.getUTCHours();
  let baseHour = '';
  let baseDate = new Date(kstNow.getTime());
  const latestPublishHour = PUBLISH_TIMES.slice().reverse().find((hour)=>hour <= currentHourKST);
  if (latestPublishHour !== undefined) {
    baseHour = latestPublishHour.toString().padStart(2, '0') + '00';
  } else {
    baseHour = '2300';
    baseDate.setUTCDate(baseDate.getUTCDate() - 1);
  }
  const baseDateStr = baseDate.getUTCFullYear().toString() + (baseDate.getUTCMonth() + 1).toString().padStart(2, '0') + baseDate.getUTCDate().toString().padStart(2, '0');
  return {
    baseDate: baseDateStr,
    baseTime: baseHour
  };
}
// --- 핵심 작업 함수 ---
// 178개 관측소의 고유 격자 좌표를 배치 단위로 처리
async function doWeatherFetch(startIndex = 0, batchSize = 20, totalRecordsUpsertedSoFar = 0) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  const functionUrl = `${supabaseUrl}/functions/v1/get-kma-weather`;
  console.log(`Starting weather fetch for batch: startIndex=${startIndex}, batchSize=${batchSize}, totalRecordsUpsertedSoFar=${totalRecordsUpsertedSoFar}`);
  const collectionTime = new Date();
  const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  const logPayload = {
    function_name: `get-kma-weather-batch-${startIndex}`,
    status: 'started',
    records_upserted: 0,
    error_message: null
  };
  try {
    // 1. DB에서 모든 위치 정보를 가져옴 (178개 관측소)
    const { data: allLocations, error: locationError } = await supabaseClient.from('tide_weather_region').select('code, name, nx, ny');
    if (locationError) throw new Error(`Failed to fetch locations: ${locationError.message}`);
    if (!allLocations || allLocations.length === 0) {
      console.log("No locations found in tide_weather_region table. Exiting.");
      return;
    }
    console.log(`✅ Loaded ${allLocations.length} locations from tide_weather_region table`);
    // 2. 고유 격자 좌표(nx, ny)만 추출
    const uniqueGridLocations = new Map();
    for (const loc of allLocations){
      const gridKey = `${loc.nx},${loc.ny}`;
      if (!uniqueGridLocations.has(gridKey)) {
        uniqueGridLocations.set(gridKey, {
          nx: loc.nx,
          ny: loc.ny,
          locations: []
        });
      }
      const gridLocation = uniqueGridLocations.get(gridKey);
      if (gridLocation) {
        gridLocation.locations.push(loc);
      } else {
        console.error(`Failed to retrieve grid location for key: ${gridKey}`);
      }
    }
    const locationsToFetch = Array.from(uniqueGridLocations.values());
    const totalUniqueLocations = locationsToFetch.length;
    console.log(`✅ Found ${totalUniqueLocations} unique grid coordinates (nx,ny) from ${allLocations.length} locations`);
    // 3. 현재 배치를 처리
    const batchLocations = locationsToFetch.slice(startIndex, startIndex + batchSize);
    if (batchLocations.length === 0) {
      console.log("No more locations to process in this batch. Ending chain.");
      return;
    }
    console.log(`Processing ${batchLocations.length} locations in this batch.`);
    const { baseDate, baseTime } = getLatestBaseDateTime();
    const forecasts = {};
    const fetchPromises = batchLocations.map(async (location, index)=>{
      // API 요청 간격을 두어 CPU 부하 감소 및 Rate Limit 방지
      if (index > 0) {
        await delay(150 * index); // 200ms → 150ms로 단축하여 처리 속도 향상
      }
      const { nx, ny } = location;
      const params = new URLSearchParams({
        pageNo: '1',
        numOfRows: '1000',
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx: nx.toString(),
        ny: ny.toString(),
        authKey: KMA_AUTH_KEY
      });
      for(let attempt = 1; attempt <= 3; attempt++){
        try {
          const response = await fetch(`${KMA_API_URL}?${params.toString()}`);
          if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
          const data = await response.json();
          if (!data || !data.response || !data.response.header) {
            throw new Error('Invalid API response structure');
          }
          if (data.response.header.resultCode !== '00') {
            throw new Error(`API returned error: ${data.response.header.resultMsg || 'Unknown error'}`);
          }
          return {
            data,
            location
          }; // Success, return original location info
        } catch (e) {
          console.error(`Error fetching for nx=${nx}, ny=${ny} (Attempt ${attempt}):`, e.message);
          if (attempt < 3) await delay(1000 + attempt * 500);
          else throw new Error(`All 3 attempts failed for nx=${nx}, ny=${ny}.`);
        }
      }
      throw new Error(`Unexpected exit of retry loop for nx=${nx}, ny=${ny}`);
    });
    const results = await Promise.allSettled(fetchPromises);
    const now = new Date();
    const updatedAt = now.toISOString();
    // KST 시간을 올바른 타임존 표기로 생성 (+09:00)
    const updatedAtKr = now.toLocaleString('sv-SE', {
      timeZone: 'Asia/Seoul'
    }).replace(' ', 'T') + '+09:00';
    results.forEach((result)=>{
      if (result.status === 'fulfilled' && result.value) {
        const { data, location } = result.value;
        if (!data || !location) {
          console.error('Invalid result value: missing data or location');
          return;
        }
        const items = data?.response?.body?.items?.item;
        if (!items || items.length === 0) {
          console.log(`No forecast items received for nx=${location.nx},ny=${location.ny}.`);
          return;
        }
        for (const item of items){
          if (!item) {
            console.error('Null or undefined item in forecast data');
            continue;
          }
          // Use the original location list associated with this grid
          if (!location.locations || location.locations.length === 0) {
            console.error('No locations found for grid');
            continue;
          }
          for (const locInfo of location.locations){
            if (!locInfo) {
              console.error('Null or undefined location info');
              continue;
            }
            const key = `${item.fcstDate}${item.fcstTime}${locInfo.code}`;
            if (!forecasts[key]) {
              const year = parseInt(item.fcstDate.substring(0, 4)), month = parseInt(item.fcstDate.substring(4, 6)) - 1, day = parseInt(item.fcstDate.substring(6, 8)), hour = parseInt(item.fcstTime.substring(0, 2));
              // 기상청 데이터는 KST 시간이므로 UTC로 변환 (KST - 9시간)
              const fcstTimestamp = new Date(Date.UTC(year, month, day, hour) - 9 * 60 * 60 * 1000);
              // KST 표기는 원본 시간 그대로 (형식만 변환)
              const fcstDatetimeKr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00+09:00`;
              forecasts[key] = {
                nx: item.nx,
                ny: item.ny,
                base_date: item.baseDate,
                base_time: item.baseTime,
                fcst_datetime: fcstTimestamp.toISOString(),
                한글지역명: locInfo.name,
                location_code: locInfo.code,
                fcst_datetime_kr: fcstDatetimeKr,
                updated_at: updatedAt,
                updated_at_kr: updatedAtKr
              };
            }
            const category = item.category.toLowerCase();
            const value = [
              'pcp',
              'sno'
            ].includes(category) ? item.fcstValue : Number(item.fcstValue);
            forecasts[key][category] = value;
          }
        }
      } else if (result.status === 'rejected') {
        console.error(`Failed to process location fetch: ${result.reason}`);
      }
    });
    const dataToUpsert = Object.values(forecasts);
    logPayload.records_upserted = dataToUpsert.length;
    if (dataToUpsert.length > 0) {
      console.log(`Upserting ${dataToUpsert.length} records for this batch...`);
      const { error: dbError } = await supabaseClient.from('weather_forecasts').upsert(dataToUpsert, {
        onConflict: 'fcst_datetime,location_code'
      });
      if (dbError) throw new Error(`Database Error: ${dbError.message}`);
    }
    logPayload.status = 'success';
    console.log(`Batch starting at ${startIndex} finished successfully.`);
    // 4. 다음 배치 호출
    const nextStartIndex = startIndex + batchSize;
    if (nextStartIndex < totalUniqueLocations) {
      const newTotalUpserted = totalRecordsUpsertedSoFar + dataToUpsert.length;
      const remainingLocations = totalUniqueLocations - nextStartIndex;
      console.log(`📡 Invoking next batch at startIndex: ${nextStartIndex} (${remainingLocations} grid locations remaining)`);
      fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startIndex: nextStartIndex,
          batchSize: batchSize,
          totalRecordsUpserted: newTotalUpserted
        })
      }).catch((e)=>{
        console.error("Failed to invoke next batch:", e);
        return null;
      });
    } else {
      const finalTotalUpserted = totalRecordsUpsertedSoFar + dataToUpsert.length;
      console.log(`✅ Final batch summary: Processed ${batchLocations.length} grid locations, Upserted ${dataToUpsert.length} records.`);
      console.log(`✅ Grand total: Processed ${totalUniqueLocations} unique grid coordinates for ${allLocations.length} observation stations`);
      console.log(`✅ Total ${finalTotalUpserted} forecast records upserted across all batches.`);
      console.log("🎉 All batches processed. Weather data collection complete for all 178 stations!");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[CRITICAL] Error in batch starting at ${startIndex}:`, errorMessage, err);
    logPayload.status = 'failure';
    logPayload.error_message = errorMessage;
  } finally{
    try {
      const logPayloadForDb = {
        started_at: collectionTime.toISOString(),
        status: logPayload.status,
        records_upserted: logPayload.records_upserted,
        error_message: logPayload.error_message,
        function_name: `get-kma-weather-batch-${startIndex}`,
        finished_at: new Date().toISOString()
      };
      const { error: logError } = await supabaseClient.from('weather_fetch_logs').insert([
        logPayloadForDb
      ]);
      if (logError) {
        console.error('[CRITICAL] Failed to write to weather_fetch_logs:', logError);
      }
    } catch (logErr) {
      console.error('[CRITICAL] Error during final logging (weather_fetch_logs):', logErr);
    }
  }
}
// --- 메인 서빙 함수 ---
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    let { startIndex, batchSize, totalRecordsUpserted } = {
      startIndex: 0,
      batchSize: 20, // 178개 관측소 처리를 위해 배치 크기 증가 (10 → 20)
      totalRecordsUpserted: 0
    };
    try {
      const body = await req.json();
      startIndex = body.startIndex || 0;
      batchSize = body.batchSize || 20;
      totalRecordsUpserted = body.totalRecordsUpserted || 0;
    } catch  {
    // Ignore error if body is empty (initial cron trigger)
    }
    // doWeatherFetch를 직접 await으로 호출하여 실행이 끝날 때까지 기다립니다.
    await doWeatherFetch(startIndex, batchSize, totalRecordsUpserted);
    // 작업이 완료되었음을 알리는 응답을 반환합니다.
    return new Response(JSON.stringify({
      message: `Batch starting at ${startIndex} processed.`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Critical error in main function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});