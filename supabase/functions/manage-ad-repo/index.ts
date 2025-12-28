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

interface AdCampaign {
  id?: string;
  partner_id: string;
  campaign_name: string;
  matched_station_id?: string[];  // string에서 string[]로 변경
  matched_area?: string;
  ad_type_a?: string;
  ad_type_b?: string;
  image_a_url?: string;
  image_b_url?: string;
  landing_url?: string;
  display_start_date: string;
  display_end_date: string;
  is_active?: boolean;
  priority?: number;
  description?: string;
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
        message: '광고 캠페인 관리 API입니다. POST 요청으로 CRUD 작업을 수행하세요.',
        actions: ['list', 'get', 'create', 'update', 'delete', 'list_partners', 'get_active']
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
          // 광고 캠페인 목록 조회 (ad_repo_view 사용)
          const { data, error } = await supabase
            .from('ad_repo_view')
            .select('*')
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false });

          if (error) {
            console.error('광고 목록 조회 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '광고 목록 조회 실패',
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
          // 특정 광고 조회
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
            .from('ad_repo_view')
            .select('*')
            .eq('id', id)
            .single();

          if (error) {
            console.error('광고 조회 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '광고 조회 실패',
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
          // 새 광고 캠페인 생성
          const campaignData: AdCampaign = body.data;

          if (!campaignData.partner_id || !campaignData.campaign_name ||
              !campaignData.display_start_date || !campaignData.display_end_date) {
            return new Response(JSON.stringify({
              success: false,
              error: '업체ID, 캠페인명, 노출 시작일, 노출 종료일은 필수입니다.'
            }), {
              status: 400,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          // matched_station_id 배열 검증
          if (campaignData.matched_station_id !== undefined && campaignData.matched_station_id !== null) {
            if (!Array.isArray(campaignData.matched_station_id)) {
              return new Response(JSON.stringify({
                success: false,
                error: 'matched_station_id는 배열이어야 합니다.'
              }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' }
              });
            }

            // 관측소 코드 형식 검증 (DT_0001, SO_0326, IE_0060, AD_0001 형식)
            const validPattern = /^(DT|SO|IE|AD)_\d{4}$/;
            const invalid = campaignData.matched_station_id.filter(code => !validPattern.test(code));
            if (invalid.length > 0) {
              return new Response(JSON.stringify({
                success: false,
                error: `유효하지 않은 관측소 코드: ${invalid.join(', ')}`
              }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' }
              });
            }
          }

          const { data, error } = await supabase
            .from('ad_repo')
            .insert([campaignData])
            .select()
            .single();

          if (error) {
            console.error('광고 생성 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '광고 생성 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          console.log('광고 생성 성공:', data.id);

          return new Response(JSON.stringify({
            success: true,
            data: data,
            message: '광고 캠페인이 성공적으로 생성되었습니다.'
          }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        case 'update': {
          // 광고 캠페인 업데이트
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

          // matched_station_id 배열 검증
          if (updateData.matched_station_id !== undefined && updateData.matched_station_id !== null) {
            if (!Array.isArray(updateData.matched_station_id)) {
              return new Response(JSON.stringify({
                success: false,
                error: 'matched_station_id는 배열이어야 합니다.'
              }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' }
              });
            }

            // 관측소 코드 형식 검증
            const validPattern = /^(DT|SO|IE|AD)_\d{4}$/;
            const invalid = updateData.matched_station_id.filter(code => !validPattern.test(code));
            if (invalid.length > 0) {
              return new Response(JSON.stringify({
                success: false,
                error: `유효하지 않은 관측소 코드: ${invalid.join(', ')}`
              }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' }
              });
            }
          }

          const { data, error } = await supabase
            .from('ad_repo')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (error) {
            console.error('광고 업데이트 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '광고 업데이트 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          console.log('광고 업데이트 성공:', id);

          return new Response(JSON.stringify({
            success: true,
            data: data,
            message: '광고 캠페인이 성공적으로 업데이트되었습니다.'
          }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        case 'delete': {
          // 광고 삭제 (soft delete: is_active를 false로 변경)
          const { id, hardDelete } = body;

          if (!id) {
            return new Response(JSON.stringify({
              success: false,
              error: 'ID가 필요합니다.'
            }), {
              status: 400,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          let data, error;

          if (hardDelete) {
            // 완전 삭제 (analytics 데이터도 CASCADE로 삭제됨)
            ({ data, error } = await supabase
              .from('ad_repo')
              .delete()
              .eq('id', id)
              .select()
              .single());
          } else {
            // 소프트 삭제
            ({ data, error } = await supabase
              .from('ad_repo')
              .update({ is_active: false })
              .eq('id', id)
              .select()
              .single());
          }

          if (error) {
            console.error('광고 삭제 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '광고 삭제 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          console.log('광고 삭제 성공:', id);

          return new Response(JSON.stringify({
            success: true,
            data: data,
            message: hardDelete ? '광고가 완전히 삭제되었습니다.' : '광고가 비활성화되었습니다.'
          }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        case 'list_partners': {
          // 제휴사 목록 조회 (광고 등록 시 선택용)
          const { data, error } = await supabase
            .from('ad_partners')
            .select('partner_id, partner_name, matched_station_id, matched_area, business_type, business_level')
            .eq('is_active', true)
            .order('partner_name');

          if (error) {
            console.error('제휴사 목록 조회 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '제휴사 목록 조회 실패',
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

        case 'get_active': {
          // 현재 활성 광고만 조회
          const { station_id } = body;

          const { data, error } = await supabase
            .rpc('get_active_ads_for_station', {
              p_station_id: station_id,
              p_date: new Date().toISOString().split('T')[0]
            });

          if (error) {
            console.error('활성 광고 조회 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '활성 광고 조회 실패',
              message: error.message
            }), {
              status: 500,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            data: data,
            hasAd: data && data.length > 0
          }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        default:
          return new Response(JSON.stringify({
            success: false,
            error: '지원하지 않는 작업입니다.',
            availableActions: ['list', 'get', 'create', 'update', 'delete', 'list_partners', 'get_active']
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
