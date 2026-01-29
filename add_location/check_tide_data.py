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
print("tide_data 테이블 데이터 확인")
print("=" * 80)

# 1. 전체 레코드 수 확인
count_result = supabase.table('tide_data').select('*', count='exact').limit(1).execute()
total_count = count_result.count
print(f"\n📊 전체 레코드 수: {total_count:,}개")

# 2. location_code별 그룹핑
locations = supabase.table('tide_data').select('location_code, location_name').limit(100).execute()
unique_locations = {}
for loc in locations.data:
    code = loc.get('location_code')
    name = loc.get('location_name')
    if code not in unique_locations:
        unique_locations[code] = name

print(f"\n📍 지역 수: {len(unique_locations)}개")
for i, (code, name) in enumerate(list(unique_locations.items())[:10], 1):
    print(f"   {i}. {code}: {name}")
if len(unique_locations) > 10:
    print(f"   ... 외 {len(unique_locations) - 10}개 지역")

# 3. 샘플 데이터 조회 (최근 3개)
print(f"\n📝 샘플 데이터 (최근 3개):")
sample = supabase.table('tide_data').select('*').order('id', desc=True).limit(3).execute()

for i, record in enumerate(sample.data, 1):
    print(f"\n   [{i}] ID: {record.get('id')}")
    print(f"       지역: {record.get('location_name')} ({record.get('location_code')})")
    print(f"       날짜: {record.get('obs_date')}")
    print(f"       관측소: {record.get('obs_post_name')}")
    print(f"       좌표: {record.get('obs_lat')}, {record.get('obs_lon')}")
    print(f"       만조/간조:")
    print(f"         - {record.get('lvl1')}")
    print(f"         - {record.get('lvl2')}")
    print(f"         - {record.get('lvl3')}")
    print(f"         - {record.get('lvl4')}")
    print(f"       물때: {record.get('mool_normal')} ({record.get('mool7')}/{record.get('mool8')})")

# 4. 날짜 범위 확인
date_range = supabase.table('tide_data').select('obs_date').order('obs_date', desc=False).limit(1).execute()
date_range_end = supabase.table('tide_data').select('obs_date').order('obs_date', desc=True).limit(1).execute()

if date_range.data and date_range_end.data:
    start_date = date_range.data[0].get('obs_date')
    end_date = date_range_end.data[0].get('obs_date')
    print(f"\n📅 날짜 범위: {start_date} ~ {end_date}")

print("\n" + "=" * 80)
print("✅ 데이터 확인 완료")
print("=" * 80)
