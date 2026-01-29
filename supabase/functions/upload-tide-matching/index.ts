// supabase/functions/upload-tide-matching/index.ts
// 조석 관측소 매칭 결과를 tide_abs_region 테이블에 업로드하는 함수

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 초기화 (Service Role Key 사용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 요청 본문에서 데이터 가져오기
    const { data: uploadData } = await req.json();

    if (!uploadData || !Array.isArray(uploadData) || uploadData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '업로드할 데이터가 없습니다.'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`${uploadData.length}개의 데이터를 tide_abs_region 테이블에 업로드합니다...`);

    // Supabase에 upsert (Code 기준으로 충돌 시 업데이트)
    const { data, error } = await supabase
      .from('tide_abs_region')
      .upsert(uploadData, { onConflict: 'Code' });

    if (error) {
      console.error('업로드 실패:', error);
      throw error;
    }

    console.log(`업로드 성공: ${uploadData.length}건`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${uploadData.length}개의 데이터가 성공적으로 업로드되었습니다.`,
        count: uploadData.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('오류 발생:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
