import os
import csv
from dotenv import load_dotenv
from supabase import create_client, Client

def upload_new_csv_to_supabase():
    """
    tide-abs_info_ab_new.csv 파일의 데이터를 Supabase의 tide_abs_region 테이블에 업로드합니다.
    """
    # .env 파일에서 환경 변수 로드
    # 이 스크립트 파일이 있는 폴더의 상위 폴더(프로젝트 루트)에서 .env를 찾습니다.
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

    table_name = "tide_abs_region"
    # 스크립트와 동일한 디렉토리에 있는 CSV 파일을 대상으로 경로를 설정합니다.
    script_dir = os.path.dirname(__file__)
    csv_file_path = os.path.join(script_dir, "tide-abs_info_ab_new.csv")

    # CSV 파일 읽기 및 데이터 업로드
    try:
        with open(csv_file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            data_to_upload = []
            
            for row in reader:
                # BOM이 있는 경우 컬럼명에서 제거
                cleaned_row = {}
                for key, value in row.items():
                    clean_key = key.lstrip('\ufeff')
                    cleaned_row[clean_key] = value
                row = cleaned_row

                # 테이블에 없는 컬럼 제거 (필요 시)
                columns_to_remove = ['AddressA', 'AddressB', 'AddressC', 'marine_reg_name']
                for col in columns_to_remove:
                    row.pop(col, None)

                # 숫자 필드에 대해 빈 문자열을 None으로 변환
                for field in ["Latitude", "Longitude", "a_위도(LAT)", "a_경도(LON)", "b_위도(LAT)", "b_경도(LON)"]:
                    if row.get(field) == '':
                        row[field] = None

                data_to_upload.append(row)

            # Supabase에 데이터 upsert (일괄 처리)
            if data_to_upload:
                print(f"{len(data_to_upload)}개의 데이터를 '{table_name}' 테이블에 업로드합니다...")
                response = supabase.table(table_name).upsert(data_to_upload).execute()
                
                # API 응답에 에러가 있는지 확인
                if response.data:
                     print("데이터 업로드가 성공적으로 완료되었습니다.")
                else:
                    print("데이터 업로드 중 오류가 발생했을 수 있습니다. 응답을 확인하세요.")
                    print(response)

            else:
                print("업로드할 데이터가 없습니다.")

    except FileNotFoundError:
        print(f"오류: '{csv_file_path}' 파일을 찾을 수 없습니다.")
    except Exception as e:
        print(f"작업 중 오류가 발생했습니다: {e}")

if __name__ == "__main__":
    upload_new_csv_to_supabase()
