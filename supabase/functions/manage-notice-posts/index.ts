import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  validateAdminAuth,
  createUnauthorizedResponse,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp
} from '../_shared/auth.ts';

interface NoticePost {
  id?: number;
  title: string;
  content: string;
  is_pinned?: boolean;
  author?: string;
  created_at?: string;
  updated_at?: string;
}

// 메인 서빙 함수
serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  const headers = getCorsHeaders(requestOrigin);

  // CORS 사전 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  // 관리자 인증 검증
  if (!validateAdminAuth(req)) {
    return createUnauthorizedResponse(headers);
  }

  // Rate limiting (IP 기반, 분당 50회 - 관리 작업은 낮은 한도)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`admin:${clientIp}`, 50, 60000);
  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for admin IP: ${clientIp}`);
    return createRateLimitResponse(headers);
  }

  try {
    // Supabase 클라이언트 생성 - Service Role Key 사용 (RLS 우회)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // GET 요청: 기본 정보
    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        message: '공지사항 관리 API입니다. POST 요청으로 CRUD 작업을 수행하세요.',
        actions: ['list', 'get', 'create', 'update', 'delete']
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // POST 요청: CRUD 작업
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;

      // 작업별 처리
      switch (action) {
        case 'list': {
          // 공지사항 목록 조회 (상단 고정 먼저, 그 다음 최신순)
          const { data, error } = await supabase
            .from('notice_posts')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

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
            data: data,
            count: data?.length || 0
          }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        case 'get': {
          // 특정 공지사항 조회
          const { id } = body;

          if (!id) {
            return new Response(JSON.stringify({
              success: false,
              error: 'ID가 필요합니다.'
            }), {
              status: 400,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          const { data, error } = await supabase
            .from('notice_posts')
            .select('*')
            .eq('id', id)
            .single();

          if (error) {
            console.error('공지사항 조회 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '공지사항 조회 실패',
              message: error.message
            }), {
              status: 500,
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

        case 'create': {
          // 새 공지사항 생성
          const postData: NoticePost = body.data;

          if (!postData.title || !postData.content) {
            return new Response(JSON.stringify({
              success: false,
              error: '제목과 내용은 필수입니다.'
            }), {
              status: 400,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          const { data, error } = await supabase
            .from('notice_posts')
            .insert([postData])
            .select()
            .single();

          if (error) {
            console.error('공지사항 생성 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '공지사항 생성 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          console.log('공지사항 생성 성공:', data.id);

          return new Response(JSON.stringify({
            success: true,
            data: data,
            message: '공지사항이 성공적으로 생성되었습니다.'
          }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        case 'update': {
          // 공지사항 업데이트
          const { id, data: updateData } = body;

          if (!id) {
            return new Response(JSON.stringify({
              success: false,
              error: 'ID가 필요합니다.'
            }), {
              status: 400,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          const { data, error } = await supabase
            .from('notice_posts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (error) {
            console.error('공지사항 업데이트 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '공지사항 업데이트 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          console.log('공지사항 업데이트 성공:', id);

          return new Response(JSON.stringify({
            success: true,
            data: data,
            message: '공지사항이 성공적으로 업데이트되었습니다.'
          }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        case 'delete': {
          // 공지사항 삭제 (완전 삭제)
          const { id } = body;

          if (!id) {
            return new Response(JSON.stringify({
              success: false,
              error: 'ID가 필요합니다.'
            }), {
              status: 400,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          const { data, error } = await supabase
            .from('notice_posts')
            .delete()
            .eq('id', id)
            .select()
            .single();

          if (error) {
            console.error('공지사항 삭제 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '공지사항 삭제 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          console.log('공지사항 삭제 성공:', id);

          return new Response(JSON.stringify({
            success: true,
            data: data,
            message: '공지사항이 삭제되었습니다.'
          }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        default:
          return new Response(JSON.stringify({
            success: false,
            error: '지원하지 않는 작업입니다.',
            availableActions: ['list', 'get', 'create', 'update', 'delete']
          }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
      }
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
