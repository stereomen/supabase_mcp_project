// supabase/functions/fetch-openweather-data/index.ts
// OpenWeatherMap API 날씨 데이터 수집 함수
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- 상수 정의 ---
const OPENWEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/3.0';
const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

/**
 * UTC 타임스탬프를 타임존 오프셋을 적용한 로컬 시간 ISO 문자열로 변환
 * @param utcTimestamp Unix timestamp (초 단위)
 * @param timezoneOffset 타임존 오프셋 (초 단위, 예: KST = 32400)
 * @returns ISO 8601 형식의 로컬 시간 문자열 (예: "2025-12-08T23:22:12+09:00")
 */
function convertUtcToLocalWithOffset(utcTimestamp: number, timezoneOffset: number): string {
  const utcDate = new Date(utcTimestamp * 1000);
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

// OpenWeatherMap One Call API 3.0 응답 인터페이스
interface WeatherData {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface OpenWeatherOneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: WeatherData[];
    rain?: {
      '1h'?: number;
    };
    snow?: {
      '1h'?: number;
    };
  };
  minutely?: Array<{
    dt: number;
    precipitation: number;
  }>;
  hourly?: Array<{
    dt: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: WeatherData[];
    pop: number;
    rain?: {
      '1h'?: number;
    };
    snow?: {
      '1h'?: number;
    };
  }>;
  daily: Array<{
    dt: number;
    sunrise: number;
    sunset: number;
    moonrise: number;
    moonset: number;
    moon_phase: number;
    summary: string;
    temp: {
      day: number;
      min: number;
      max: number;
      night: number;
      eve: number;
      morn: number;
    };
    feels_like: {
      day: number;
      night: number;
      eve: number;
      morn: number;
    };
    pressure: number;
    humidity: number;
    dew_point: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: WeatherData[];
    clouds: number;
    pop: number;
    rain?: number;
    snow?: number;
    uvi: number;
  }>;
  alerts?: Array<{
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
    tags: string[];
  }>;
}

/**
 * OpenWeatherMap One Call API 3.0에서 통합 날씨 데이터를 가져옵니다
 * 현재 날씨 + 8일 일별 예보를 한 번의 호출로 가져옵니다
 */
async function fetchOneCallData(lat: number, lon: number): Promise<OpenWeatherOneCallResponse> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY environment variable is required');
  }

  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    appid: OPENWEATHER_API_KEY,
    units: 'metric', // 섭씨 온도 사용
    lang: 'kr', // 한국어 날씨 설명
    exclude: 'minutely,hourly' // hourly는 5 Day Forecast로 대체, daily와 current만 사용
  });

  const url = `${OPENWEATHER_API_BASE_URL}/onecall?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초로 증가

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OpenWeatherMap-OneCall-Client/1.0'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenWeatherMap One Call API request failed: ${response.status} ${error}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`OpenWeatherMap One Call API request timeout (lat: ${lat}, lon: ${lon})`);
    }
    throw error;
  }
}

// 5 Day / 3 Hour Forecast API 응답 인터페이스
interface FiveDayForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      sea_level?: number;
      grnd_level?: number;
      humidity: number;
    };
    weather: WeatherData[];
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
      gust?: number;
    };
    visibility: number;
    pop: number;
    rain?: {
      '3h'?: number;
    };
    snow?: {
      '3h'?: number;
    };
    sys: {
      pod: string;
    };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population?: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

/**
 * 5 Day / 3 Hour Forecast API에서 데이터를 가져옵니다
 * 5일간 3시간 간격 예보 (총 40개 데이터 포인트)
 */
async function fetch5DayForecastData(lat: number, lon: number): Promise<FiveDayForecastResponse> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY environment variable is required');
  }

  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    appid: OPENWEATHER_API_KEY,
    units: 'metric',
    lang: 'kr'
  });

  const url = `https://api.openweathermap.org/data/2.5/forecast?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OpenWeatherMap-5Day-Forecast-Client/1.0'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`5 Day Forecast API request failed: ${response.status} ${error}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`5 Day Forecast API request timeout (lat: ${lat}, lon: ${lon})`);
    }
    throw error;
  }
}

/**
 * One Call API의 현재 날씨 데이터를 데이터베이스 형식으로 변환합니다
 */
