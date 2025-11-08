// supabase/functions/fetch-weatherapi-data/index.ts
// WeatherAPI.com 날씨 데이터 수집 함수
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- 상수 정의 ---
const WEATHER_API_BASE_URL = 'http://api.weatherapi.com/v1';
const WEATHER_API_KEY = Deno.env.get('WEATHER_API_KEY');

// tide_abs_region 테이블에서 위치 정보를 동적으로 가져옴
// 기본 위치는 더 이상 하드코딩하지 않음

interface WeatherApiResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
  };
  current: {
    last_updated_epoch: number;
    last_updated: string;
    temp_c: number;
    temp_f: number;
    is_day: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_degree: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    precip_in: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    feelslike_f: number;
    vis_km: number;
    vis_miles: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
    air_quality?: {
      co: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      'us-epa-index': number;
      'gb-defra-index': number;
    };
  };
}

interface ForecastApiResponse extends WeatherApiResponse {
  forecast: {
    forecastday: Array<{
      date: string;
      date_epoch: number;
      day: {
        maxtemp_c: number;
        maxtemp_f: number;
        mintemp_c: number;
        mintemp_f: number;
        avgtemp_c: number;
        avgtemp_f: number;
        maxwind_mph: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        totalprecip_in: number;
        totalsnow_cm: number;
        avgvis_km: number;
        avgvis_miles: number;
        avghumidity: number;
        daily_will_it_rain: number;
        daily_chance_of_rain: number;
        daily_will_it_snow: number;
        daily_chance_of_snow: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        uv: number;
      };
      hour: Array<{
        time_epoch: number;
        time: string;
        temp_c: number;
        temp_f: number;
        is_day: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        wind_mph: number;
        wind_kph: number;
        wind_degree: number;
        wind_dir: string;
        pressure_mb: number;
        pressure_in: number;
        precip_mm: number;
        precip_in: number;
        humidity: number;
        cloud: number;
        feelslike_c: number;
        feelslike_f: number;
        vis_km: number;
        vis_miles: number;
        uv: number;
        gust_mph: number;
        gust_kph: number;
        will_it_rain: number;
        chance_of_rain: number;
        will_it_snow: number;
        chance_of_snow: number;
      }>;
    }>;
  };
}

/**
 * WeatherAPI.com에서 현재 날씨 데이터를 가져옵니다
 */
