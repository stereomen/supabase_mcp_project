import csv
import math
import os

def calculate_distance(lat1, lon1, lat2, lon2):
    """두 지점 간의 유클리드 거리를 계산합니다."""
    if not all(isinstance(coord, (int, float)) for coord in [lat1, lon1, lat2, lon2]):
        return float('inf')
    return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)

def load_abs_stations(filename):
    """
    주어진 CSV 파일에서 ABS 관측소 정보를 로드합니다.
    '제공 정보' 컬럼의 값을 파싱하여 '+'로 연결된 단일 문자열로 만듭니다.
    """
    stations = []
    if not os.path.exists(filename):
        print(f"오류: '{filename}' 파일을 찾을 수 없습니다.")
        return stations
        
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    row['lat_float'] = float(row['위도(LAT)'])
                    row['lon_float'] = float(row['경도(LON)'])
                    
                    info_str = row.get('제공 정보', '')
                    if info_str:
                        info_parts = [item.strip() for item in info_str.split(',') if item.strip()]
                        row['제공 정보'] = '+'.join(info_parts)
                    
                    stations.append(row)

                except (ValueError, KeyError) as e:
                    print(f"경고: '{filename}' 파일의 행을 건너뜁니다. 누락/잘못된 데이터: {row}, 오류: {e}")
    except Exception as e:
        print(f"오류: '{filename}' 파일 처리 중 예외 발생: {e}")
    
    return stations

def find_closest_station_and_merge_new():
    """
    tidedata 파일의 각 지역에 대해 abs_region_data_a.csv와 abs_region_data_b.csv에서
    가장 가까운 지역을 각각 찾아 정보를 병합합니다. (b_지역명(한글) 추가)
    """
    # 파일 경로를 스크립트 위치 기준으로 상대 경로 설정
    script_dir = os.path.dirname(__file__)
    tide_info_file = os.path.join(script_dir, 'tidedata-station_info_rows.csv')
    abs_info_file_a = os.path.join(script_dir, 'abs_region_data_a.csv')
    abs_info_file_b = os.path.join(script_dir, 'abs_region_data_b.csv')
    output_file = os.path.join(script_dir, 'tide-abs_info_ab_new.csv')

    abs_stations_a = load_abs_stations(abs_info_file_a)
    abs_stations_b = load_abs_stations(abs_info_file_b)

    if not abs_stations_a or not abs_stations_b:
        print("오류: ABS 관측소 데이터 파일 중 하나 이상을 로드할 수 없거나 비어있습니다.")
        return

    results = []
    original_fieldnames = []
    if not os.path.exists(tide_info_file):
        print(f"오류: '{tide_info_file}' 파일을 찾을 수 없습니다.")
        return

    with open(tide_info_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        original_fieldnames = reader.fieldnames or []

        for tide_row in reader:
            try:
                tide_lat = float(tide_row['Latitude'])
                tide_lon = float(tide_row['Longitude'])

                closest_a = min(abs_stations_a, key=lambda s: calculate_distance(tide_lat, tide_lon, s['lat_float'], s['lon_float']))
                closest_b = min(abs_stations_b, key=lambda s: calculate_distance(tide_lat, tide_lon, s['lat_float'], s['lon_float']))

                tide_row['a_지역명(한글)'] = closest_a.get('지역명(한글)', '')
                tide_row['a_STN ID'] = closest_a.get('STN ID', '')
                tide_row['a_위도(LAT)'] = closest_a.get('위도(LAT)', '')
                tide_row['a_경도(LON)'] = closest_a.get('경도(LON)', '')
                tide_row['a_제공 정보'] = closest_a.get('제공 정보', '')

                tide_row['b_지역명(한글)'] = closest_b.get('지역명(한글)', '')
                tide_row['b_STN ID'] = closest_b.get('STN ID', '')
                tide_row['b_위도(LAT)'] = closest_b.get('위도(LAT)', '')
                tide_row['b_경도(LON)'] = closest_b.get('경도(LON)', '')
                tide_row['b_제공 정보'] = closest_b.get('제공 정보', '')
                
                results.append(tide_row)

            except (ValueError, KeyError) as e:
                print(f"경고: '{tide_info_file}' 파일의 행을 건너뜁니다. 누락/잘못된 데이터: {tide_row}, 오류: {e}")
                results.append(tide_row)

    if not results:
        print("결과 데이터가 없습니다.")
        return
        
    new_fieldnames_a = ['a_지역명(한글)', 'a_STN ID', 'a_위도(LAT)', 'a_경도(LON)', 'a_제공 정보']
    new_fieldnames_b = ['b_지역명(한글)', 'b_STN ID', 'b_위도(LAT)', 'b_경도(LON)', 'b_제공 정보']
    
    output_fieldnames = original_fieldnames + \
                        [fn for fn in new_fieldnames_a if fn not in original_fieldnames] + \
                        [fn for fn in new_fieldnames_b if fn not in original_fieldnames]

    try:
        with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=output_fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(results)
        print(f"성공적으로 '{os.path.basename(output_file)}' 파일을 생성했습니다.")
    except IOError as e:
        print(f"오류: '{os.path.basename(output_file)}' 파일에 쓸 수 없습니다. 오류: {e}")

if __name__ == "__main__":
    find_closest_station_and_merge_new()
