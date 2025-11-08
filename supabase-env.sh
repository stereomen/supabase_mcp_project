#!/bin/bash
# Supabase 환경 설정 스크립트
export PATH="/tmp:$PATH"
export SUPABASE_ACCESS_TOKEN="sbp_fb25002336680aa8aa56206440e28ecec0704017"

echo "✅ Supabase 환경 변수 설정 완료"
echo "PATH: $PATH"
echo "토큰: ${SUPABASE_ACCESS_TOKEN:0:10}..."
echo ""
echo "사용법:"
echo "  source ./supabase-env.sh"
echo "  supabase --version"
echo "  ./deploy.sh FUNCTION_NAME"