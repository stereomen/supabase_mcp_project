"""
조석관측소와 해양관측소 매칭 스크립트
- 입력: locations_with_addresses.xml, a지점 CSV, b지점 CSV
- 출력: 조석관측소별 가까운 해양관측소 10개 매칭 JSON
"""

import xml.etree.ElementTree as ET
import csv
import json
import math
from typing import Dict, List, Tuple

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    두 지점 간의 거리를 계산 (단위: km)
    Haversine formula 사용
    """
    R = 6371  # 지구 반지름 (km)

    # 라디안으로 변환
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    # Haversine formula
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    return R * c

def load_tide_stations(xml_path: str) -> List[Dict]:
    """조석관측소 목록 로드"""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    stations = []
    for location in root.findall('Location'):
        code = location.find('Code').text
        name = location.find('Name').text
        lat = float(location.find('Latitude').text)
        lon = float(location.find('Longitude').text)
        marine_reg = location.find('marine_reg_name').text

        stations.append({
            'code': code,
            'name': name,
            'lat': lat,
            'lon': lon,
            'marine_reg_name': marine_reg
        })

    return stations

def load_marine_stations(a_csv_path: str, b_csv_path: str) -> Dict[str, Dict]:
    """해양관측소 목록 로드 (중복 제거)"""
    marine_stations = {}

    # a지점 (파고, 수온) 로드
    with open(a_csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            station_id = row['a_STN ID']
            if station_id not in marine_stations:
                marine_stations[station_id] = {
                    'station_id': station_id,
                    'name': row['a_지역명(한글)'],
                    'lat': float(row['a_위도(LAT)']),
                    'lon': float(row['a_경도(LON)']),
                    'provides': []
                }
            marine_stations[station_id]['provides'].extend(['wt', 'swh'])  # 수온, 파고

    # b지점 (기온, 풍향, 풍속) 로드
    with open(b_csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            station_id = row['b_STN ID']
            if station_id not in marine_stations:
                marine_stations[station_id] = {
                    'station_id': station_id,
                    'name': row['b_지역명(한글)'],
                    'lat': float(row['b_위도(LAT)']),
                    'lon': float(row['b_경도(LON)']),
                    'provides': []
                }
            marine_stations[station_id]['provides'].extend(['at', 'wd', 'ws'])  # 기온, 풍향, 풍속

    # 중복 제거
    for station_id, station in marine_stations.items():
        station['provides'] = list(set(station['provides']))

    return marine_stations

def match_stations(tide_stations: List[Dict], marine_stations: Dict[str, Dict], top_n: int = 10) -> Dict:
    """
    각 조석관측소별 가까운 해양관측소 top_n개 매칭
    """
    matching_result = {}

    for tide_station in tide_stations:
        tide_code = tide_station['code']
        tide_lat = tide_station['lat']
        tide_lon = tide_station['lon']

        # 모든 해양관측소와의 거리 계산
        distances = []
        for marine_id, marine_station in marine_stations.items():
            distance = haversine_distance(
                tide_lat, tide_lon,
                marine_station['lat'], marine_station['lon']
            )
            distances.append({
                'station_id': marine_id,
                'name': marine_station['name'],
                'distance_km': round(distance, 2),
                'lat': marine_station['lat'],
                'lon': marine_station['lon'],
                'provides': marine_station['provides']
            })

        # 거리순 정렬
        distances.sort(key=lambda x: x['distance_km'])

        # 상위 top_n개 선택
        matching_result[tide_code] = {
            'tide_station_name': tide_station['name'],
            'tide_station_lat': tide_lat,
            'tide_station_lon': tide_lon,
            'marine_reg_name': tide_station['marine_reg_name'],
            'nearest_marine_stations': distances[:top_n]
        }

    return matching_result

def main():
    # 파일 경로
    xml_path = 'tide_abs_info/locations_with_addresses.xml'
    a_csv_path = 'tide_abs_info/a지점_파고수온제공_2026-01-10_2026-01-17.csv'
    b_csv_path = 'tide_abs_info/b지점_기온풍향풍속제공_2026-01-10_2026-01-17.csv'
    output_path = 'tide_abs_info/station_matching_top5.json'

    print("📍 조석관측소 로딩 중...")
    tide_stations = load_tide_stations(xml_path)
    print(f"   ✅ {len(tide_stations)}개 조석관측소 로드 완료")

    print("\n🌊 해양관측소 로딩 중...")
    marine_stations = load_marine_stations(a_csv_path, b_csv_path)
    print(f"   ✅ {len(marine_stations)}개 해양관측소 로드 완료 (중복 제거)")

    print("\n🔗 거리 계산 및 매칭 수행 중...")
    matching_result = match_stations(tide_stations, marine_stations, top_n=5)
    print(f"   ✅ {len(matching_result)}개 조석관측소 매칭 완료")

    # JSON 파일로 저장
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(matching_result, f, ensure_ascii=False, indent=2)

    print(f"\n💾 결과 저장: {output_path}")

    # 샘플 출력
    print("\n📊 샘플 결과 (첫 2개 조석관측소):")
    for i, (tide_code, data) in enumerate(list(matching_result.items())[:2]):
        print(f"\n{i+1}. {tide_code} ({data['tide_station_name']})")
        print(f"   위치: {data['tide_station_lat']}, {data['tide_station_lon']}")
        print(f"   가까운 해양관측소 상위 3개:")
        for j, marine in enumerate(data['nearest_marine_stations'][:3]):
            provides_str = ', '.join(marine['provides'])
            print(f"      {j+1}. {marine['name']} ({marine['station_id']}) - {marine['distance_km']}km")
            print(f"         제공: {provides_str}")

if __name__ == '__main__':
    main()
