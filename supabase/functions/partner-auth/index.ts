import { corsHeaders } from '../_shared/cors.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 메인 서빙 함수
serve(async (req) => {
  // CORS 사전 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 생성 - Service Role Key 사용
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // GET 요청: 기본 정보
    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        message: '제휴사 인증 API입니다. POST 요청으로 작업을 수행하세요.',
        actions: ['login', 'change_password', 'reset_password']
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST 요청: 인증 작업
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;

      switch (action) {
        case 'login': {
          // 제휴사 로그인
          const { partner_id, password } = body;

          if (!partner_id || !password) {
            return new Response(JSON.stringify({
              success: false,
              error: '업체 ID와 비밀번호가 필요합니다.'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 제휴사 조회
          const { data, error } = await supabase
            .from('ad_partners')
            .select('*')
            .eq('partner_id', partner_id)
            .single();

          if (error || !data) {
            console.error('제휴사 조회 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '업체 ID 또는 비밀번호가 올바르지 않습니다.'
            }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 비밀번호 확인
          if (data.password !== password) {
            return new Response(JSON.stringify({
              success: false,
              error: '업체 ID 또는 비밀번호가 올바르지 않습니다.'
            }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 비활성 제휴사 체크
          if (!data.is_active) {
            return new Response(JSON.stringify({
              success: false,
              error: '비활성화된 업체입니다. 관리자에게 문의하세요.'
            }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 로그인 성공 - 비밀번호 제외하고 반환
          const { password: _, ...partnerInfo } = data;

          console.log(`제휴사 로그인 성공: ${partner_id}`);

          return new Response(JSON.stringify({
            success: true,
            data: partnerInfo,
            message: '로그인 성공'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'change_password': {
          // 제휴사가 자신의 비밀번호 변경
          const { partner_id, current_password, new_password } = body;

          if (!partner_id || !current_password || !new_password) {
            return new Response(JSON.stringify({
              success: false,
              error: '모든 필드를 입력해주세요.'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 비밀번호 길이 체크
          if (new_password.length < 4) {
            return new Response(JSON.stringify({
              success: false,
              error: '새 비밀번호는 최소 4자 이상이어야 합니다.'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 현재 비밀번호 확인
          const { data: partner, error: fetchError } = await supabase
            .from('ad_partners')
            .select('password')
            .eq('partner_id', partner_id)
            .single();

          if (fetchError || !partner) {
            return new Response(JSON.stringify({
              success: false,
              error: '업체를 찾을 수 없습니다.'
            }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          if (partner.password !== current_password) {
            return new Response(JSON.stringify({
              success: false,
              error: '현재 비밀번호가 올바르지 않습니다.'
            }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 비밀번호 업데이트
          const { error: updateError } = await supabase
            .from('ad_partners')
            .update({ password: new_password })
            .eq('partner_id', partner_id);

          if (updateError) {
            console.error('비밀번호 변경 실패:', updateError);
            return new Response(JSON.stringify({
              success: false,
              error: '비밀번호 변경 실패'
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 변경 이력 기록
          await supabase
            .from('ad_partner_password_history')
            .insert([{
              partner_id: partner_id,
              changed_by: 'self'
            }]);

          console.log(`비밀번호 변경 성공: ${partner_id}`);

          return new Response(JSON.stringify({
            success: true,
            message: '비밀번호가 성공적으로 변경되었습니다.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'reset_password': {
          // 관리자가 제휴사 비밀번호 초기화
          const { partner_id, new_password } = body;

          if (!partner_id || !new_password) {
            return new Response(JSON.stringify({
              success: false,
              error: '업체 ID와 새 비밀번호가 필요합니다.'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 비밀번호 업데이트
          const { error: updateError } = await supabase
            .from('ad_partners')
            .update({ password: new_password })
            .eq('partner_id', partner_id);

          if (updateError) {
            console.error('비밀번호 초기화 실패:', updateError);
            return new Response(JSON.stringify({
              success: false,
              error: '비밀번호 초기화 실패'
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 변경 이력 기록
          await supabase
            .from('ad_partner_password_history')
            .insert([{
              partner_id: partner_id,
              changed_by: 'admin'
            }]);

          console.log(`비밀번호 초기화 성공: ${partner_id}`);

          return new Response(JSON.stringify({
            success: true,
            message: '비밀번호가 성공적으로 초기화되었습니다.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        default:
          return new Response(JSON.stringify({
            success: false,
            error: '지원하지 않는 작업입니다.',
            availableActions: ['login', 'change_password', 'reset_password']
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: '지원하지 않는 메소드입니다.'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('함수 실행 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '내부 서버 오류',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
