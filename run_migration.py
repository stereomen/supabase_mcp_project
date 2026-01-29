#!/usr/bin/env python3
"""
광고 시스템 마이그레이션 실행 스크립트
Supabase Management API를 사용하여 SQL을 실행합니다
"""
import os
import requests

# Supabase 프로젝트 정보
PROJECT_REF = 'iwpgvdtfpwazzfeniusk'
SUPABASE_URL = 'https://iwpgvdtfpwazzfeniusk.supabase.co'
SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cGd2ZHRmcHdhenpmZW5pdXNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA3MTM5NCwiZXhwIjoyMDY2NjQ3Mzk0fQ.DNYEYOBWemhE5sg5eZYd3PrRAq_W04nCBmuJdGSjIIc'

# SQL 파일 읽기
with open('apply_all_migrations.sql', 'r', encoding='utf-8') as f:
    migration_sql = f.read()

print("🚀 광고 시스템 마이그레이션 시작...")
print(f"📝 SQL 파일 크기: {len(migration_sql)} bytes")
print()

# SQL을 개별 문장으로 분리
statements = []
current_statement = []
in_function = False

for line in migration_sql.split('\n'):
    stripped = line.strip()

    # 주석이나 빈 줄 건너뛰기
    if not stripped or stripped.startswith('--'):
        continue

    current_statement.append(line)

    # 함수 정의 시작/종료 추적
    if 'CREATE OR REPLACE FUNCTION' in line or 'CREATE FUNCTION' in line:
        in_function = True
    elif in_function and '$$' in line and 'LANGUAGE' in line:
        in_function = False
        # 함수 정의 완료
        statements.append('\n'.join(current_statement))
        current_statement = []
        continue

    # 일반 문장 종료 (함수 내부가 아닐 때만)
    if not in_function and stripped.endswith(';'):
        statements.append('\n'.join(current_statement))
        current_statement = []

# 마지막 문장 추가
if current_statement:
    statements.append('\n'.join(current_statement))

print(f"📊 총 {len(statements)}개의 SQL 문장으로 분리됨")
print()

# Supabase REST API를 통한 실행
success_count = 0
error_count = 0

for i, statement in enumerate(statements, 1):
    stmt_preview = statement.strip()[:100].replace('\n', ' ')
    print(f"[{i}/{len(statements)}] 실행 중: {stmt_preview}...")

    try:
        # PostgREST를 통한 RPC 호출은 제한적이므로
        # 대신 Supabase client를 통해 실행할 수 있는지 확인

        # 실제로는 Management API나 직접 PostgreSQL 연결이 필요
        print(f"  ⚠️  REST API로는 DDL 실행 불가")
        error_count += 1

    except Exception as e:
        print(f"  ✗ 오류: {e}")
        error_count += 1

print()
print("=" * 60)
print("❌ Python 스크립트로는 DDL 실행이 제한됩니다")
print()
print("✅ 해결 방법:")
print("   1. Supabase SQL Editor 열기:")
print("      https://supabase.com/dashboard/project/iwpgvdtfpwazzfeniusk/sql")
print()
print("   2. apply_all_migrations.sql 파일 내용 복사")
print()
print("   3. SQL Editor에 붙여넣고 실행")
print("=" * 60)
