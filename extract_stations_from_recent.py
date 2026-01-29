#!/usr/bin/env python3
"""
최근 실제 관측 데이터에서 A지점과 B지점 해양관측소 목록 추출
"""

import csv

# A지점 추출 (파고, 수온)
a_stations = {}
with open('tide_abs_info/a지점_파고수온제공_2026-01-10_2026-01-17.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        station_id = row['a_STN ID'].strip()
        if station_id and station_id not in a_stations:
            a_stations[station_id] = {
                'name': row['a_지역명(한글)'].strip(),
                'id': station_id,
                'lat': float(row['a_위도(LAT)']),
                'lon': float(row['a_경도(LON)'])
            }

# B지점 추출 (기온, 풍향, 풍속)
b_stations = {}
with open('tide_abs_info/b지점_기온풍향풍속제공_2026-01-10_2026-01-17.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        station_id = row['b_STN ID'].strip()
        if station_id and station_id not in b_stations:
            b_stations[station_id] = {
                'name': row['b_지역명(한글)'].strip(),
                'id': station_id,
                'lat': float(row['b_위도(LAT)']),
                'lon': float(row['b_경도(LON)'])
            }

print("=" * 100)
print("A지점 목록 (파고, 수온 제공)")
print(f"총 {len(a_stations)}개 관측소")
print("=" * 100)
print("    // A지점 목록 (파고, 수온 제공) - 총 {}개 관측소".format(len(a_stations)))
print("    const A_STATIONS = [")
for station in sorted(a_stations.values(), key=lambda x: x['name']):
    print(f"        {{name: \"{station['name']}\", id: \"{station['id']}\", lat: {station['lat']}, lon: {station['lon']}}},")
print("    ];")

print("\n" + "=" * 100)
print("B지점 목록 (기온, 풍향, 풍속 제공)")
print(f"총 {len(b_stations)}개 관측소")
print("=" * 100)
print("    // B지점 목록 (기온, 풍향, 풍속 제공) - 총 {}개 관측소".format(len(b_stations)))
print("    const B_STATIONS = [")
for station in sorted(b_stations.values(), key=lambda x: x['name']):
    print(f"        {{name: \"{station['name']}\", id: \"{station['id']}\", lat: {station['lat']}, lon: {station['lon']}}},")
print("    ];")

# 22185가 있는지 확인
print("\n" + "=" * 100)
print("검증: 22185 관측소 존재 여부")
print("=" * 100)
if '22185' in a_stations:
    print(f"✓ A지점에 22185 존재: {a_stations['22185']}")
if '22185' in b_stations:
    print(f"✓ B지점에 22185 존재: {b_stations['22185']}")
if '22185' not in a_stations and '22185' not in b_stations:
    print("❌ 22185는 CSV 파일에 존재하지 않습니다!")
