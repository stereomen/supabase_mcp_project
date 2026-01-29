import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIp
} from '../_shared/auth.ts';

/**
 * get-notice-posts
 * 클라이언트 앱용 공지사항 조회 API (읽기 전용)
 *
 * GET 요청 파라미터:
 * - id: (optional) 특정 공지사항 ID - 없으면 전체 목록 반환
 * - limit: (optional) 반환할 최대 개수 (기본값: 100)
 *
 * 반환 형식:
 * {
 *   success: true,
 *   data: [...],
 *   count: 10
 * }
 */

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  const headers = getCorsHeaders(requestOrigin);

  // CORS 사전 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      error: 'GET 요청만 지원합니다.'
    }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  // Rate limiting (IP 기반, 분당 100회)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`notice:${clientIp}`, 100, 60000);
  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return createRateLimitResponse(headers);
  }

  try {
    // URL 파라미터 파싱
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Supabase 클라이언트 생성 (ANON key 사용 - RLS 정책 적용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 특정 공지사항 조회
    if (id) {
      const { data, error } = await supabase
        .from('notice_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('공지사항 조회 실패:', error);
        return new Response(JSON.stringify({
          success: false,
          error: '공지사항을 찾을 수 없습니다.',
          message: error.message
        }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: data
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 전체 목록 조회 (상단 고정 먼저, 그 다음 최신순)
    const { data, error } = await supabase
      .from('notice_posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('공지사항 목록 조회 실패:', error);
      return new Response(JSON.stringify({
        success: false,
        error: '공지사항 목록 조회 실패',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: data || [],
      count: data?.length || 0
    }), {
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
