#!/usr/bin/env python3
"""
해양관측소-조석관측소 매칭 검증 스크립트
먼 관측소가 추천되는 문제를 디버깅
"""

import math
import json

def haversine_distance(lat1, lon1, lat2, lon2):
    """Haversine formula로 두 지점 간 거리 계산 (km)"""
    R = 6371  # 지구 반지름 (km)

    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)

    a = (math.sin(dLat/2) * math.sin(dLat/2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon/2) * math.sin(dLon/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c

# A지점 샘플 (파고, 수온 제공)
a_stations = [
    {"name": "목포", "id": "530350", "lat": 34.77805556, "lon": 126.3925},
    {"name": "여수", "id": "550070", "lat": 34.74416667, "lon": 127.76805555},
    {"name": "울릉도", "id": "21229", "lat": 37.4554, "lon": 131.1144},
    {"name": "덕적도", "id": "22101", "lat": 37.2361, "lon": 126.0188},
]

# 조석관측소 샘플 (178개 중 일부)
tide_stations = [
    {"code": "DT_0007", "name": "목포", "lat": 34.7797222222222, "lon": 126.375556, "marine_reg": "서해남부"},
    {"code": "DT_0016", "name": "여수", "lat": 34.747222, "lon": 127.765556, "marine_reg": "남해서부"},
    {"code": "DT_0013", "name": "울릉도", "lat": 37.491389, "lon": 130.913611, "marine_reg": "동해중부"},
    {"code": "SO_0536", "name": "덕적도", "lat": 37.227778, "lon": 126.157778, "marine_reg": "서해북부"},
    {"code": "DT_0001", "name": "인천", "lat": 37.451944, "lon": 126.592222, "marine_reg": "서해북부"},
    {"code": "DT_0028", "name": "진도", "lat": 34.377778, "lon": 126.308611, "marine_reg": "서해남부"},
    {"code": "SO_0537", "name": "벽파진", "lat": 34.539444, "lon": 126.346111, "marine_reg": "서해남부"},
    {"code": "DT_0005", "name": "부산", "lat": 35.096389, "lon": 129.035278, "marine_reg": "남해동부"},
]

print("=" * 100)
print("해양관측소 → 조석관측소 매칭 검증")
print("=" * 100)

for marine in a_stations:
    print(f"\n🌊 {marine['name']} A지점 ({marine['id']}) - 위도: {marine['lat']:.4f}, 경도: {marine['lon']:.4f}")
    print("-" * 100)

    # 모든 조석관측소와의 거리 계산
    distances = []
    for tide in tide_stations:
        dist = haversine_distance(marine['lat'], marine['lon'], tide['lat'], tide['lon'])
        distances.append({
            'tide': tide,
            'distance': dist
        })

    # 거리순 정렬
    distances.sort(key=lambda x: x['distance'])

    # TOP 5 출력
    print(f"{'순위':<5} {'조석관측소':<15} {'코드':<12} {'거리(km)':<12} {'해역':<15} {'판정':<10}")
    print("-" * 100)

    for idx, item in enumerate(distances[:5], 1):
        tide = item['tide']
        dist = item['distance']

        # 판정
        if dist < 5:
            judgment = "✓ 동일지점"
        elif dist < 20:
            judgment = "✓ 인접"
        elif dist < 50:
            judgment = "△ 보통"
        else:
            judgment = "✗ 멀음"

        print(f"{idx:<5} {tide['name']:<15} {tide['code']:<12} {dist:>8.2f}    {tide['marine_reg']:<15} {judgment:<10}")

    # 전체 조석관측소 중 가장 가까운 것과 가장 먼 것
    print(f"\n  → 가장 가까운 조석관측소: {distances[0]['tide']['name']} ({distances[0]['distance']:.2f} km)")
    print(f"  → 가장 먼 조석관측소: {distances[-1]['tide']['name']} ({distances[-1]['distance']:.2f} km)")

print("\n" + "=" * 100)
print("검증 완료")
print("=" * 100)
