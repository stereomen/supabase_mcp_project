import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const url = new URL(req.url)
    const params = url.searchParams
    
    const code = params.get('code')
    const date = params.get('date')
    
    console.log(`Request received with code: ${code}, date: ${date}`)
    
    if (!code || !date) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: code and date are required.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return new Response(
        JSON.stringify({ error: 'date는 YYYY-MM-DD 형식이어야 합니다.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${Deno.env.get('SERVICE_ROLE_KEY')}`
          }
        }
      }
    )

    // 1. tide_weather_region 테이블에서 marine_reg_id와 temper_reg_id 조회
    const { data: regionData, error: regionError } = await supabase
      .from('tide_weather_region')
      .select('marine_reg_id, temper_reg_id')
      .eq('code', code)
      .single()

    if (regionError || !regionData) {
      console.error('지역 조회 오류:', regionError)
      return new Response(
        JSON.stringify({ error: '해당 코드에 대한 지역 정보를 찾을 수 없습니다.' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { marine_reg_id, temper_reg_id } = regionData

    // 날짜 범위 계산
    // Short forecasts: 요청일부터 3일 (D+0 ~ D+2)
    const shortStartDate = date
    const shortEndDateObj = new Date(date)
    shortEndDateObj.setDate(shortEndDateObj.getDate() + 3) // 3일 후 (exclusive)
    const shortEndDateStr = `${shortEndDateObj.getFullYear()}-${String(shortEndDateObj.getMonth() + 1).padStart(2, '0')}-${String(shortEndDateObj.getDate()).padStart(2, '0')}`

    // KST 기준으로 날짜 범위 설정 (단기예보)
    const shortStartKST = shortStartDate + 'T00:00:00+09:00'
    const shortEndKST = shortEndDateStr + 'T00:00:00+09:00'

    // Medium forecasts: 요청일부터 10일째까지 (D+0 ~ D+9, 총 10일)
    const mediumStartDateObj = new Date(date)
    // 요청일부터 시작
    const mediumStartDateStr = mediumStartDateObj.toISOString().split('T')[0]

    const mediumEndDateObj = new Date(date)
    mediumEndDateObj.setDate(mediumEndDateObj.getDate() + 9) // 10일째까지
    const mediumEndDateStr = mediumEndDateObj.toISOString().split('T')[0]

    // KST 기준으로 날짜 범위 설정 (중기예보)
    const mediumStartKST = mediumStartDateStr + 'T00:00:00+09:00'
    const mediumEndKST = mediumEndDateStr + 'T23:59:59+09:00'

    // 1. Short forecasts 조회 (단기예보 3일) - 클라이언트 사용 필드만
    const shortForecastsPromise = supabase
      .from('weather_forecasts')
      .select(`
        fcst_datetime_kr,
        tmp, tmn, tmx, uuu, vvv, vec, wsd, sky, pty, pop, wav, pcp, reh, sno
      `)
      .eq('location_code', code)
      .gte('fcst_datetime_kr', shortStartKST)
      .lt('fcst_datetime_kr', shortEndKST)
      .order('fcst_datetime_kr', { ascending: true })

    // 2. Marine 데이터 조회 (중기 해상정보 7일)
    const marineDataPromise = supabase
      .from('medium_term_forecasts')
      .select(`
        reg_id, reg_sp, reg_name, mod,
        tm_fc, tm_fc_kr, tm_ef, tm_ef_kr,
        wh_a, wh_b, wf, sky, pre, conf, rn_st,
        forecast_type
      `)
      .eq('reg_id', marine_reg_id)
      .eq('forecast_type', 'marine')
      .gte('tm_ef_kr', mediumStartKST)
      .lte('tm_ef_kr', mediumEndKST)
      .order('tm_ef', { ascending: true })

    // 3. Temperature 데이터 조회 (중기 기온정보 7일)
    const temperDataPromise = supabase
      .from('medium_term_forecasts')
      .select(`
        reg_id, reg_sp, reg_name, mod,
        tm_fc, tm_fc_kr, tm_ef, tm_ef_kr,
        min_temp, max_temp, min_temp_l, min_temp_h, max_temp_l, max_temp_h,
        c, sky, pre, conf, wf, rn_st,
        forecast_type
      `)
      .eq('reg_id', temper_reg_id)
      .eq('forecast_type', 'temperature')
      .gte('tm_ef_kr', mediumStartKST)
      .lte('tm_ef_kr', mediumEndKST)
      .order('tm_ef', { ascending: true })

    // 병행 실행
    const [shortForecastsResult, marineResult, temperResult] = await Promise.all([
      shortForecastsPromise,
      marineDataPromise,
      temperDataPromise
    ])

    if (shortForecastsResult.error) {
      console.error('Short forecasts 데이터 조회 오류:', shortForecastsResult.error)
      return new Response(
        JSON.stringify({ error: 'Short forecasts 데이터 조회 중 오류가 발생했습니다.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (marineResult.error) {
      console.error('Marine 데이터 조회 오류:', marineResult.error)
      return new Response(
        JSON.stringify({ error: 'Marine 데이터 조회 중 오류가 발생했습니다.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (temperResult.error) {
      console.error('Temperature 데이터 조회 오류:', temperResult.error)
      return new Response(
        JSON.stringify({ error: 'Temperature 데이터 조회 중 오류가 발생했습니다.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // KST 타임스탬프 변환
    const shortForecastsData = (shortForecastsResult.data || []).map(item => ({
      ...item,
      fcst_datetime_kr: convertUtcToKst(item.fcst_datetime_kr)
    }));

    const marineData = (marineResult.data || []).map(item => ({
      ...item,
      tm_fc_kr: convertUtcToKst(item.tm_fc_kr),
      tm_ef_kr: convertUtcToKst(item.tm_ef_kr)
    }));

    const temperData = (temperResult.data || []).map(item => ({
      ...item,
      tm_fc_kr: convertUtcToKst(item.tm_fc_kr),
      tm_ef_kr: convertUtcToKst(item.tm_ef_kr)
    }));

    const response = {
      short_forecasts: shortForecastsData,
      marine: marineData,
      temper: temperData
    }

    console.log(`통합 예보 데이터 조회 완료 - Code: ${code}, Date: ${date}, Short: ${response.short_forecasts.length}건, Marine: ${response.marine.length}건, Temperature: ${response.temper.length}건`)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('get-medm-weather-data 함수 오류:', error)
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})