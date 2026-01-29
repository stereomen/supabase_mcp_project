import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

def upload_json_to_supabase():
    """
    merged_ad_tideData.json 파일의 데이터를 Supabase의 tide_data 테이블에 업로드합니다.
    """
    # .env 파일에서 환경 변수 로드
    dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(dotenv_path=dotenv_path)

    # Supabase 클라이언트 초기화
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("오류: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.")
        print("프로젝트 루트에 .env 파일이 있는지, 해당 변수가 올바르게 설정되었는지 확인하세요.")
        return

    supabase: Client = create_client(url, key)

    table_name = "tide_data"
    json_file_path = "merged_2026_tideData.json"

    # JSON 파일 읽기 및 데이터 업로드
    try:
        with open(json_file_path, mode='r', encoding='utf-8') as f:
            data = json.load(f)

        data_to_upload = []

        # JSON 데이터 파싱
        for location_obj in data:
            location_code = location_obj.get('location', {}).get('code')
            location_name = location_obj.get('location', {}).get('name')

            for tide_entry in location_obj.get('tideData', []):
                obs_date = tide_entry.get('date')
                tide_data = tide_entry.get('data', {})

                # 테이블 구조에 맞게 데이터 변환
                row = {
                    'obs_date': obs_date,
                    'obs_post_name': tide_data.get('obsPostName'),
                    'location_code': location_code,
                    'location_name': location_name,
                    'obs_lon': tide_data.get('obsLon'),
                    'obs_lat': tide_data.get('obsLat'),
                    'lvl1': tide_data.get('lvl1'),
                    'lvl2': tide_data.get('lvl2'),
                    'lvl3': tide_data.get('lvl3'),
                    'lvl4': tide_data.get('lvl4'),
                    'date_sun': tide_data.get('dateSun'),
                    'date_moon': tide_data.get('dateMoon'),
                    'mool_normal': tide_data.get('moolNormal'),
                    'mool7': tide_data.get('mool7'),
                    'mool8': tide_data.get('mool8')
                }

                data_to_upload.append(row)

        # 중복 제거: 같은 obs_date + location_code 조합이 여러 개 있으면 마지막 것만 유지
        unique_data = {}
        for row in data_to_upload:
            key = (row['obs_date'], row['location_code'])
            unique_data[key] = row  # 같은 키면 덮어씀 (마지막 것이 유지됨)

        data_to_upload = list(unique_data.values())

        # Supabase에 데이터 upsert (배치 처리)
        if data_to_upload:
            print(f"총 {len(data_to_upload)}개의 데이터를 '{table_name}' 테이블에 업로드합니다...")

            # 대량 데이터는 배치로 나눠서 업로드 (1000개씩)
            batch_size = 1000
            total_batches = (len(data_to_upload) + batch_size - 1) // batch_size

            for i in range(0, len(data_to_upload), batch_size):
                batch = data_to_upload[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                print(f"배치 {batch_num}/{total_batches} 업로드 중... ({len(batch)}개)")

                response = supabase.table(table_name).upsert(batch, on_conflict='obs_date,location_code').execute()

                if response.data:
                    print(f"  ✓ 배치 {batch_num} 업로드 완료")
                else:
                    print(f"  ✗ 배치 {batch_num} 업로드 중 오류 발생")
                    print(response)

            print("\n모든 데이터 업로드가 완료되었습니다.")
        else:
            print("업로드할 데이터가 없습니다.")

    except FileNotFoundError:
        print(f"오류: '{json_file_path}' 파일을 찾을 수 없습니다.")
        print(f"현재 경로: {os.getcwd()}")
    except json.JSONDecodeError as e:
        print(f"JSON 파싱 오류: {e}")
    except Exception as e:
        print(f"작업 중 오류가 발생했습니다: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    upload_json_to_supabase()
