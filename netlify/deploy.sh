#!/bin/bash

# Netlify 배포 스크립트
# 사용법: ./deploy.sh [production|staging]

set -e  # 에러 발생 시 스크립트 중단

DEPLOY_TYPE=${1:-staging}  # 기본값: staging

echo "🚀 Firebase Admin UI Netlify 배포 시작"
echo "📦 배포 타입: $DEPLOY_TYPE"
echo ""

# Netlify CLI 설치 확인
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI가 설치되지 않았습니다."
    echo "다음 명령어로 설치하세요: npm install -g netlify-cli"
    exit 1
fi

# 현재 디렉토리 확인
if [ ! -f "index.html" ]; then
    echo "❌ index.html이 없습니다. netlify 디렉토리에서 실행하세요."
    exit 1
fi

echo "✅ 필수 파일 확인 완료"
echo ""

# 배포 전 파일 목록 출력
echo "📋 배포할 파일 목록:"
ls -lh *.html 2>/dev/null || echo "  - HTML 파일 없음"
echo ""

# 배포 실행
if [ "$DEPLOY_TYPE" = "production" ] || [ "$DEPLOY_TYPE" = "prod" ]; then
    echo "🌟 프로덕션 배포 시작..."
    netlify deploy --prod
    echo ""
    echo "✅ 프로덕션 배포 완료!"
else
    echo "🧪 스테이징 배포 시작..."
    netlify deploy
    echo ""
    echo "✅ 스테이징 배포 완료!"
    echo "ℹ️  프로덕션 배포를 원하시면 './deploy.sh production'을 실행하세요."
fi

echo ""
echo "🎉 배포가 성공적으로 완료되었습니다!"
