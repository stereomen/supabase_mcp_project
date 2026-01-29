// supabase/functions/health-check/index.ts
// 콜드 스타트 방지를 위한 가벼운 헬스체크 함수
// pg_cron에서 주기적으로 호출하여 Edge Function을 warm 상태로 유지

import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  const headers = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  // 간단한 헬스체크 응답
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'supabase-edge-functions',
      message: 'Keep-alive ping successful'
    }),
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      status: 200
    }
  );
});
