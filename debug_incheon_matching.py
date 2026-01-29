#!/usr/bin/env python3
"""
인천(22185) 해양관측소 매칭 디버깅
"""

import math

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

# 인천 22185 해양관측소 (A지점 또는 B지점 확인 필요)
incheon_marine = {"name": "인천", "id": "22185", "lat": 37.0917, "lon": 125.4289}

# 조석관측소 - 인천 주변
tide_stations = [
    {"code": "DT_0064", "name": "교동대교", "lat": 37.789611, "lon": 126.339611},
    {"code": "DT_0001", "name": "인천", "lat": 37.451944, "lon": 126.592222},
    {"code": "SO_0563", "name": "울도", "lat": 37.035556, "lon": 125.995},
    {"code": "DT_0038", "name": "굴업도", "lat": 37.194444, "lon": 125.995},
    {"code": "DT_0045", "name": "격렬비열도", "lat": 36.624369, "lon": 125.561964},
    {"code": "DT_0065", "name": "덕적도", "lat": 37.226333, "lon": 126.156556},
    {"code": "SO_0536", "name": "덕적도", "lat": 37.227778, "lon": 126.157778},
    {"code": "DT_0052", "name": "인천송도", "lat": 37.3380555555556, "lon": 126.586111111111},
    {"code": "DT_0008", "name": "안산", "lat": 37.192222, "lon": 126.647222},
]

print("=" * 100)
print(f"인천 해양관측소 (22185) - 위도: {incheon_marine['lat']:.4f}, 경도: {incheon_marine['lon']:.4f}")
print("=" * 100)

# 거리 계산
distances = []
for tide in tide_stations:
    dist = haversine_distance(incheon_marine['lat'], incheon_marine['lon'], tide['lat'], tide['lon'])
    distances.append({'tide': tide, 'distance': dist})

# 거리순 정렬
distances.sort(key=lambda x: x['distance'])

print(f"\n{'순위':<5} {'조석관측소':<15} {'코드':<12} {'거리(km)':<12} {'위도':<12} {'경도':<12}")
print("-" * 100)

for idx, item in enumerate(distances, 1):
    tide = item['tide']
    dist = item['distance']
    print(f"{idx:<5} {tide['name']:<15} {tide['code']:<12} {dist:>8.2f}    {tide['lat']:>10.6f}  {tide['lon']:>10.6f}")

print("\n" + "=" * 100)
print(f"✓ 가장 가까운 조석관측소: {distances[0]['tide']['name']} ({distances[0]['tide']['code']}) - {distances[0]['distance']:.2f} km")
print("=" * 100)
