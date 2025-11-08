// supabase/functions/get-weather-tide-data/index.ts
// *** v13: a, b 데이터에 station_id 추가 ***
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// RPC 함수를 직접 쿼리로 대체하여 성능 향상
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405
    });
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
          Authorization: `Bearer ${Deno.env.get('SERVICE_ROLE_KEY')}`
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
    const startDateKST = date; // "YYYY-MM-DD"
    // weather_forecasts: 3일치 데이터 계산
    const weatherEndDateObj = new Date(date);
    weatherEndDateObj.setDate(weatherEndDateObj.getDate() + 3); // 3일 후 (exclusive)
    const weatherExclusiveEndDateKST = `${weatherEndDateObj.getFullYear()}-${String(weatherEndDateObj.getMonth() + 1).padStart(2, '0')}-${String(weatherEndDateObj.getDate()).padStart(2, '0')}`;
    // tide_data: 14일치 데이터 계산
    const tideStartDate = new Date(date);
    const tideEndDate = new Date(tideStartDate);
    tideEndDate.setDate(tideEndDate.getDate() + 13); // 14일치 (0~13일 후)
    const tideStartDateOnly = tideStartDate.toISOString().split('T')[0];
    const tideEndDateOnly = tideEndDate.toISOString().split('T')[0];

    // medium-term forecasts: 4일째부터 11일째까지 (D+3 ~ D+10, 총 8일)
    const mediumStartDateObj = new Date(date);
    mediumStartDateObj.setDate(mediumStartDateObj.getDate() + 3); // 4일째부터
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

    console.log('Group 2: Fetching marine observations, medium-term forecasts, and WeatherAPI data in parallel...');
    const [marineObsResultA, marineObsResultB, marineResult, temperResult, weatherApiResult] = await Promise.all([
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
          reg_id, reg_sp, reg_name, mod, tm_fc, tm_fc_kr, tm_ef, tm_ef_kr,
          wh_a, wh_b, wf, sky, pre, conf, rn_st, forecast_type, location_code
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
          reg_id, reg_sp, reg_name, mod, tm_fc, tm_fc_kr, tm_ef, tm_ef_kr, c,
          min_temp, max_temp, min_temp_l, min_temp_h, max_temp_l, max_temp_h,
          sky, pre, conf, wf, rn_st, forecast_type, location_code
        `)
        .eq('location_code', locationCode)
        .eq('forecast_type', 'temperature')
        .gte('tm_ef_kr', mediumStartKST)
        .lte('tm_ef_kr', mediumEndKST)
        .order('tm_ef', { ascending: true }),

      // WeatherAPI data - 필수 필드만 선택 (14일치: 요청 날짜부터 +13일)
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

    // 8. 최종 결과 반환
    const responseData = {
      weather_forecasts: weatherResult?.data || [],
      tide_data: tideResult?.data || [],
      marine_observations: {
        a: marineObsA,
        b: marineObsB
      },
      marine: marineResult?.data || [],
      temper: temperResult?.data || [],
      // WeatherAPI 데이터 추가 (시간별 예보만)
      weatherapi: {
        hourly: hourlyForecast
      }
    };
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
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
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});