function transformCurrentWeatherData(
  data: OpenWeatherOneCallResponse,
  locationInfo: {code: string, name: string}
) {
  const observationTimeUtc = new Date(data.current.dt * 1000).toISOString();
  const observationTimeLocal = convertUtcToLocalWithOffset(data.current.dt, data.timezone_offset);

  // current weather의 경우 forecast_date를 관측 날짜로, forecast_time을 '00:00:00'으로 설정
  const observationDate = observationTimeUtc.split('T')[0]; // YYYY-MM-DD

  return {
    location_code: locationInfo.code,
    location_name: locationInfo.name,
    location_country: null, // One Call API는 country 정보 미제공
    latitude: data.lat,
    longitude: data.lon,
    timezone_offset: data.timezone_offset,
    observation_time_utc: observationTimeUtc,
    observation_time_local: observationTimeLocal,

    // 날씨 상태
    weather_id: data.current.weather[0]?.id || null,
    weather_main: data.current.weather[0]?.main || null,
    weather_description: data.current.weather[0]?.description || null,
    weather_icon: data.current.weather[0]?.icon || null,

    // 온도
    temp: data.current.temp,
    feels_like: data.current.feels_like,
    temp_min: null, // current는 min/max 없음
    temp_max: null,

    // 기압 및 습도
    pressure: data.current.pressure,
    humidity: data.current.humidity,
    sea_level: null,
    ground_level: null,

    // 바람
    wind_speed: data.current.wind_speed,
    wind_deg: data.current.wind_deg,
    wind_gust: data.current.wind_gust || null,

    // 구름 및 가시거리
    clouds: data.current.clouds,
    visibility: data.current.visibility,

    // 강수/강설
    rain_1h: data.current.rain?.['1h'] || null,
    rain_3h: null, // One Call API는 1h만 제공
    snow_1h: data.current.snow?.['1h'] || null,
    snow_3h: null,

    // 일출/일몰
    sunrise: new Date(data.current.sunrise * 1000).toISOString(),
    sunset: new Date(data.current.sunset * 1000).toISOString(),

    data_type: 'current',
    forecast_date: observationDate, // 관측 날짜 설정
    forecast_time: '00:00:00', // 고정값 설정
    api_source: 'openweathermap'
  };
}

/**
 * One Call API의 8일 일별 예보 데이터를 데이터베이스 형식으로 변환합니다
 */
function transformDailyForecastData(
  data: OpenWeatherOneCallResponse,
  locationInfo: {code: string, name: string}
) {
  const records = [];

  for (const day of data.daily) {
    const forecastTimeUtc = new Date(day.dt * 1000);
    const forecastTimeLocal = convertUtcToLocalWithOffset(day.dt, data.timezone_offset);

    const forecastDate = forecastTimeUtc.toISOString().split('T')[0];
    const forecastTime = '12:00:00'; // 일별 예보는 정오 기준

    const record = {
      location_code: locationInfo.code,
      location_name: locationInfo.name,
      location_country: null,
      latitude: data.lat,
      longitude: data.lon,
      timezone_offset: data.timezone_offset,
      observation_time_utc: forecastTimeUtc.toISOString(),
      observation_time_local: forecastTimeLocal,

      // 날씨 상태
      weather_id: day.weather[0]?.id || null,
      weather_main: day.weather[0]?.main || null,
      weather_description: day.weather[0]?.description || null,
      weather_icon: day.weather[0]?.icon || null,

      // 온도 (일별 예보는 낮 기온을 temp로, min/max 사용)
      temp: day.temp.day,
      feels_like: day.feels_like.day,
      temp_min: day.temp.min,
      temp_max: day.temp.max,

      // 기압 및 습도
      pressure: day.pressure,
      humidity: day.humidity,
      sea_level: null,
      ground_level: null,

      // 바람
      wind_speed: day.wind_speed,
      wind_deg: day.wind_deg,
      wind_gust: day.wind_gust || null,

      // 구름 및 가시거리
      clouds: day.clouds,
      visibility: null, // 일별 예보는 visibility 미제공

      // 강수/강설 (일별 예보는 총량만 제공)
      rain_1h: null,
      rain_3h: day.rain || null, // 일별 총 강우량
      snow_1h: null,
      snow_3h: day.snow || null, // 일별 총 적설량

      // 강수 확률
      pop: day.pop * 100, // 0-1 범위를 0-100%로 변환

      // 일출/일몰 (일별 예보에 포함)
      sunrise: new Date(day.sunrise * 1000).toISOString(),
      sunset: new Date(day.sunset * 1000).toISOString(),

      data_type: 'forecast',
      forecast_date: forecastDate,
      forecast_time: forecastTime,
      api_source: 'openweathermap'
    };

    records.push(record);
  }

  return records;
}

/**
 * 5 Day / 3 Hour Forecast 데이터를 데이터베이스 형식으로 변환합니다
 * 5일간 3시간 간격 예보 (약 40개 데이터 포인트)
 */
