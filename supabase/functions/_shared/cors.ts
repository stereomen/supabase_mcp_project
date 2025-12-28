// CORS 설정 - 환경 변수로 허용 도메인 제어
// ALLOWED_ORIGINS 환경 변수가 없으면 기본값으로 '*' 사용 (개발용)
// 프로덕션에서는 반드시 실제 도메인으로 설정할 것
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS');

  if (!allowedOrigins || allowedOrigins === '*') {
    // 개발 환경: 모든 도메인 허용 (경고 로그 출력)
    console.warn('⚠️ CORS: All origins allowed. Set ALLOWED_ORIGINS in production!');
    return '*';
  }

  // 프로덕션 환경: 허용된 도메인 목록 체크
  const origins = allowedOrigins.split(',').map(o => o.trim());

  if (requestOrigin && origins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // 요청 origin이 허용 목록에 없으면 첫 번째 도메인 반환
  return origins[0];
};

export const getCorsHeaders = (requestOrigin: string | null = null) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Credentials': 'true',
});

// 하위 호환성을 위한 기본 export (나중에 제거 예정)
export const corsHeaders = getCorsHeaders();