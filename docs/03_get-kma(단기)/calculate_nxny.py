"""
기상청 단기예보 조회를 위한 nx, ny 격자 좌표 계산 스크립트

Input: ../../02_kma(med) 중기 예보/tidedata-station_info_rows.csv
Output: ./tidedata-nxny.csv

각 관측소의 위도(Latitude), 경도(Longitude)를 읽어서
기상청 단기예보 API에서 사용하는 격자 좌표(nx, ny)로 변환합니다.
"""

import math
import csv

def dfs_xy_conv(lat, lon):
    """
    위도, 경도를 기상청 단기예보 격자 좌표(nx, ny)로 변환

    Args:
        lat (float): 위도 (degree)
        lon (float): 경도 (degree)

    Returns:
        tuple: (nx, ny) 격자 좌표
    """
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

def main():
    # 입력/출력 파일 경로
    input_file = '../../02_kma(med) 중기 예보/tidedata-station_info_rows.csv'
    output_file = './tidedata-nxny.csv'

    # 결과를 저장할 리스트
    results = []

    # CSV 파일 읽기
    print(f"입력 파일 읽는 중: {input_file}")
    with open(input_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)

        for row in reader:
            code = row['Code']
            name = row['Name']
            lat = float(row['Latitude'])
            lon = float(row['Longitude'])
            marine_reg_name = row['marine_reg_name']
            address_a = row['AddressA']
            address_b = row['AddressB']
            address_c = row['AddressC']

            # nx, ny 계산
            nx, ny = dfs_xy_conv(lat, lon)

            # 결과 저장
            results.append({
                'Code': code,
                'Name': name,
                'Latitude': lat,
                'Longitude': lon,
                'nx': nx,
                'ny': ny,
                'marine_reg_name': marine_reg_name,
                'AddressA': address_a,
                'AddressB': address_b,
                'AddressC': address_c
            })

            print(f"처리: {code} {name} (위도: {lat}, 경도: {lon}) -> nx: {nx}, ny: {ny}")

    # 결과를 CSV 파일로 저장
    print(f"\n결과 파일 저장 중: {output_file}")
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        fieldnames = ['Code', 'Name', 'Latitude', 'Longitude', 'nx', 'ny',
                      'marine_reg_name', 'AddressA', 'AddressB', 'AddressC']
        writer = csv.DictWriter(f, fieldnames=fieldnames)

        writer.writeheader()
        writer.writerows(results)

    print(f"\n완료! 총 {len(results)}개의 관측소 데이터를 처리했습니다.")
    print(f"결과 파일: {output_file}")

if __name__ == "__main__":
    main()
