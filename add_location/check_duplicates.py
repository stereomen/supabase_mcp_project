import os
from dotenv import load_dotenv
from supabase import create_client, Client

# .env 파일에서 환경 변수 로드
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

# Supabase 클라이언트 초기화
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

print("=" * 80)
print("tide_data 테이블 중복 데이터 확인")
print("=" * 80)

# 전체 레코드 수
total_result = supabase.table('tide_data').select('*', count='exact').limit(1).execute()
total_count = total_result.count

print(f"\n📊 전체 레코드 수: {total_count:,}개")

# 중복 검사용 데이터 조회 (샘플)
print("\n🔍 중복 데이터 검사 중...")
all_data = supabase.table('tide_data').select('id, obs_date, location_code').limit(10000).execute()

# 중복 찾기
from collections import defaultdict
date_location_map = defaultdict(list)

for record in all_data.data:
    key = (record['obs_date'], record['location_code'])
    date_location_map[key].append(record['id'])

# 중복 카운트
duplicates = {k: v for k, v in date_location_map.items() if len(v) > 1}

print(f"\n📋 중복 그룹 수: {len(duplicates):,}개")

if duplicates:
    print(f"\n⚠️  중복 데이터가 발견되었습니다!")
    print(f"   총 중복 레코드 수: {sum(len(v) - 1 for v in duplicates.values()):,}개 (삭제될 예정)")
    print(f"   유지될 레코드 수: {len(duplicates):,}개")

    print(f"\n중복 예시 (최대 5개):")
    for i, ((date, code), ids) in enumerate(list(duplicates.items())[:5], 1):
        print(f"\n   [{i}] 날짜={date}, 지역={code}")
        print(f"       중복 ID: {ids}")
        print(f"       → 유지: id={max(ids)} (최신)")
        print(f"       → 삭제: {[id for id in ids if id != max(ids)]}")
else:
    print("\n✅ 중복 데이터가 없습니다!")
    print("   SQL을 실행해도 데이터가 삭제되지 않습니다.")

print("\n" + "=" * 80)
