#!/bin/bash
# Supabase 함수 배포 스크립트

export PATH="/tmp:$PATH"
export SUPABASE_ACCESS_TOKEN="sbp_fb25002336680aa8aa56206440e28ecec0704017"

if [ -z "$1" ]; then
    echo "사용법: ./deploy.sh FUNCTION_NAME"
    echo "예시: ./deploy.sh get-medm-weather"
    exit 1
fi

FUNCTION_NAME=$1

echo "🚀 배포 중: $FUNCTION_NAME"
supabase functions deploy "$FUNCTION_NAME" --project-ref iwpgvdtfpwazzfeniusk --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ 배포 성공: $FUNCTION_NAME"
    echo "🔗 확인: https://supabase.com/dashboard/project/iwpgvdtfpwazzfeniusk/functions/$FUNCTION_NAME"
else
    echo "❌ 배포 실패: $FUNCTION_NAME"
fi