function transform5DayForecastData(
  data: FiveDayForecastResponse,
  locationInfo: {code: string, name: string}
) {
  const records = [];

  for (const item of data.list) {
    const forecastTimeUtc = new Date(item.dt * 1000);
    const forecastTimeLocal = convertUtcToLocalWithOffset(item.dt, data.city.timezone);

    const forecastDate = forecastTimeUtc.toISOString().split('T')[0];
    const forecastTime = forecastTimeUtc.toISOString().split('T')[1].substring(0, 8); // HH:MM:SS

    const record = {
      location_code: locationInfo.code,
      location_name: locationInfo.name,
      location_country: data.city.country,
      latitude: data.city.coord.lat,
      longitude: data.city.coord.lon,
      timezone_offset: data.city.timezone,
      observation_time_utc: forecastTimeUtc.toISOString(),
      observation_time_local: forecastTimeLocal,

      // 날씨 상태
      weather_id: item.weather[0]?.id || null,
      weather_main: item.weather[0]?.main || null,
      weather_description: item.weather[0]?.description || null,
      weather_icon: item.weather[0]?.icon || null,

      // 온도
      temp: item.main.temp,
      feels_like: item.main.feels_like,
      temp_min: item.main.temp_min,
      temp_max: item.main.temp_max,

      // 기압 및 습도
      pressure: item.main.pressure,
      humidity: item.main.humidity,
      sea_level: item.main.sea_level || null,
      ground_level: item.main.grnd_level || null,

      // 바람
      wind_speed: item.wind.speed,
      wind_deg: item.wind.deg,
      wind_gust: item.wind.gust || null,

      // 구름 및 가시거리
      clouds: item.clouds.all,
      visibility: item.visibility,

      // 강수/강설 (3시간 누적)
      rain_1h: null,
      rain_3h: item.rain?.['3h'] || null,
      snow_1h: null,
      snow_3h: item.snow?.['3h'] || null,

      // 강수 확률
      pop: item.pop * 100, // 0-1 범위를 0-100%로 변환

      // 일출/일몰 (도시 레벨 정보, 각 예보 시점마다는 없음)
      sunrise: null,
      sunset: null,

      data_type: 'forecast',
      forecast_date: forecastDate,
      forecast_time: forecastTime,
      api_source: 'openweathermap'
    };

    records.push(record);
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
      throw new Error(`Failed to fetch tide_abs_region data: ${result.error.message}`);
    }

    if (!result.data || result.data.length === 0) {
      throw new Error('No location data found in tide_abs_region table');
    }

    console.log(`[INFO] Found ${result.data.length} locations for OpenWeatherMap data collection`);

    return result.data.map(row => {
      const lat = parseFloat(row.Latitude || row.latitude);
      const lng = parseFloat(row.Longitude || row.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return null;
      }

      return {
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
  location: {code: string, name: string, lat: number, lng: number},
  supabaseClient: any,
  includeForecast: boolean = true,
  maxRetries: number = 2
) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await processLocationWeather(location, supabaseClient, includeForecast);

      if (result.success) {
        return {
          ...result,
          attempted: attempt,
          retried: attempt > 1
        };
      } else {
        lastError = result.error;
        if (attempt < maxRetries) {
          await delay(1000 * attempt);
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
  location: {code: string, name: string, lat: number, lng: number},
  supabaseClient: any,
  includeForecast: boolean = true
) {
  let recordsCollected = 0;

  try {
    // One Call API로 현재 날씨 + 8일 일별 예보를 가져오기
    const oneCallData = await fetchOneCallData(location.lat, location.lng);

    // 현재 날씨 데이터 변환 및 저장
    const currentRecord = transformCurrentWeatherData(oneCallData, {
      code: location.code,
      name: location.name
    });

    const currentResult = await supabaseClient
      .from('openweathermap_data')
      .upsert([currentRecord], {
        onConflict: 'location_code,observation_time_utc,data_type,forecast_date,forecast_time'
      });

    if (currentResult.error) {
      throw new Error(`Failed to insert current weather data: ${currentResult.error.message}`);
    }

    recordsCollected += 1;

    // 예보 데이터 저장 (옵션)
    if (includeForecast) {
      // 8일 일별 예보 데이터 변환 및 저장
      const dailyForecastRecords = transformDailyForecastData(oneCallData, {
        code: location.code,
        name: location.name
      });

      const dailyForecastResult = await supabaseClient
        .from('openweathermap_data')
        .upsert(dailyForecastRecords, {
          onConflict: 'location_code,observation_time_utc,data_type,forecast_date,forecast_time'
        });

      if (dailyForecastResult.error) {
        throw new Error(`Failed to insert daily forecast data: ${dailyForecastResult.error.message}`);
      }

      recordsCollected += dailyForecastRecords.length;

      // 5일 3시간 간격 예보 데이터 가져오기 및 저장
      const fiveDayData = await fetch5DayForecastData(location.lat, location.lng);
      const fiveDayForecastRecords = transform5DayForecastData(fiveDayData, {
        code: location.code,
        name: location.name
      });

      if (fiveDayForecastRecords.length > 0) {
        const fiveDayForecastResult = await supabaseClient
          .from('openweathermap_data')
          .upsert(fiveDayForecastRecords, {
            onConflict: 'location_code,observation_time_utc,data_type,forecast_date,forecast_time'
          });

        if (fiveDayForecastResult.error) {
          throw new Error(`Failed to insert 5-day forecast data: ${fiveDayForecastResult.error.message}`);
        }

        recordsCollected += fiveDayForecastRecords.length;
      }
    }

    return { success: true, recordsCollected, location: location.name, code: location.code };

  } catch (error) {
    // 에러는 배치 레벨에서 처리하므로 여기서는 로그 없음
    return {
      success: false,
      recordsCollected: 0,
      location: location.name,
      code: location.code,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 메인 데이터 수집 함수 - 모든 지역을 배치 처리
 */
async function doOpenWeatherFetch(
  customLocations?: Array<{code: string, name: string, lat: number, lng: number}>,
  includeForecast: boolean = true
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
    // tide_abs_region 테이블에서 위치 정보 가져오기
    if (!locations) {
      locations = await getTideRegionLocations(supabaseClient);
      if (!locations || locations.length === 0) {
        throw new Error('No valid locations found');
      }
    }

    console.log(`[INFO] Starting OpenWeatherMap One Call API data collection for ${locations.length} locations`);

    // 배치 처리 (병렬 처리로 성능 향상)
    const batchSize = 5; // 타임아웃 방지를 위해 배치 크기 축소 (10 → 5)
    const results = [];
    const totalBatches = Math.ceil(locations.length / batchSize);

    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchStartTime = Date.now();

      const batchPromises = batch.map(location =>
        processLocationWeatherWithRetry(location, supabaseClient, includeForecast, 3)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // 배치 결과 집계
      const batchSuccess = batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const batchFailed = batch.length - batchSuccess;
      const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(1);

      console.log(`[BATCH ${batchNumber}/${totalBatches}] Completed in ${batchDuration}s - Success: ${batchSuccess}, Failed: ${batchFailed}`);

      // 실패한 위치 표시 (간략하게)
      if (batchFailed > 0) {
        const failedLocs = batchResults
          .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
          .map((r, idx) => batch[idx]?.code || 'unknown')
          .slice(0, 3);
        console.log(`  └─ Failed: ${failedLocs.join(', ')}${batchFailed > 3 ? ` +${batchFailed - 3} more` : ''}`);
      }

      // 배치 간 대기 (API rate limit 관리) - 최적화: 6초 → 100ms (get-medm-weather 기법)
      if (i + batchSize < locations.length) {
        await delay(100); // 100ms 대기 (전체 처리를 위한 공격적 최적화)
      }
    }

    // 최종 결과 집계
    let successCount = 0;
    let retrySuccessCount = 0;

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
          failedLocations.push(locationResult.code || locationResult.location);
          if (!errorMessage) {
            errorMessage = `Some locations failed: ${locationResult.error}`;
          }
        }
      } else {
        failedLocations.push('unknown');
        if (!errorMessage) {
          errorMessage = `Promise rejection: ${result.reason}`;
        }
      }
    }

    if (failedLocations.length > 0) {
      status = 'partial';
    }

    const duration = ((Date.now() - startTime.getTime()) / 1000).toFixed(1);
    console.log(`\n[SUMMARY] OpenWeatherMap data collection completed in ${duration}s`);
    console.log(`  ✓ Success: ${successCount + retrySuccessCount}/${locations.length} locations`);
    console.log(`  ✓ Records: ${totalRecordsCollected} (current + 5-day 3h interval + 8-day daily forecasts)`);
    if (retrySuccessCount > 0) {
      console.log(`  ⟳ Retry success: ${retrySuccessCount}`);
    }
    if (failedLocations.length > 0) {
      console.log(`  ✗ Failed: ${failedLocations.length} - ${failedLocations.slice(0, 10).join(', ')}${failedLocations.length > 10 ? '...' : ''}`);
    }

  } catch (error) {
    console.error('[CRITICAL] OpenWeatherMap collection error:', error);
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
        function_name: 'fetch-openweather-data'
      };

      const logResult = await supabaseClient
        .from('openweathermap_collection_logs')
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
  console.log('fetch-openweather-data function invoked.');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let requestBody: any = {};

    try {
      requestBody = await req.json();
    } catch {
      // Request body가 없는 경우 기본값 사용
    }

    const {
      locations = null,
      includeForecast = true
    } = requestBody;

    const result = await doOpenWeatherFetch(locations, includeForecast);

    return new Response(JSON.stringify({
      message: `Successfully collected OpenWeatherMap data`,
      ...result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Critical error in OpenWeatherMap function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
