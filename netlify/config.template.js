// 환경 변수 기반 설정 템플릿
// 실제 배포 시 이 파일을 사용하여 config.js를 생성합니다

// ⚠️ 주의: 이 파일은 템플릿입니다. 실제 값은 빌드 시 환경 변수에서 주입됩니다.
// Netlify 환경 변수 설정:
// 1. Netlify Dashboard → Site Settings → Environment Variables
// 2. 아래 변수들을 추가:
//    - SUPABASE_URL
//    - SUPABASE_ANON_KEY
//    - ADMIN_SECRET

window.APP_CONFIG = {
  // Supabase 설정
  SUPABASE_URL: '%%SUPABASE_URL%%',
  SUPABASE_ANON_KEY: '%%SUPABASE_ANON_KEY%%',

  // 관리자 인증 (관리 페이지용)
  // ⚠️ 실제로는 이 방식 대신 별도의 인증 시스템을 사용하는 것이 권장됩니다
  ADMIN_SECRET: '%%ADMIN_SECRET%%',

  // API 엔드포인트
  FUNCTIONS_BASE_URL: '%%SUPABASE_URL%%/functions/v1',

  // 환경 구분
  ENVIRONMENT: '%%ENVIRONMENT%%' // development, staging, production
};

// 개발 모드 감지 (localhost에서 실행 시)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.warn('🔧 Development mode detected');

  // 개발 환경에서는 실제 값 사용 (로컬 테스트용)
  // ⚠️ 프로덕션 빌드에서는 이 블록이 실행되지 않습니다
  window.APP_CONFIG = {
    SUPABASE_URL: 'https://iwpgvdtfpwazzfeniusk.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_DEV_ANON_KEY_HERE', // 개발용 키로 교체
    ADMIN_SECRET: 'YOUR_DEV_ADMIN_SECRET_HERE',
    FUNCTIONS_BASE_URL: 'https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1',
    ENVIRONMENT: 'development'
  };
}
