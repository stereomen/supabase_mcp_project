import os
import csv
from dotenv import load_dotenv
from supabase import create_client, Client

def populate_tide_weather_region():
    """
    new_locations.csv 파일의 데이터를 Supabase의 tide_weather_region 테이블에 업로드합니다.
    """
    # .env 파일에서 환경 변수 로드
    load_dotenv()

    # Supabase 클라이언트 초기화
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("오류: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.")
        print("프로젝트 루트에 .env 파일이 있는지, 해당 변수가 올바르게 설정되었는지 확인하세요.")
        return

    supabase: Client = create_client(url, key)

    table_name = "tide_weather_region"
    csv_file_path = "new_locations.csv"

    # new_locations.csv 파일 읽기 및 데이터 파싱
    locations_data = []
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                locations_data.append({
                    "code": row["Code"],
                    "name": row["Name"],
                    "nx": int(row["nx"]) if row["nx"] else 0,
                    "ny": int(row["ny"]) if row["ny"] else 0
                })

    except FileNotFoundError:
        print(f"오류: '{csv_file_path}' 파일을 찾을 수 없습니다.")
        return
    except Exception as e:
        print(f"오류: new_locations.csv 파일 파싱 중 오류가 발생했습니다: {e}")
        return

    # Supabase에 데이터 upsert (nx, ny 컬럼만 업데이트)
    if locations_data:
        print(f"{len(locations_data)}개의 지역 데이터를 '{table_name}' 테이블에 업로드합니다...")
        try:
            # nx, ny 좌표만 업데이트 (다른 컬럼은 보존)
            for loc in locations_data:
                response = supabase.table(table_name).update({
                    "nx": loc["nx"],
                    "ny": loc["ny"]
                }).eq('code', loc["code"]).execute()
                
                if response.data:
                    print(f"✓ {loc['code']} ({loc['name']}) nx={loc['nx']}, ny={loc['ny']} 업데이트 완료")
                else:
                    print(f"✗ {loc['code']} ({loc['name']}) 업데이트 실패")
            
            print("모든 좌표 업데이트가 완료되었습니다.")
            
        except Exception as e:
            print(f"Supabase 업로드 중 오류가 발생했습니다: {e}")
    else:
        print("업로드할 지역 데이터가 없습니다.")

if __name__ == "__main__":
    populate_tide_weather_region()