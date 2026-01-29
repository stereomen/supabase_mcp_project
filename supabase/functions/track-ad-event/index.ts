import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  validateClientOrAdminAuth,
  createUnauthorizedResponse,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp
} from '../_shared/auth.ts';

interface AdEvent {
  ad_repo_id: string;
  event_type: 'impression' | 'click';
  station_id?: string;
  user_agent?: string;
  ip_address?: string;
  additional_data?: any;
}

// 메인 서빙 함수
serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  const headers = getCorsHeaders(requestOrigin);

  // CORS 사전 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  // 클라이언트 API 키 또는 관리자 인증 검증
  if (!validateClientOrAdminAuth(req)) {
    return createUnauthorizedResponse(headers);
  }

  // Rate limiting (IP 기반, 분당 200회 - 이벤트 추적은 더 높은 한도)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`track-event:${clientIp}`, 200, 60000);
  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return createRateLimitResponse(headers);
  }

  try {
    // Supabase 클라이언트 생성 - Service Role Key 사용
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // GET 요청: 기본 정보
    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        message: '광고 이벤트 추적 API입니다. POST 요청으로 이벤트를 기록하세요.',
        event_types: ['impression', 'click']
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // POST 요청: 이벤트 기록
    if (req.method === 'POST') {
      const body = await req.json();
      const { ad_repo_id, event_type, station_id, additional_data } = body;

      // 필수 파라미터 검증
      if (!ad_repo_id || !event_type) {
        return new Response(JSON.stringify({
          success: false,
          error: 'ad_repo_id와 event_type은 필수입니다.'
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      // event_type 검증
      if (!['impression', 'click'].includes(event_type)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'event_type은 impression 또는 click이어야 합니다.'
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      // 요청 헤더에서 user agent와 IP 추출
      const user_agent = req.headers.get('user-agent') || null;
      const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                         req.headers.get('x-real-ip') ||
                         null;

      // 이벤트 데이터 준비
      const eventData: AdEvent = {
        ad_repo_id,
        event_type,
        station_id: station_id || null,
        user_agent,
        ip_address,
        additional_data: additional_data || null
      };

      // 이벤트 기록
      const { data, error } = await supabase
        .from('ad_analytics')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        console.error('이벤트 기록 실패:', error);
        return new Response(JSON.stringify({
          success: false,
          error: '이벤트 기록 실패',
          message: error.message
        }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      console.log(`이벤트 기록 성공: ${event_type} for ad ${ad_repo_id}`);

      return new Response(JSON.stringify({
        success: true,
        data: {
          id: data.id,
          event_type: data.event_type,
          ad_repo_id: data.ad_repo_id,
          timestamp: data.event_timestamp
        },
        message: '이벤트가 성공적으로 기록되었습니다.'
      }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: '지원하지 않는 메소드입니다.'
    }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('함수 실행 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '내부 서버 오류',
      message: error.message
    }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
});
