import { corsHeaders } from '../_shared/cors.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AdPartner {
  id?: string;
  partner_id: string;
  partner_name: string;
  address?: string;
  phone?: string;
  contact_name?: string;
  matched_station_id?: string;
  matched_area?: string;
  business_type?: string;
  business_level?: number;
  staff_name_1?: string;
  staff_name_2?: string;
  staff_name_3?: string;
  is_active?: boolean;
  additional_data?: any;
}

// 메인 서빙 함수
serve(async (req) => {
  // CORS 사전 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 생성 - Service Role Key 사용 (RLS 우회)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // GET 요청: HTML UI는 별도의 Netlify 페이지에서 제공
    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        message: '광고 제휴사 관리 API입니다. POST 요청으로 CRUD 작업을 수행하세요.',
        actions: ['list', 'get', 'create', 'update', 'delete']
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST 요청: CRUD 작업
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;

      // 작업별 처리
      switch (action) {
        case 'list': {
          // 제휴사 목록 조회
          const { data, error } = await supabase
            .from('ad_partners')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('제휴사 목록 조회 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '제휴사 목록 조회 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            data: data,
            count: data?.length || 0
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'get': {
          // 특정 제휴사 조회
          const { id } = body;

          if (!id) {
            return new Response(JSON.stringify({
              success: false,
              error: 'ID가 필요합니다.'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { data, error } = await supabase
            .from('ad_partners')
            .select('*')
            .eq('id', id)
            .single();

          if (error) {
            console.error('제휴사 조회 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '제휴사 조회 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            data: data
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'create': {
          // 새 제휴사 생성
          const partnerData: AdPartner = body.data;

          if (!partnerData.partner_id || !partnerData.partner_name) {
            return new Response(JSON.stringify({
              success: false,
              error: '업체ID와 업체명은 필수입니다.'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { data, error } = await supabase
            .from('ad_partners')
            .insert([partnerData])
            .select()
            .single();

          if (error) {
            console.error('제휴사 생성 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '제휴사 생성 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          console.log('제휴사 생성 성공:', data.partner_id);

          return new Response(JSON.stringify({
            success: true,
            data: data,
            message: '제휴사가 성공적으로 생성되었습니다.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'update': {
          // 제휴사 정보 업데이트
          const { id, data: updateData } = body;

          if (!id) {
            return new Response(JSON.stringify({
              success: false,
              error: 'ID가 필요합니다.'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { data, error } = await supabase
            .from('ad_partners')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (error) {
            console.error('제휴사 업데이트 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '제휴사 업데이트 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          console.log('제휴사 업데이트 성공:', id);

          return new Response(JSON.stringify({
            success: true,
            data: data,
            message: '제휴사 정보가 성공적으로 업데이트되었습니다.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'delete': {
          // 제휴사 삭제 (실제 삭제가 아닌 is_active를 false로 변경)
          const { id, hardDelete } = body;

          if (!id) {
            return new Response(JSON.stringify({
              success: false,
              error: 'ID가 필요합니다.'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          let data, error;

          if (hardDelete) {
            // 완전 삭제
            ({ data, error } = await supabase
              .from('ad_partners')
              .delete()
              .eq('id', id)
              .select()
              .single());
          } else {
            // 소프트 삭제 (is_active를 false로 변경)
            ({ data, error } = await supabase
              .from('ad_partners')
              .update({ is_active: false })
              .eq('id', id)
              .select()
              .single());
          }

          if (error) {
            console.error('제휴사 삭제 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '제휴사 삭제 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          console.log('제휴사 삭제 성공:', id);

          return new Response(JSON.stringify({
            success: true,
            data: data,
            message: hardDelete ? '제휴사가 완전히 삭제되었습니다.' : '제휴사가 비활성화되었습니다.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        default:
          return new Response(JSON.stringify({
            success: false,
            error: '지원하지 않는 작업입니다.',
            availableActions: ['list', 'get', 'create', 'update', 'delete']
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
