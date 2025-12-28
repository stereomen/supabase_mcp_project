#!/bin/bash
# Netlify 빌드 시 환경 변수를 config.js에 주입하는 스크립트

# 이 스크립트는 Netlify 빌드 설정에서 실행됩니다
# netlify.toml 파일의 [build] 섹션에 추가:
#   command = "bash build-config.sh"

set -e

echo "🔧 Generating config.js from environment variables..."

# 템플릿 파일 읽기
TEMPLATE_FILE="config.template.js"
OUTPUT_FILE="config.js"

# 환경 변수가 설정되어 있는지 확인
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ ERROR: Required environment variables not set!"
  echo "   Please set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify"
  exit 1
fi

# 템플릿에서 config.js 생성
sed -e "s|%%SUPABASE_URL%%|${SUPABASE_URL}|g" \
    -e "s|%%SUPABASE_ANON_KEY%%|${SUPABASE_ANON_KEY}|g" \
    -e "s|%%ADMIN_SECRET%%|${ADMIN_SECRET:-}|g" \
    -e "s|%%ENVIRONMENT%%|${ENVIRONMENT:-production}|g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo "✅ config.js generated successfully"

# HTML 파일들에 config.js 로드 추가 확인
echo "📝 Verifying config.js references in HTML files..."

# 모든 HTML 파일에서 하드코딩된 키 검색
if grep -r "const SUPABASE_URL = 'https://" *.html 2>/dev/null; then
  echo "⚠️  WARNING: Found hardcoded Supabase URLs in HTML files!"
  echo "   Please update HTML files to use config.js instead"
fi

echo "🎉 Build configuration complete!"
