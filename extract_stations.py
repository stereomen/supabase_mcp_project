#!/usr/bin/env python3
"""
abs_list CSV에서 A지점과 B지점 해양관측소 목록을 추출하여
marine-station-analyzer.html의 JavaScript 배열 형식으로 출력
"""

import csv
import json

# A지점 추출 (파고, 수온)
a_stations = {}
with open('tide_abs_info/abs_list_a.csv', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for line in lines[2:]:  # Skip first 2 lines (comments and header)
        if line.strip() and not line.startswith('#'):
            parts = line.strip().split(',')
            if len(parts) >= 4:
                try:
                    station_id = parts[1].strip()
                    if station_id and station_id not in a_stations:
                        a_stations[station_id] = {
                            'name': parts[0].strip(),
                            'id': station_id,
                            'lat': float(parts[2]),
                            'lon': float(parts[3])
                        }
                except (ValueError, IndexError):
                    continue

# B지점 추출 (기온, 풍향, 풍속)
b_stations = {}
with open('tide_abs_info/abs_list_b.csv', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for line in lines[2:]:  # Skip first 2 lines (comments and header)
        if line.strip() and not line.startswith('#'):
            parts = line.strip().split(',')
            if len(parts) >= 4:
                try:
                    station_id = parts[1].strip()
                    if station_id and station_id not in b_stations:
                        b_stations[station_id] = {
                            'name': parts[0].strip(),
                            'id': station_id,
                            'lat': float(parts[2]),
                            'lon': float(parts[3])
                        }
                except (ValueError, IndexError):
                    continue

print("=" * 100)
print("A지점 목록 (파고, 수온 제공)")
print(f"총 {len(a_stations)}개 관측소")
print("=" * 100)
print("    const A_STATIONS = [")
for station in sorted(a_stations.values(), key=lambda x: x['name']):
    print(f"        {{name: \"{station['name']}\", id: \"{station['id']}\", lat: {station['lat']}, lon: {station['lon']}}},")
print("    ];")

print("\n" + "=" * 100)
print("B지점 목록 (기온, 풍향, 풍속 제공)")
print(f"총 {len(b_stations)}개 관측소")
print("=" * 100)
print("    const B_STATIONS = [")
for station in sorted(b_stations.values(), key=lambda x: x['name']):
    print(f"        {{name: \"{station['name']}\", id: \"{station['id']}\", lat: {station['lat']}, lon: {station['lon']}}},")
print("    ];")

# 22185가 있는지 확인
print("\n" + "=" * 100)
print("검증: 22185 관측소 존재 여부")
print("=" * 100)
if '22185' in a_stations:
    print(f"A지점에 22185 존재: {a_stations['22185']}")
elif '22185' in b_stations:
    print(f"B지점에 22185 존재: {b_stations['22185']}")
else:
    print("❌ 22185는 CSV 파일에 존재하지 않습니다!")
