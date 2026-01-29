// supabase/functions/get-weather-tide-data/index.ts
// *** v17: 필수 필드 복원 - uuu, vvv, wav, reg_id, reg_sp, reg_name (2025-12-31) ***
// *** v16: API 응답 최적화 - 61개 미사용 필드 제거 (2025-12-31) ***
// *** v15: weatherapi 데이터 플래그로 제어 (기본값: false) ***
// v14: OpenWeatherMap 데이터 추가
// v13: a, b 데이터에 station_id 추가
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';
import {
  validateClientOrAdminAuth,
  createUnauthorizedResponse,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp
} from '../_shared/auth.ts';

// 기능 플래그
const INCLUDE_WEATHERAPI = false; // weatherapi 데이터 포함 여부 (나중에 사용 가능)

// UTC timestamptz를 KST ISO 문자열로 변환하는 함수
function convertUtcToKst(utcString: string): string {
  if (!utcString) return utcString;
  const date = new Date(utcString);
  // KST는 UTC+9
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  const hour = String(kstDate.getUTCHours()).padStart(2, '0');
  const minute = String(kstDate.getUTCMinutes()).padStart(2, '0');
  const second = String(kstDate.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

// UTC ISO 문자열을 타임존 오프셋을 적용한 로컬 시간 ISO 문자열로 변환
function convertUtcToLocalWithOffset(utcString: string, timezoneOffset: number): string {
  if (!utcString) return utcString;
  const utcDate = new Date(utcString);
  const localDate = new Date(utcDate.getTime() + timezoneOffset * 1000);

  // 타임존 오프셋을 ±HH:MM 형식으로 변환
  const offsetHours = Math.floor(Math.abs(timezoneOffset) / 3600);
  const offsetMinutes = Math.floor((Math.abs(timezoneOffset) % 3600) / 60);
  const offsetSign = timezoneOffset >= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hour = String(localDate.getUTCHours()).padStart(2, '0');
  const minute = String(localDate.getUTCMinutes()).padStart(2, '0');
  const second = String(localDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetString}`;
}

// RPC 함수를 직접 쿼리로 대체하여 성능 향상
Deno.serve(async (req)=>{
  const requestOrigin = req.headers.get('origin');
  const headers = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers
    });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers
    });
  }

  // 클라이언트 API 키 또는 관리자 인증 검증
  if (!validateClientOrAdminAuth(req)) {
    return createUnauthorizedResponse(headers);
  }

  // Rate limiting (IP 기반, 분당 100회)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp, 100, 60000);
  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return createRateLimitResponse(headers);
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    // 1. 파라미터 추출
    const locationCode = params.get('code');
    const date = params.get('date');
    const time = params.get('time'); // HHMM 형식
    console.log(`Request received with location_code: ${locationCode}, date: ${date}, time: ${time}`);
    if (!locationCode || !date) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: code and date are required.'
      }), {
        status: 400
      });
    }
    // 2. Supabase 클라이언트 초기화
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        }
      }
    });
    // 3. tide_abs_region 테이블에서 station ID 조회 (tide_weather_region 조회 제거)
    const absRegionResult = await supabaseClient
      .from('tide_abs_region')
      .select('"a_STN ID", "b_STN ID"')
      .eq('Code', locationCode)
      .single();

    // 에러 처리 개선 - 타임아웃이나 연결 오류 시에도 계속 진행
    let stationIdA = null;
    let stationIdB = null;

    if (absRegionResult.error) {
      console.error(`Station ID lookup failed for ${locationCode}:`, absRegionResult.error?.message || 'Unknown error');
    } else if (absRegionResult.data) {
      stationIdA = absRegionResult.data['a_STN ID'];
      stationIdB = absRegionResult.data['b_STN ID'];
    }
    // 4. KST 기준 날짜 범위 계산
    const startDateKST = date + 'T00:00:00+09:00'; // KST 00시
    // weather_forecasts: 3일치 데이터 계산
    const weatherEndDateObj = new Date(date);
    weatherEndDateObj.setDate(weatherEndDateObj.getDate() + 3); // 3일 후 (exclusive)
    const weatherExclusiveEndDateKST = `${weatherEndDateObj.getFullYear()}-${String(weatherEndDateObj.getMonth() + 1).padStart(2, '0')}-${String(weatherEndDateObj.getDate()).padStart(2, '0')}T00:00:00+09:00`;
    // tide_data: 14일치 데이터 계산
    const tideStartDate = new Date(date);
    const tideEndDate = new Date(tideStartDate);
    tideEndDate.setDate(tideEndDate.getDate() + 13); // 14일치 (0~13일 후)
    const tideStartDateOnly = tideStartDate.toISOString().split('T')[0];
    const tideEndDateOnly = tideEndDate.toISOString().split('T')[0];

    // medium-term forecasts: 요청일부터 11일째까지 (D+0 ~ D+10, 총 11일)
    const mediumStartDateObj = new Date(date);
    // 요청일부터 시작
    const mediumStartDateStr = mediumStartDateObj.toISOString().split('T')[0];

    const mediumEndDateObj = new Date(date);
    mediumEndDateObj.setDate(mediumEndDateObj.getDate() + 10); // 11일째까지
    const mediumEndDateStr = mediumEndDateObj.toISOString().split('T')[0];
    
    // KST 기준으로 날짜 범위 설정 (시간대 문제 해결)
    const mediumStartKST = mediumStartDateStr + 'T00:00:00+09:00';
    const mediumEndKST = mediumEndDateStr + 'T23:59:59+09:00';
    // 5. 병렬 데이터 조회 최적화 (3개씩 2그룹)
    console.log('Group 1: Fetching weather forecasts, tide data, and region IDs in parallel...');
    const [weatherResult, tideResult] = await Promise.all([
      supabaseClient.from('weather_forecasts').select(`
        fcst_datetime_kr,
        tmp, tmn, tmx, uuu, vvv, vec, wsd, sky, pty, pop, wav, pcp, reh, sno
      `).eq('location_code', locationCode).gte('fcst_datetime_kr', startDateKST).lt('fcst_datetime_kr', weatherExclusiveEndDateKST).order('fcst_datetime_kr', {
        ascending: true
      }),

      supabaseClient.from('tide_data').select(`
        obs_date,
        lvl1, lvl2, lvl3, lvl4,
        date_sun, date_moon, mool_normal, mool7, mool8
      `).eq('location_code', locationCode).gte('obs_date', tideStartDateOnly).lte('obs_date', tideEndDateOnly).order('obs_date', {
        ascending: true
      })
    ]);

    console.log('Group 2: Fetching marine observations, medium-term forecasts' + (INCLUDE_WEATHERAPI ? ', WeatherAPI' : '') + ' and OpenWeatherMap data in parallel...');
    const [marineObsResultA, marineObsResultB, marineResult, temperResult, weatherApiResult, openWeatherResult] = await Promise.all([
      // Marine observations A
      stationIdA ? (
        time ? 
          // If time is provided, get the latest observation on or before that time
          supabaseClient
            .from('marine_observations')
            .select('observation_time_kst, significant_wave_height, wind_direction, wind_speed, gust_wind_speed, water_temperature, air_temperature, pressure, humidity')
            .eq('station_id', stationIdA)
            .lte('observation_time_kst', date.replace(/-/g, '') + time)
            .like('observation_time_kst', date.replace(/-/g, '') + '%')
            .order('observation_time_kst', { ascending: false })
            .limit(1)
          :
          // If no time provided, get all observations for the day
          supabaseClient
            .from('marine_observations')
            .select('observation_time_kst, significant_wave_height, wind_direction, wind_speed, gust_wind_speed, water_temperature, air_temperature, pressure, humidity')
            .eq('station_id', stationIdA)
            .like('observation_time_kst', date.replace(/-/g, '') + '%')
            .order('observation_time_kst', { ascending: true })
      ) : Promise.resolve({data: [], error: null}),
      
      // Marine observations B  
      stationIdB ? (
        time ? 
          // If time is provided, get the latest observation on or before that time
          supabaseClient
            .from('marine_observations')
            .select('observation_time_kst, significant_wave_height, wind_direction, wind_speed, gust_wind_speed, water_temperature, air_temperature, pressure, humidity')
            .eq('station_id', stationIdB)
            .lte('observation_time_kst', date.replace(/-/g, '') + time)
            .like('observation_time_kst', date.replace(/-/g, '') + '%')
            .order('observation_time_kst', { ascending: false })
            .limit(1)
          :
          // If no time provided, get all observations for the day
          supabaseClient
            .from('marine_observations')
            .select('observation_time_kst, significant_wave_height, wind_direction, wind_speed, gust_wind_speed, water_temperature, air_temperature, pressure, humidity')
            .eq('station_id', stationIdB)
            .like('observation_time_kst', date.replace(/-/g, '') + '%')
            .order('observation_time_kst', { ascending: true })
      ) : Promise.resolve({data: [], error: null}),
      
      // Marine forecasts (location_code로 직접 조회)
      supabaseClient
        .from('medium_term_forecasts')
        .select(`
          tm_ef_kr, wh_a, wh_b, wf, reg_id, reg_sp, reg_name
        `)
        .eq('location_code', locationCode)
        .eq('forecast_type', 'marine')
        .gte('tm_ef_kr', mediumStartKST)
        .lte('tm_ef_kr', mediumEndKST)
        .order('tm_ef', { ascending: true }),

      // Temperature forecasts (location_code로 직접 조회)
      supabaseClient
        .from('medium_term_forecasts')
        .select(`
          tm_ef_kr, reg_id, reg_sp, reg_name,
          min_temp, max_temp, min_temp_l, min_temp_h, max_temp_l, max_temp_h,
          sky, pre, wf, rn_st
        `)
        .eq('location_code', locationCode)
        .eq('forecast_type', 'temperature')
        .gte('tm_ef_kr', mediumStartKST)
        .lte('tm_ef_kr', mediumEndKST)
        .order('tm_ef', { ascending: true }),

      // WeatherAPI data - 필수 필드만 선택 (14일치: 요청 날짜부터 +13일)
      INCLUDE_WEATHERAPI ?
        supabaseClient
          .from('weatherapi_data')
          .select(`
            observation_time_local,
            forecast_date, forecast_time, condition_text, condition_code,
            temp_c, wind_mph, wind_kph, wind_degree, wind_direction, gust_mph, gust_kph,
            data_type
          `)
          .eq('code', locationCode)
          .gte('forecast_date', date)
          .lte('forecast_date', tideEndDateOnly)
          .order('forecast_date', { ascending: true })
          .order('forecast_time', { ascending: true })
        : Promise.resolve({ data: [], error: null }),

      // OpenWeatherMap data - 14일치 예보 데이터 (요청 날짜부터 +13일)
      supabaseClient
        .from('openweathermap_data')
        .select(`
          forecast_date, forecast_time,
          weather_main, weather_description, weather_icon,
          temp, temp_min, temp_max,
          humidity, wind_speed, wind_deg, pop
        `)
        .eq('location_code', locationCode)
        .gte('forecast_date', date)
        .lte('forecast_date', tideEndDateOnly)
        .order('forecast_date', { ascending: true })
        .order('forecast_time', { ascending: true })
    ]);
    // 6. 해양 관측 데이터 가공 - 클라이언트 사용 필드만 포함
    const marineObsA = (marineObsResultA?.data || []).map((obs)=>({
        station_id: stationIdA,
        observation_time_kst: obs.observation_time_kst,
        water_temperature: obs.water_temperature,
        significant_wave_height: obs.significant_wave_height
      }));
    const marineObsB = (marineObsResultB?.data || []).map((obs)=>({
        station_id: stationIdB,
        observation_time_kst: obs.observation_time_kst,
        air_temperature: obs.air_temperature,
        wind_direction: obs.wind_direction,
        wind_speed: obs.wind_speed
      }));
    // 7. WeatherAPI 데이터 가공
    const weatherApiData = weatherApiResult?.data || [];

    // 시간별 예보만 반환 (14일간 336시간)
    const hourlyForecast = weatherApiData
      .filter(item => item.data_type === 'forecast' && item.forecast_time !== null)
      .sort((a, b) => {
        const dateCompare = (a.forecast_date || '').localeCompare(b.forecast_date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.forecast_time || '').localeCompare(b.forecast_time || '');
      });

    // 8. OpenWeatherMap 데이터 가공 (이미 필요한 필드만 조회됨)
    const openWeatherForecast = (openWeatherResult?.data || [])
      .sort((a, b) => {
        const dateCompare = (a.forecast_date || '').localeCompare(b.forecast_date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.forecast_time || '').localeCompare(b.forecast_time || '');
      });

    // 9. KST 타임스탬프 변환
    // 단기예보 데이터 변환
    const weatherForecastData = (weatherResult?.data || []).map(item => ({
      ...item,
      fcst_datetime_kr: convertUtcToKst(item.fcst_datetime_kr)
    }));

    // 중기예보 데이터 변환
    const marineData = (marineResult?.data || []).map(item => ({
      ...item,
      tm_fc_kr: convertUtcToKst(item.tm_fc_kr),
      tm_ef_kr: convertUtcToKst(item.tm_ef_kr)
    }));

    const temperData = (temperResult?.data || []).map(item => ({
      ...item,
      tm_fc_kr: convertUtcToKst(item.tm_fc_kr),
      tm_ef_kr: convertUtcToKst(item.tm_ef_kr)
    }));

    // 10. 최종 결과 반환
    const responseData = {
      version: "2025-12-31-v5",  // 버전 확인용 (필수 필드 복원)
      weather_forecasts: weatherForecastData,
      tide_data: tideResult?.data || [],
      marine_observations: {
        a: marineObsA,
        b: marineObsB
      },
      marine: marineData,
      temper: temperData,
      // WeatherAPI 데이터 추가 (플래그로 제어)
      ...(INCLUDE_WEATHERAPI && {
        weatherapi: {
          hourly: hourlyForecast
        }
      }),
      // OpenWeatherMap 데이터 추가
      openweathermap: {
        forecast: openWeatherForecast
      }
    };
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Unexpected critical error:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected critical error occurred.'
    }), {
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});