// supabase/functions/mcp-server/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// --- 헬퍼 함수 (Helper Functions) ---
/**
 * 'YYYYMMDDHHMM' 형식의 시간 문자열을 ISO 8601 형식으로 변환합니다.
 * @param {string} tm - 변환할 시간 문자열
 * @returns {string | null} 변환된 ISO 문자열 또는 실패 시 null
 */ function parseTmToISO(tm) {
  if (!/^\d{12}$/.test(tm)) {
    return null; // 유효하지 않은 형식
  }
  const year = parseInt(tm.substring(0, 4));
  const month = parseInt(tm.substring(4, 6)) - 1; // 월은 0부터 시작
  const day = parseInt(tm.substring(6, 8));
  const hour = parseInt(tm.substring(8, 10));
  const minute = parseInt(tm.substring(10, 12));
  return new Date(year, month, day, hour, minute).toISOString();
}
/**
 * 'info' 파라미터 값을 실제 DB 컬럼명과 지원 여부 컬럼명으로 매핑합니다.
 * @param {string} info - 'wd', 'tw', 'wh' 중 하나
 * @returns {{ column: string; flag: string } | null} 매핑된 컬럼명 객�� 또는 실패 시 null
 */ function getColumnAndSupportFlag(info) {
  switch(info){
    case 'wd':
      return {
        column: 'wind_direction',
        flag: 'supports_wind_direction'
      };
    case 'tw':
      return {
        column: 'water_temperature',
        flag: 'supports_water_temperature'
      };
    case 'wh':
      return {
        column: 'wave_height',
        flag: 'supports_wave_height'
      };
    default:
      return null;
  }
}
/**
 * get-kma-weather로 수집한 데이터를 앱용으로 제공하는 함수입니다.
 * 지역명, 날짜, 인증키를 받아서 해당 날짜의 모든 날씨 데이터를 반환합니다.
 * @param {Request} req - 수신된 요청 객체
 * @param {SupabaseClient} supabaseClient - Supabase 클라이언트 인스턴스
 */ async function handleAppDataRequest(req, supabaseClient) {
  const url = new URL(req.url);
  const params = url.searchParams;
  // 파라미터 추출
  const region = params.get('region'); // 선택사항 (참고용)
  const date = params.get('date');
  const authKey = params.get('authKey');
  const nx = params.get('nx'); // 격자 X 좌표
  const ny = params.get('ny'); // 격자 Y 좌표
  // 필수 파라미터 검증
  if (!date || !authKey) {
    return new Response(JSON.stringify({
      error: '필수 파라미터 누락',
      required: [
        'date',
        'authKey'
      ],
      optional: [
        'region',
        'nx',
        'ny'
      ],
      examples: [
        '/app-data?date=20250705&authKey=your-key',
        '/app-data?date=20250705&nx=98&ny=76&authKey=your-key',
        '/app-data?region=동해&date=20250705&authKey=your-key'
      ]
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // 인증키 검증
  if (authKey !== Deno.env.get('SUPABASE_ANON_KEY')) {
    return new Response(JSON.stringify({
      error: '인증키가 유효하지 않습니다'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // 날짜 형식 검증 (YYYYMMDD)
  if (!/^\d{8}$/.test(date)) {
    return new Response(JSON.stringify({
      error: '날짜 형식이 올바르지 않습니다. YYYYMMDD 형식으로 입력해주세요.'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  console.log('조회 조건:', {
    region,
    date,
    nx,
    ny
  });
  try {
    // get-kma-weather로 수집한 weather_forecasts 테이블에서 데이터 조회
    let query = supabaseClient.from('weather_forecasts').select('*').eq('base_date', date); // 해당 날짜의 예보 데이터
    // nx, ny 파라미터가 있으면 특정 격자 좌표만 조회
    if (nx && ny) {
      query = query.eq('nx', parseInt(nx)).eq('ny', parseInt(ny));
      console.log('특정 격자 좌표 조회:', {
        nx,
        ny
      });
    }
    const { data, error } = await query.order('fcst_datetime', {
      ascending: true
    });
    if (error) {
      console.error('데이터 조회 오류:', error);
      return new Response(JSON.stringify({
        error: '데이터 조회 실패',
        details: error
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('조회된 데이터 수:', data.length);
    // get-kma-weather 데이터를 앱에 최적화된 응답 형태로 변환
    const response = {
      success: true,
      region: region,
      date: date,
      query_location: nx && ny ? {
        nx: parseInt(nx),
        ny: parseInt(ny)
      } : null,
      data_count: data.length,
      weather_data: data.map((item)=>({
          nx: item.nx,
          ny: item.ny,
          base_date: item.base_date,
          base_time: item.base_time,
          fcst_datetime: item.fcst_datetime,
          pop: item.pop,
          pty: item.pty,
          pcp: item.pcp,
          reh: item.reh,
          sky: item.sky,
          tmp: item.tmp,
          tmn: item.tmn,
          tmx: item.tmx,
          uuu: item.uuu,
          vvv: item.vvv,
          wav: item.wav,
          vec: item.vec,
          wsd: item.wsd // 풍속
        })),
      summary: {
        avg_temperature: data.length > 0 ? (data.reduce((sum, item)=>sum + (item.tmp || 0), 0) / data.length).toFixed(1) : 0,
        avg_humidity: data.length > 0 ? (data.reduce((sum, item)=>sum + (item.reh || 0), 0) / data.length).toFixed(1) : 0,
        avg_wind_speed: data.length > 0 ? (data.reduce((sum, item)=>sum + (item.wsd || 0), 0) / data.length).toFixed(1) : 0,
        avg_wave_height: data.length > 0 ? (data.reduce((sum, item)=>sum + (item.wav || 0), 0) / data.length).toFixed(1) : 0,
        unique_locations: [
          ...new Set(data.map((item)=>`${item.nx},${item.ny}`))
        ]
      }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('앱 데이터 요청 오류:', error);
    return new Response(JSON.stringify({
      error: '서버 오류',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
/**
 * GET 요청을 처리하는 메인 로직입니다.
 * URL 파라미터를 기반으로 관측 데이터를 조회하여 반환합니다.
 * @param {Request} req - 수신된 요청 객체
 * @param {SupabaseClient} supabaseClient - Supabase 클라이언트 인스턴스
 */ async function handleGetRequest(req, supabaseClient) {
  const url = new URL(req.url);
  const path = url.pathname;
  const params = url.searchParams;
  // 앱용 데이터 엔드포인트 처리
  if (path.includes('/app-data')) {
    return await handleAppDataRequest(req, supabaseClient);
  }
  // 기존 엔드포인트 처리
  // URL에서 쿼리 파라미터를 추출합니다.
  const tm = params.get('tm');
  const authKey = params.get('authKey');
  const name = params.get('name');
  const info = params.get('info');
  // --- 1. 인증 및 유효성 검사 ---
  // authKey가 유효한지 확인합니다.
  if (!authKey || authKey !== Deno.env.get('SUPABASE_ANON_KEY')) {
    return new Response(JSON.stringify({
      error: 'Unauthorized: Invalid authKey'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 401
    });
  }
  // 필수 파라미터(name, info)가 있는지 확인합니다.
  if (!name || !info) {
    return new Response(JSON.stringify({
      error: 'Missing required parameters: name and info are required.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
  // 'info' 파라미터가 유효한 값인지 확인하고 DB 컬럼명으로 변환합니다.
  const columnMapping = getColumnAndSupportFlag(info);
  if (!columnMapping) {
    return new Response(JSON.stringify({
      error: 'Invalid info parameter. Must be one of: wd, tw, wh.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
  const { column, flag } = columnMapping;
  // --- 2. 데이터베이스 조회 ---
  // 'name'으로 'locations' 테이블에서 지역 정보를 조회합니다.
  const { data: location, error: locationError } = await supabaseClient.from('locations').select(`id, name, ${flag}`).eq('name', name).single();
  if (locationError || !location) {
    return new Response(JSON.stringify({
      error: `Location not found: ${name}`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 404
    });
  }
  // 해당 지역이 요청된 정보('info')를 지원하는지 확인합니다.
  if (!location[flag]) {
    return new Response(JSON.stringify({
      error: `The location '${name}' does not support the requested info '${info}'.`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
  // 관측 데이터를 조회하는 쿼리를 구성합니다.
  let query = supabaseClient.from('marine_observations').select(`observation_time, ${column}`).eq('location_id', location.id).not(column, 'is', null) // 요청된 데이터가 NULL이 아닌 것만 조회
  .order('observation_time', {
    ascending: false
  }); // 최신순으로 정렬
  // 'tm' 파라미터가 있으면 해당 시간의 데이터를, 없으면 가장 최근 데이터를 조회합니다.
  if (tm) {
    const observationTime = parseTmToISO(tm);
    if (!observationTime) {
      return new Response(JSON.stringify({
        error: 'Invalid tm format. Expected YYYYMMDDHHMM.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    query = query.eq('observation_time', observationTime);
  } else {
    query = query.limit(1); // 가장 최근 1건만 조회
  }
  // --- 3. 결과 반환 ---
  // 쿼리를 실행하고 결과를 가져옵니다.
  const { data: observation, error: obsError } = await (tm ? query.single() : query.maybeSingle());
  if (obsError) {
    console.error('Database query error:', obsError);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve observation data.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
  // 조회된 데이터가 없으면 404 에러를 반환합니다.
  if (!observation) {
    return new Response(JSON.stringify({
      error: 'No matching observation found for the given criteria.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 404
    });
  }
  // 최종 결과를 JSON 형식으로 구성합니다.
  const result = {
    location: location.name,
    observation_time: observation.observation_time,
    [info]: observation[column]
  };
  return new Response(JSON.stringify(result), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    status: 200
  });
}
// --- 메인 함수 ---
// 이 함수는 외부 HTTP 요청을 받아 GET 또는 POST 메서드에 따라 분기 처리합니다.
Deno.serve(async (req)=>{
  // CORS 사전 요청(preflight) 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // --- Supabase 클라이언트 초기화 ---
  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: {
      headers: {
        Authorization: `Bearer ${Deno.env.get('SERVICE_ROLE_KEY')}`
      }
    }
  });
  try {
    // GET 요청은 handleGetRequest 함수에서 처리합니다.
    if (req.method === 'GET') {
      return await handleGetRequest(req, supabaseClient);
    }
    // POST 요청은 기존의 MCP(Model Calling Platform) 형식으로 처리합니다.
    if (req.method === 'POST') {
      const { tool_name, tool_input } = await req.json();
      let tool_output;
      switch(tool_name){
        case 'get_marine_observations':
          // 여기에 POST 요청에 대한 로직을 구현할 수 있습니다.
          const { data, error } = await supabaseClient.from('marine_observations').select('*, locations(*)');
          if (error) throw error;
          tool_output = data;
          break;
        default:
          throw new Error(`Tool "${tool_name}" is not supported.`);
      }
      return new Response(JSON.stringify({
        tool_output
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // 허용되지 않은 HTTP 메서드에 대한 처리
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 405
    });
  } catch (error) {
    // --- 에러 처리 ---
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
