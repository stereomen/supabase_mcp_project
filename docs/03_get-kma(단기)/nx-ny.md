import math

def dfs_xy_conv(lat, lon):
    # --- 기상청 투영 설정 상수 (절대 변경 금지) ---
    RE = 6371.00877  # 지구 반경(km)
    GRID = 5.0       # 격자 간격(km)
    SLAT1 = 30.0     # 투영 위도1(degree)
    SLAT2 = 60.0     # 투영 위도2(degree)
    OLON = 126.0     # 기준 점 경도(degree)
    OLAT = 38.0      # 기준 점 위도(degree)
    XO = 43          # 기준 점 X좌표(GRID)
    YO = 136         # 기준 점 Y좌표(GRID)
    # -------------------------------------------

    DEGRAD = math.pi / 180.0
    RADDEG = 180.0 / math.pi

    re = RE / GRID
    slat1 = SLAT1 * DEGRAD
    slat2 = SLAT2 * DEGRAD
    olon = OLON * DEGRAD
    olat = OLAT * DEGRAD

    sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5)
    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn)
    sf = math.tan(math.pi * 0.25 + slat1 * 0.5)
    sf = math.pow(sf, sn) * math.cos(slat1) / sn
    ro = math.tan(math.pi * 0.25 + olat * 0.5)
    ro = re * sf / math.pow(ro, sn)

    # 위도, 경도를 라디안으로 변환
    ra = math.tan(math.pi * 0.25 + lat * DEGRAD * 0.5)
    ra = re * sf / math.pow(ra, sn)
    theta = lon * DEGRAD - olon
    
    if theta > math.pi:
        theta -= 2.0 * math.pi
    if theta < -math.pi:
        theta += 2.0 * math.pi
        
    theta *= sn

    # 격자 좌표 계산 (정수로 반올림)
    x = math.floor(ra * math.sin(theta) + XO + 0.5)
    y = math.floor(ro - ra * math.cos(theta) + YO + 0.5)

    return int(x), int(y)

# --- 사용 예시 (서울시청 기준) ---
lat = 37.5665
lon = 126.9780

nx, ny = dfs_xy_conv(lat, lon)
print(f"위도: {lat}, 경도: {lon} -> nx: {nx}, ny: {ny}")
# 예상 출력 결과 -> nx: 60, ny: 127