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
  landing_page_type?: string;  // 'external' | 'auto'
  landing_page_title?: string;
  landing_page_content?: string;
  landing_page_image_url?: string;
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

  try {
    // Supabase 클라이언트 생성 - Service Role Key 사용 (RLS 우회)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // GET 요청: 랜딩 페이지 또는 기본 정보 (공개 접근 가능)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const campaignId = url.searchParams.get('id');

      // id 파라미터가 있으면 자동 생성 랜딩 페이지 HTML 반환
      if (campaignId) {
        const { data: campaign, error } = await supabase
          .from('ad_repo')
          .select(`
            id,
            campaign_name,
            landing_page_type,
            landing_page_title,
            landing_page_content,
            landing_page_image_url,
            landing_url,
            partner_id
          `)
          .eq('id', campaignId)
          .single();

        if (error || !campaign) {
          return new Response('Campaign not found', {
            status: 404,
            headers
          });
        }

        // 외부 URL 타입이면 리다이렉트
        if (campaign.landing_page_type === 'external' && campaign.landing_url) {
          return new Response(null, {
            status: 302,
            headers: {
              ...headers,
              'Location': campaign.landing_url
            }
          });
        }

        // 자동 생성 랜딩 페이지 HTML 생성
        const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${campaign.landing_page_title || campaign.campaign_name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            max-width: 800px;
            width: 100%;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .header .campaign-name {
            font-size: 14px;
            opacity: 0.9;
        }
        .image-section {
            width: 100%;
            max-height: 400px;
            overflow: hidden;
            background: #f5f5f5;
        }
        .image-section img {
            width: 100%;
            height: auto;
            display: block;
            object-fit: cover;
        }
        .content {
            padding: 40px 30px;
        }
        .content-text {
            font-size: 16px;
            line-height: 1.8;
            color: #333;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .footer {
            padding: 30px;
            background: #f8f9fa;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .no-content-placeholder {
            padding: 60px 30px;
            text-align: center;
            background: #f0f0f0;
            color: #999;
        }
        @media (max-width: 600px) {
            .header h1 {
                font-size: 24px;
            }
            .content {
                padding: 30px 20px;
            }
            .content-text {
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${campaign.landing_page_title || campaign.campaign_name}</h1>
            <div class="campaign-name">${campaign.campaign_name}</div>
        </div>

        ${campaign.landing_page_image_url ? `
        <div class="image-section">
            <img src="${campaign.landing_page_image_url}" alt="${campaign.landing_page_title || campaign.campaign_name}">
        </div>
        ` : ''}

        <div class="content">
            ${campaign.landing_page_content ? `
            <div class="content-text">${campaign.landing_page_content}</div>
            ` : `
            <div class="no-content-placeholder">
                <p>광고 내용이 준비 중입니다.</p>
            </div>
            `}
        </div>

        <div class="footer">
            <p>제공: ${campaign.partner_id}</p>
            <p style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
                Powered by Marine Weather Platform
            </p>
        </div>
    </div>
</body>
</html>
        `;

        return new Response(html, {
          status: 200,
          headers: {
            ...headers,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300' // 5분 캐싱
          }
        });
      }

      // id 파라미터 없으면 기본 API 정보 반환
      return new Response(JSON.stringify({
        message: '광고 캠페인 관리 API입니다. POST 요청으로 CRUD 작업을 수행하세요.',
        actions: ['list', 'get', 'create', 'update', 'delete', 'list_partners', 'get_active'],
        landing_page: 'GET 요청에 ?id={campaign_id} 파라미터를 추가하면 자동 생성 랜딩 페이지를 볼 수 있습니다.'
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // POST 요청: CRUD 작업 (관리자 인증 필요)
    if (req.method === 'POST') {
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

          // 자동 생성 랜딩 페이지인 경우 landing_url 업데이트
          if (campaignData.landing_page_type === 'auto') {
            const autoLandingUrl = `https://mancool.netlify.app/ad-landing.html?id=${data.id}`;

            const { error: updateError } = await supabase
              .from('ad_repo')
              .update({ landing_url: autoLandingUrl })
              .eq('id', data.id);

            if (updateError) {
              console.error('랜딩 URL 업데이트 실패:', updateError);
            } else {
              console.log('자동 생성 랜딩 URL 설정:', autoLandingUrl);
              data.landing_url = autoLandingUrl; // 응답 데이터 업데이트
            }
          }

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

          // 자동 생성 랜딩 페이지로 변경된 경우 landing_url 업데이트
          if (updateData.landing_page_type === 'auto') {
            const autoLandingUrl = `https://mancool.netlify.app/ad-landing.html?id=${id}`;

            const { error: urlUpdateError } = await supabase
              .from('ad_repo')
              .update({ landing_url: autoLandingUrl })
              .eq('id', id);

            if (urlUpdateError) {
              console.error('랜딩 URL 업데이트 실패:', urlUpdateError);
            } else {
              console.log('자동 생성 랜딩 URL 설정:', autoLandingUrl);
              data.landing_url = autoLandingUrl; // 응답 데이터 업데이트
            }
          }

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
