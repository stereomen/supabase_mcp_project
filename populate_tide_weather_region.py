import os
import re
from dotenv import load_dotenv
from supabase import create_client, Client

def populate_tide_weather_region():
    """
    locations.ts 파일의 데이터를 Supabase의 tide_weather_region 테이블에 업로드합니다.
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
    locations_file_path = "supabase/functions/get-kma-weather/locations.ts"

    # locations.ts 파일 읽기 및 데이터 파싱
    locations_data = []
    try:
        with open(locations_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # export const locations: Location[] = [ ... ]; 부분만 추출
            match = re.search(r'export const locations: Location\[\] = \[(.*?)\];', content, re.DOTALL)
            if match:
                locations_str = match.group(1)
                # 각 location 객체 파싱
                # JSON.parse를 사용하기 위해 문자열을 유효한 JSON 배열로 변환
                # 예: { code: "SO_0326", name: "미조항", ... } -> { "code": "SO_0326", "name": "미조항", ... }
                locations_str = locations_str.replace('code:', '"code":')
                locations_str = locations_str.replace('name:', '"name":')
                locations_str = locations_str.replace('latitude:', '"latitude":')
                locations_str = locations_str.replace('longitude:', '"longitude":')
                locations_str = locations_str.replace('nx:', '"nx":')
                locations_str = locations_str.replace('ny:', '"ny":')
                
                # 마지막 쉼표 제거 (JSON 파싱 오류 방지)
                locations_str = re.sub(r',\s*$', '', locations_str.strip())
                
                # 배열 형태로 만들기
                locations_json_str = f'[{locations_str}]'
                
                # JSON 파싱
                locations_data = eval(locations_json_str) # eval 사용 시 주의: 신뢰할 수 있는 소스에서만 사용

    except FileNotFoundError:
        print(f"오류: '{locations_file_path}' 파일을 찾을 수 없습니다.")
        return
    except Exception as e:
        print(f"오류: locations.ts 파일 파싱 중 오류가 발생했습니다: {e}")
        return

    # Supabase에 데이터 upsert
    if locations_data:
        data_to_upload = []
        for loc in locations_data:
            # 필요한 컬럼만 추출하여 삽입
            data_to_upload.append({
                "code": loc.get("code"),
                "nx": loc.get("nx"),
                "ny": loc.get("ny"),
                "name": loc.get("name")
            })

        print(f"{len(data_to_upload)}개의 지역 데이터를 '{table_name}' 테이블에 업로드합니다...")
        try:
            response = supabase.table(table_name).upsert(data_to_upload, on_conflict='code').execute()
            
            if response.data:
                print("데이터 업로드가 성공적으로 완료되었습니다.")
            else:
                print("데이터 업로드 중 오류가 발생했을 수 있습니다. 응답을 확인하세요.")
                print(response)
        except Exception as e:
            print(f"Supabase 업로드 중 오류가 발생했습니다: {e}")
    else:
        print("업로드할 지역 데이터가 없습니다.")

if __name__ == "__main__":
    populate_tide_weather_region()
