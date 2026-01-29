"""
기상청 단기예보 격자 좌표(nx, ny)를 Supabase tide_weather_region 테이블에 업로드

Input: ./tidedata-nxny.csv
Output: Supabase tide_weather_region 테이블에 code, nx, ny, name 컬럼 업로드

환경 변수 필요:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
"""

import csv
import os
from supabase import create_client, Client

def main():
    # Supabase 클라이언트 초기화
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        print("오류: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.")
        return

    supabase: Client = create_client(supabase_url, supabase_key)
    print(f"Supabase 연결 성공: {supabase_url}")

    # CSV 파일 읽기
    input_file = './tidedata-nxny.csv'
    data_to_upload = []

    print(f"\nCSV 파일 읽는 중: {input_file}")
    with open(input_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)

        for row in reader:
            data_to_upload.append({
                'code': row['Code'],
                'nx': int(row['nx']),
                'ny': int(row['ny']),
                'name': row['Name']
            })

    print(f"총 {len(data_to_upload)}개의 데이터를 읽었습니다.")

    # 기존 데이터 삭제 (선택사항)
    print("\n기존 데이터를 삭제할까요? (y/n): ", end='')
    delete_existing = input().lower().strip()

    if delete_existing == 'y':
        print("기존 데이터 삭제 중...")
        try:
            supabase.table('tide_weather_region').delete().neq('code', '').execute()
            print("기존 데이터 삭제 완료")
        except Exception as e:
            print(f"기존 데이터 삭제 중 오류 (무시하고 계속): {e}")

    # 데이터 업로드 (upsert 사용)
    print("\n데이터 업로드 중...")
    batch_size = 50  # 한 번에 50개씩 업로드

    for i in range(0, len(data_to_upload), batch_size):
        batch = data_to_upload[i:i+batch_size]
        try:
            result = supabase.table('tide_weather_region').upsert(batch).execute()
            print(f"업로드 진행: {i+len(batch)}/{len(data_to_upload)} ({(i+len(batch))*100//len(data_to_upload)}%)")
        except Exception as e:
            print(f"배치 {i//batch_size + 1} 업로드 중 오류: {e}")
            # 개별로 시도
            for item in batch:
                try:
                    supabase.table('tide_weather_region').upsert(item).execute()
                    print(f"  - {item['code']} {item['name']} 업로드 성공")
                except Exception as e2:
                    print(f"  - {item['code']} {item['name']} 업로드 실패: {e2}")

    print(f"\n완료! 총 {len(data_to_upload)}개의 데이터를 tide_weather_region 테이블에 업로드했습니다.")

    # 업로드 결과 확인
    print("\n업로드된 데이터 샘플 확인 중...")
    try:
        result = supabase.table('tide_weather_region').select('code, name, nx, ny').limit(5).execute()
        print("\n업로드된 데이터 샘플:")
        for row in result.data:
            print(f"  - {row['code']} {row['name']}: nx={row['nx']}, ny={row['ny']}")
    except Exception as e:
        print(f"데이터 확인 중 오류: {e}")

if __name__ == "__main__":
    main()
