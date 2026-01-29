// 인증 유틸리티
// 클라이언트 API 인증 및 관리자 인증 처리

/**
 * 클라이언트 API 키 검증
 * 앱에서 호출하는 공개 API용 (날씨, 조석, 광고 조회 등)
 *
 * 환경 변수: CLIENT_API_KEY
 * 헤더: x-api-key
 */
export function validateClientApiKey(req: Request): boolean {
  const clientApiKey = Deno.env.get('CLIENT_API_KEY');

  // API 키가 설정되지 않은 경우 경고 후 통과 (개발 환경)
  if (!clientApiKey) {
    console.warn('⚠️ CLIENT_API_KEY not set - allowing request (development mode)');
    return true;
  }

  const requestApiKey = req.headers.get('x-api-key');

  if (!requestApiKey || requestApiKey !== clientApiKey) {
    console.error('❌ Invalid or missing API key');
    return false;
  }

  return true;
}

/**
 * 클라이언트 API 키 또는 관리자 인증 검증
 * 클라이언트 앱 또는 관리자 페이지에서 호출 가능
 *
 * 환경 변수: CLIENT_API_KEY, ADMIN_SECRET
 * 헤더: x-api-key 또는 x-admin-secret
 */
export function validateClientOrAdminAuth(req: Request): boolean {
  // 먼저 클라이언트 API 키 확인
  const clientApiKey = Deno.env.get('CLIENT_API_KEY');
  const requestApiKey = req.headers.get('x-api-key');

  if (clientApiKey && requestApiKey === clientApiKey) {
    console.log('✅ Authenticated via CLIENT_API_KEY');
    return true;
  }

  // 클라이언트 키가 없거나 일치하지 않으면 관리자 인증 확인
  const adminSecret = Deno.env.get('ADMIN_SECRET');
  const requestSecret = req.headers.get('x-admin-secret');

  if (adminSecret && requestSecret === adminSecret) {
    console.log('✅ Authenticated via ADMIN_SECRET');
    return true;
  }

  // CLIENT_API_KEY가 설정되지 않은 경우 개발 모드로 통과
  if (!clientApiKey && !adminSecret) {
    console.warn('⚠️ No authentication configured - allowing request (development mode)');
    return true;
  }

  console.error('❌ Invalid or missing authentication');
  return false;
}

/**
 * 관리자 인증 검증
 * 관리 페이지에서 호출하는 API용 (광고 생성/수정/삭제, 파트너 관리 등)
 *
 * 환경 변수: ADMIN_SECRET
 * 헤더: x-admin-secret
 */
export function validateAdminAuth(req: Request): boolean {
  const adminSecret = Deno.env.get('ADMIN_SECRET');

  // ADMIN_SECRET이 설정되지 않은 경우 경고 후 통과 (개발 환경)
  if (!adminSecret) {
    console.warn('⚠️ ADMIN_SECRET not set - allowing request (development mode)');
    return true;
  }

  const requestSecret = req.headers.get('x-admin-secret');

  if (!requestSecret || requestSecret !== adminSecret) {
    console.error('❌ Invalid or missing admin secret');
    return false;
  }

  return true;
}

/**
 * 인증 실패 응답 생성
 */
export function createUnauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Unauthorized',
      message: '인증되지 않은 요청입니다.'
    }),
    {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Rate limiting을 위한 간단한 인메모리 저장소
 * 프로덕션에서는 Redis 등 외부 저장소 사용 권장
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * 간단한 Rate Limiting
 * @param identifier - IP 주소 또는 API 키
 * @param limit - 시간 창 내 최대 요청 수
 * @param windowMs - 시간 창 (밀리초)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  // 기록이 없거나 시간 창이 지난 경우
  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + windowMs
    });
    return { allowed: true, remaining: limit - 1 };
  }

  // 제한 초과
  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // 카운트 증가
  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Rate limit 초과 응답 생성
 */
export function createRateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too Many Requests',
      message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': '60'
      }
    }
  );
}

/**
 * 클라이언트 IP 주소 추출
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
