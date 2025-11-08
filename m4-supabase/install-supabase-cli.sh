#!/bin/bash

# Supabase CLI 설치 스크립트 (M4 맥미니 + Docker 환경용)
# 사용법: ./install-supabase-cli.sh

set -e

echo "🚀 M4 맥미니 Docker 환경용 Supabase CLI 설치 시작..."

# 1. 시스템 아키텍처 확인
ARCH=$(uname -m)
echo "📋 시스템 아키텍처: $ARCH"

if [ "$ARCH" != "aarch64" ]; then
    echo "⚠️  경고: 이 스크립트는 ARM64 (aarch64) 아키텍처용입니다."
    echo "현재 아키텍처: $ARCH"
    read -p "계속 진행하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 설치를 취소했습니다."
        exit 1
    fi
fi

# 2. 기존 설치 확인
if [ -f "/tmp/supabase" ]; then
    echo "📦 기존 Supabase CLI 발견됨"
    CURRENT_VERSION=$(/tmp/supabase --version 2>/dev/null || echo "unknown")
    echo "현재 버전: $CURRENT_VERSION"
    read -p "다시 설치하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ 기존 설치를 유지합니다."
        exit 0
    fi
fi

# 3. 다운로드 및 설치
echo "⬇️  ARM64 바이너리 다운로드 중..."
curl -sSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_arm64.tar.gz | tar -xz -C /tmp

# 4. 실행 권한 부여
chmod +x /tmp/supabase

# 5. 전역 설치 (권장)
echo "🌐 전역 설치 중..."
if sudo cp /tmp/supabase /usr/local/bin/supabase; then
    VERSION=$(supabase --version)
    echo "✅ Supabase CLI 전역 설치 완료!"
    echo "📍 설치 위치: /usr/local/bin/supabase"
    echo "🔢 버전: $VERSION"
    echo ""
    echo "🚀 바로 사용 가능:"
    echo "   supabase --version"
    echo "   supabase functions deploy FUNCTION_NAME --project-ref PROJECT_ID --no-verify-jwt"
else
    echo "⚠️  전역 설치 실패, 임시 설치로 진행..."
    if [ -f "/tmp/supabase" ]; then
        VERSION=$(/tmp/supabase --version)
        echo "✅ Supabase CLI 임시 설치 완료!"
        echo "📍 설치 위치: /tmp/supabase"
        echo "🔢 버전: $VERSION"
        echo ""
        echo "📝 사용하려면 PATH를 설정하세요:"
        echo "   export PATH=\"/tmp:\$PATH\""
        echo ""
        echo "🔄 매 세션마다 PATH 설정이 필요합니다."
    else
        echo "❌ 설치 실패"
        exit 1
    fi
fi

# 6. 액세스 토큰 설정 안내
echo ""
echo "🔐 액세스 토큰 설정:"
echo "   1. https://supabase.com/dashboard/account/tokens 접속"
echo "   2. Generate new token 클릭"
echo "   3. export SUPABASE_ACCESS_TOKEN=\"sbp_your_token_here\""
echo ""
echo "💡 영구 설정: ~/.bashrc에 토큰 추가 권장"