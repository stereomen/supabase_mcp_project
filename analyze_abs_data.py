import csv
import sys

def analyze_abs_data_from_api_file():
    """
    abs_api.info 파일 하나만 분석하여 각 지역별로 제공되는 데이터와
    미제공되는 데이터를 요약하고, 위도/경도 정보를 포함하여 CSV 파일로 저장합니다.
    """
    # --- 1. 관측 데이터 분석 ---
    station_data = {}
    # 분석할 모든 데이터 필드의 이름을 미리 정의합니다.
    ALL_DATA_FIELDS = {
        'WH(유의파고)', 'WD(풍향)', 'WS(풍속)', 'WS_GST(GUST풍속)',
        'TW(해수면온도)', 'TA(기온)', 'PA(해면기압)', 'HM(상대습도)'
    }

    try:
        with open('abs_api.info', 'r', encoding='utf-8') as f:
            for line in f:
                # 주석이나 빈 줄은 건너뜁니다.
                if line.strip() and not line.startswith('#') and not line.startswith('TM'):
                    # 데이터 형식: TP,TM,STN_ID,STN_KO,LON,LAT,WH,WD,WS,WS_GST,TW,TA,PA,HM,...
                    parts = [p.strip() for p in line.strip().split(',')]

                    # 최소 14개 필드(HM까지)가 있는지 확인하여 데이터 무결성을 보장합니다.
                    if len(parts) >= 14:
                        tp = parts[0]
                        stn_id = parts[2]

                        # 새로운 관측소 ID인 경우, 기본 정보를 저장합니다.
                        if stn_id not in station_data:
                            station_data[stn_id] = {
                                'name_ko': parts[3],
                                'lon': parts[4],
                                'lat': parts[5],
                                'type': tp,
                                'provided_fields': set()  # 제공된 필드를 저장할 집합
                            }

                        # 데이터 필드와 Null 값 정의 (올바른 인덱스로 수정됨)
                        data_fields_values = {
                            'WH(유의파고)': (parts[6], '-99.0'),
                            'WD(풍향)': (parts[7], '-99'),
                            'WS(풍속)': (parts[8], '-99.0'),
                            'WS_GST(GUST풍속)': (parts[9], '-99.0'),
                            'TW(해수면온도)': (parts[10], '-99.0'),
                            'TA(기온)': (parts[11], '-99.0'),
                            'PA(해면기압)': (parts[12], '-99.0'),
                            'HM(상대습도)': (parts[13], '-99.0')
                        }

                        # 값이 유효한(Null이 아닌) 경우, 'provided_fields' 집합에 추가합니다.
                        for field_name, (value, null_value) in data_fields_values.items():
                            if value != null_value:
                                station_data[stn_id]['provided_fields'].add(field_name)

    except FileNotFoundError:
        print("오류: 'abs_api.info' 파일을 찾을 수 없습니다. 스크립트와 동일한 위치에 파일이 있는지 확인하세요.")
        sys.exit(1)

    # --- 2. CSV 파일로 저장 ---
    output_filename = 'abs_region_data_summary.csv'
    try:
        with open(output_filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
            # 새로운 조합 컬럼이 추가되었습니다.
            fieldnames = [
                '지역명(한글)', 'STN ID', '위도(LAT)', '경도(LON)', '관측종류',
                '제공 정보', '해수면온도+유의파고', '기온+풍향+풍속', '미제공 정보'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for stn_id, data in station_data.items():
                provided_fields = data['provided_fields']

                # 조합 컬럼 값 계산
                combo_a = 'a' if {'TW(해수면온도)', 'WH(유의파고)'}.issubset(provided_fields) else ''
                combo_b = 'b' if {'TA(기온)', 'WD(풍향)', 'WS(풍속)'}.issubset(provided_fields) else ''

                # 제공/미제공 정보 리스트 계산
                provided = sorted(list(provided_fields))
                not_provided = sorted(list(ALL_DATA_FIELDS - provided_fields))

                writer.writerow({
                    '지역명(한글)': data['name_ko'],
                    'STN ID': stn_id,
                    '위도(LAT)': data['lat'],
                    '경도(LON)': data['lon'],
                    '관측종류': data['type'],
                    '제공 정보': ', '.join(provided),
                    '해수면온도+유의파고': combo_a,
                    '기온+풍향+풍속': combo_b,
                    '미제공 정보': ', '.join(not_provided)
                })
        print(f"분석 완료: {len(station_data)}개 지역의 데이터가 '{output_filename}' 파일로 저장되었습니다.")
    except IOError:
        print(f"오류: '{output_filename}' 파일에 쓸 수 없습니다.")
        sys.exit(1)

if __name__ == "__main__":
    analyze_abs_data_from_api_file()