async function fetchCurrentWeather(location: string, includeAqi: boolean = false): Promise<WeatherApiResponse> {
  if (!WEATHER_API_KEY) {
    console.error('[ERROR] WEATHER_API_KEY environment variable is missing');
    throw new Error('WEATHER_API_KEY environment variable is required');
  }

  const params = new URLSearchParams({
    key: WEATHER_API_KEY,
    q: location,
    aqi: includeAqi ? 'yes' : 'no'
  });

  const url = `${WEATHER_API_BASE_URL}/current.json?${params.toString()}`;

  // 타임아웃 설정 (15초)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WeatherAPI-Client/1.0'
      }
    });
    clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`WeatherAPI request failed for ${location}: ${response.status} ${error}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`WeatherAPI request timeout for ${location} (15s)`);
      }
      throw error;
    }
}

/**
 * WeatherAPI.com에서 예보 데이터를 가져옵니다
 */
async function fetchForecast(location: string, days: number = 3, includeAqi: boolean = false): Promise<ForecastApiResponse> {
  if (!WEATHER_API_KEY) {
    console.error('[ERROR] WEATHER_API_KEY environment variable is missing');
    throw new Error('WEATHER_API_KEY environment variable is required');
  }

  const params = new URLSearchParams({
    key: WEATHER_API_KEY,
    q: location,
    days: days.toString(),
    aqi: includeAqi ? 'yes' : 'no',
    alerts: 'no'
  });

  const url = `${WEATHER_API_BASE_URL}/forecast.json?${params.toString()}`;

  // 타임아웃 설정 (20초 - 예보 데이터는 더 큰 응답)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WeatherAPI-Client/1.0'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WeatherAPI forecast request failed for ${location}: ${response.status} ${error}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`WeatherAPI forecast timeout for ${location} (20s)`);
    }
    throw error;
  }
}

/**
 * 현재 날씨 데이터를 데이터베이스 형식으로 변환합니다
 */
function transformCurrentWeatherData(data: WeatherApiResponse, locationInfo: {key: string, code: string}) {
  const { location, current } = data;
  const observationTimeUtc = new Date(current.last_updated_epoch * 1000).toISOString();
  const observationTimeLocal = new Date(location.localtime).toISOString();

  return {
    location_key: locationInfo.key,
    code: locationInfo.code,
    location_name: location.name,
    location_region: location.region,
    location_country: location.country,
    latitude: location.lat,
    longitude: location.lon,
    timezone_id: location.tz_id,
    observation_time_utc: observationTimeUtc,
    observation_time_local: observationTimeLocal,
    condition_text: current.condition.text,
    condition_icon: current.condition.icon,
    condition_code: current.condition.code,
    temp_c: current.temp_c,
    temp_f: current.temp_f,
    feelslike_c: current.feelslike_c,
    feelslike_f: current.feelslike_f,
    wind_mph: current.wind_mph,
    wind_kph: current.wind_kph,
    wind_degree: current.wind_degree,
    wind_direction: current.wind_dir,
    gust_mph: current.gust_mph,
    gust_kph: current.gust_kph,
    pressure_mb: current.pressure_mb,
    pressure_in: current.pressure_in,
    humidity: current.humidity,
    visibility_km: current.vis_km,
    visibility_miles: current.vis_miles,
    cloud: current.cloud,
    uv: current.uv,
    precip_mm: current.precip_mm,
    precip_in: current.precip_in,
    air_quality_co: current.air_quality?.co || null,
    air_quality_no2: current.air_quality?.no2 || null,
    air_quality_o3: current.air_quality?.o3 || null,
    air_quality_so2: current.air_quality?.so2 || null,
    air_quality_pm2_5: current.air_quality?.pm2_5 || null,
    air_quality_pm10: current.air_quality?.pm10 || null,
    air_quality_us_epa_index: current.air_quality?.['us-epa-index'] || null,
    air_quality_gb_defra_index: current.air_quality?.['gb-defra-index'] || null,
    data_type: 'current',
    is_day: current.is_day === 1,
    forecast_date: null,
    forecast_time: null
  };
}

/**
 * 예보 데이터를 데이터베이스 형식으로 변환합니다
 */
function transformForecastData(data: ForecastApiResponse, locationInfo: {key: string, code: string}) {
  const { location, forecast } = data;
  const records = [];

  for (const forecastDay of forecast.forecastday) {
    // Daily forecast
    const dailyRecord = {
      location_key: locationInfo.key,
      code: locationInfo.code,
      location_name: location.name,
      location_region: location.region,
      location_country: location.country,
      latitude: location.lat,
      longitude: location.lon,
      timezone_id: location.tz_id,
      observation_time_utc: new Date(forecastDay.date_epoch * 1000).toISOString(),
      observation_time_local: forecastDay.date,
      condition_text: forecastDay.day.condition.text,
      condition_icon: forecastDay.day.condition.icon,
      condition_code: forecastDay.day.condition.code,
      maxtemp_c: forecastDay.day.maxtemp_c,
      maxtemp_f: forecastDay.day.maxtemp_f,
      mintemp_c: forecastDay.day.mintemp_c,
      mintemp_f: forecastDay.day.mintemp_f,
      avgtemp_c: forecastDay.day.avgtemp_c,
      avgtemp_f: forecastDay.day.avgtemp_f,
      maxwind_mph: forecastDay.day.maxwind_mph,
      maxwind_kph: forecastDay.day.maxwind_kph,
      totalprecip_mm: forecastDay.day.totalprecip_mm,
      totalprecip_in: forecastDay.day.totalprecip_in,
      totalsnow_cm: forecastDay.day.totalsnow_cm,
      avgvis_km: forecastDay.day.avgvis_km,
      avgvis_miles: forecastDay.day.avgvis_miles,
      avghumidity: forecastDay.day.avghumidity,
      daily_will_it_rain: forecastDay.day.daily_will_it_rain,
      daily_chance_of_rain: forecastDay.day.daily_chance_of_rain,
      daily_will_it_snow: forecastDay.day.daily_will_it_snow,
      daily_chance_of_snow: forecastDay.day.daily_chance_of_snow,
      uv: forecastDay.day.uv,
      data_type: 'forecast',
      forecast_date: forecastDay.date,
      forecast_time: null
    };
    records.push(dailyRecord);

    // Hourly forecast
    for (const hour of forecastDay.hour) {
      const hourlyRecord = {
        location_key: locationInfo.key,
        code: locationInfo.code,
        location_name: location.name,
        location_region: location.region,
        location_country: location.country,
        latitude: location.lat,
        longitude: location.lon,
        timezone_id: location.tz_id,
        observation_time_utc: new Date(hour.time_epoch * 1000).toISOString(),
        observation_time_local: hour.time,
        condition_text: hour.condition.text,
        condition_icon: hour.condition.icon,
        condition_code: hour.condition.code,
        temp_c: hour.temp_c,
        temp_f: hour.temp_f,
        feelslike_c: hour.feelslike_c,
        feelslike_f: hour.feelslike_f,
        wind_mph: hour.wind_mph,
        wind_kph: hour.wind_kph,
        wind_degree: hour.wind_degree,
        wind_direction: hour.wind_dir,
        gust_mph: hour.gust_mph,
        gust_kph: hour.gust_kph,
        pressure_mb: hour.pressure_mb,
        pressure_in: hour.pressure_in,
        humidity: hour.humidity,
        visibility_km: hour.vis_km,
        visibility_miles: hour.vis_miles,
        cloud: hour.cloud,
        uv: hour.uv,
        precip_mm: hour.precip_mm,
        precip_in: hour.precip_in,
        data_type: 'forecast',
        is_day: hour.is_day === 1,
        forecast_date: forecastDay.date,
        forecast_time: hour.time.split(' ')[1]
      };
      records.push(hourlyRecord);
    }
  }

  return records;
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * tide_abs_region 테이블에서 위치 정보를 가져옵니다
 */
async function getTideRegionLocations(supabaseClient: any) {
  try {
    const result = await supabaseClient
      .from('tide_abs_region')
      .select('Code, Name, Latitude, Longitude')
      .not('Latitude', 'is', null)
      .not('Longitude', 'is', null);

    if (result.error) {
      console.error('[ERROR] Failed to fetch tide_abs_region data:', result.error.message);
      throw new Error(`Failed to fetch tide_abs_region data: ${result.error.message}`);
    }

    const data = result.data;

    if (!data || data.length === 0) {
      throw new Error('No location data found in tide_abs_region table');
    }

    console.log(`[INFO] Found ${data.length} locations for weather data collection`);

    return data.map(row => {
      const lat = parseFloat(row.Latitude || row.latitude);
      const lng = parseFloat(row.Longitude || row.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return null;
      }

      return {
        key: `${lat},${lng}`,
        code: row.Code || row.code,
        name: row.Name || row.name,
        lat: lat,
        lng: lng
      };
    }).filter(location => location !== null);
  } catch (error) {
    console.error('[ERROR] Error in getTideRegionLocations:', error);
    throw error;
  }
}

/**
 * 재시도 로직이 포함된 지역별 날씨 데이터 수집
 */
async function processLocationWeatherWithRetry(
  location: {key: string, code: string, name: string, lat: number, lng: number},
  supabaseClient: any,
  includeForecast: boolean = true,
  includeAqi: boolean = false,
  forecastDays: number = 14,
  maxRetries: number = 2
) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await processLocationWeather(location, supabaseClient, includeForecast, includeAqi, forecastDays);

      if (result.success) {
        return {
          ...result,
          attempted: attempt,
          retried: attempt > 1
        };
      } else {
        lastError = result.error;
        if (attempt < maxRetries) {
          await delay(1000 * attempt); // 재시도 간격 증가
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < maxRetries) {
        await delay(1000 * attempt);
      }
    }
  }

  return {
    success: false,
    recordsCollected: 0,
    location: location.name,
    error: lastError,
    attempted: maxRetries,
    retried: true
  };
}

/**
 * 개별 지역의 날씨 데이터를 수집합니다
 */
async function processLocationWeather(
  location: {key: string, code: string, name: string, lat: number, lng: number},
  supabaseClient: any,
  includeForecast: boolean = true,
  includeAqi: boolean = false,
  forecastDays: number = 14
) {
  let recordsCollected = 0;

  try {
    // 현재 날씨 수집
    const currentWeatherData = await fetchCurrentWeather(location.key, includeAqi);
    const currentRecord = transformCurrentWeatherData(currentWeatherData, {key: location.key, code: location.code});

    // 데이터베이스에 저장
    const currentResult = await supabaseClient
      .from('weatherapi_data')
      .upsert([currentRecord], {
        onConflict: 'location_key,observation_time_utc,data_type,forecast_date,forecast_time'
      });

    if (currentResult.error) {
      throw new Error(`Failed to insert current weather data: ${currentResult.error.message}`);
    }

    recordsCollected += 1;

    // 예보 데이터 수집 (옵션)
    if (includeForecast) {
      await delay(100); // API rate limit 방지를 위한 짧은 대기

      const forecastData = await fetchForecast(location.key, forecastDays, includeAqi);
      const forecastRecords = transformForecastData(forecastData, {key: location.key, code: location.code});

      const forecastResult = await supabaseClient
        .from('weatherapi_data')
        .upsert(forecastRecords, {
          onConflict: 'location_key,observation_time_utc,data_type,forecast_date,forecast_time'
        });

      if (forecastResult.error) {
        throw new Error(`Failed to insert forecast data: ${forecastResult.error.message}`);
      }

      recordsCollected += forecastRecords.length;
    }

    return { success: true, recordsCollected, location: location.name };

  } catch (error) {
    return {
      success: false,
      recordsCollected: 0,
      location: location.name,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 메인 데이터 수집 함수 - 모든 지역을 병렬 처리
 */
async function doWeatherApiFetch(
  customLocations?: Array<{key: string, code: string, name: string, lat: number, lng: number}>,
  includeForecast: boolean = true,
  includeAqi: boolean = false,
  forecastDays: number = 14
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  const startTime = new Date();

  let totalRecordsCollected = 0;
  let locationsProcessed = 0;
  let status = 'success';
  let errorMessage = null;
  let failedLocations: string[] = [];

  let locations = customLocations;

  try {
    // tide_abs_region 테이블에서 위치 정보 가져오기 (customLocations가 없는 경우)
    if (!locations) {
      try {
        locations = await getTideRegionLocations(supabaseClient);
        if (!locations || locations.length === 0) {
          throw new Error('No valid locations found in tide_abs_region table');
        }
      } catch (error) {
        console.error('[ERROR] Failed to get tide region locations, using fallback locations:', error);
        // 폴백: 기본 주요 도시들
        locations = [
          { key: 'Seoul', code: 'SEOUL', name: '서울', lat: 37.5665, lng: 126.9780 },
          { key: 'Busan', code: 'BUSAN', name: '부산', lat: 35.1796, lng: 129.0756 }
        ];
      }
    }

    console.log(`[INFO] Starting WeatherAPI data collection for ${locations.length} locations`);

    // 병렬 처리 - Promise.allSettled 사용하여 모든 지역을 동시에 처리
    const batchSize = 10; // 동시 처리할 최대 요청 수
    const results = [];

    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);

      const batchPromises = batch.map(location =>
        processLocationWeatherWithRetry(location, supabaseClient, includeForecast, includeAqi, forecastDays, 2)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // 배치 간 짧은 대기 (API rate limit 관리)
      if (i + batchSize < locations.length) {
        await delay(500);
      }
    }

    // 결과 집계 및 종합 통계
    let successCount = 0;
    let retrySuccessCount = 0;
    let totalFailureCount = 0;
    let timeoutFailures: string[] = [];
    let otherFailures: string[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const locationResult = result.value;
        if (locationResult.success) {
          totalRecordsCollected += locationResult.recordsCollected;
          locationsProcessed += 1;

          if (locationResult.retried) {
            retrySuccessCount += 1;
          } else {
            successCount += 1;
          }
        } else {
          totalFailureCount += 1;
          failedLocations.push(locationResult.location);

          // 실패 원인별 분류
          if (locationResult.error?.includes('timeout')) {
            timeoutFailures.push(locationResult.location);
          } else {
            otherFailures.push(locationResult.location);
          }

          if (!errorMessage) {
            errorMessage = `Some locations failed: ${locationResult.error}`;
          }
        }
      } else {
        totalFailureCount += 1;
        failedLocations.push('Unknown location');
        otherFailures.push('Unknown location');
        if (!errorMessage) {
          errorMessage = `Promise rejection: ${result.reason}`;
        }
      }
    }

    if (failedLocations.length > 0) {
      status = 'partial';
    }

    // 종합 결과 로그
    console.log(`[SUCCESS] WeatherAPI collection summary:`);
    console.log(`  - Total locations: ${locations.length}`);
    console.log(`  - Success (first try): ${successCount}`);
    console.log(`  - Success (after retry): ${retrySuccessCount}`);
    console.log(`  - Failed (timeout): ${timeoutFailures.length}`);
    console.log(`  - Failed (other): ${otherFailures.length}`);
    console.log(`  - Records collected: ${totalRecordsCollected}`);

    if (timeoutFailures.length > 0) {
      console.log(`[TIMEOUT] ${timeoutFailures.slice(0, 3).join(', ')}${timeoutFailures.length > 3 ? ` (+${timeoutFailures.length - 3} more)` : ''}`);
    }
    if (otherFailures.length > 0) {
      console.log(`[FAILED] ${otherFailures.slice(0, 3).join(', ')}${otherFailures.length > 3 ? ` (+${otherFailures.length - 3} more)` : ''}`);
    }

  } catch (error) {
    console.error('[CRITICAL] WeatherAPI collection error:', error);
    status = 'error';
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;

  } finally {
    // 수집 로그 저장
    try {
      const logPayload = {
        started_at: startTime.toISOString(),
        finished_at: new Date().toISOString(),
        status: status,
        records_collected: totalRecordsCollected,
        locations_processed: locationsProcessed,
        error_message: errorMessage,
        function_name: 'fetch-weatherapi-data'
      };

      const logResult = await supabaseClient
        .from('weatherapi_collection_logs')
        .insert(logPayload);

      if (logResult.error) {
        console.error('[ERROR] Failed to write collection log:', logResult.error.message);
      }
    } catch (logErr) {
      console.error('[CRITICAL] Error during final logging:', logErr);
    }
  }

  return {
    recordsCollected: totalRecordsCollected,
    locationsProcessed: locationsProcessed,
    totalLocations: locations?.length || 0,
    failedLocations: failedLocations.length,
    status: status
  };
}

// --- 메인 서빙 함수 ---
Deno.serve(async (req) => {
  console.log('fetch-weatherapi-data function invoked.');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let requestBody: any = {};

    try {
      requestBody = await req.json();
    } catch {
      // Request body가 없거나 잘못된 경우 기본값 사용
    }

    const {
      locations = null, // tide_abs_region 테이블에서 자동으로 가져옴
      includeForecast = true,
      includeAqi = false,
      forecastDays = 14
    } = requestBody;

    const result = await doWeatherApiFetch(locations, includeForecast, includeAqi, forecastDays);

    return new Response(JSON.stringify({
      message: `Successfully collected weather data`,
      ...result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Critical error in WeatherAPI function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});