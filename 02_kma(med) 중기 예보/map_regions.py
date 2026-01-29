"""
지역 매핑 스크립트
입력: medm_reg.txt (중기예보 지역 코드), tidedata-station_info_rows.csv (조위 관측소 정보)
출력: tide-medm_reg.md (TypeScript 매핑 객체)
"""

import csv
import re

# REG_SP='H'인 해상 지역 매핑 (medm_reg.txt에서 추출)
marine_regions_map = {
    '서해북부': '12A10000',
    '서해중부': '12A20000',
    '서해남부': '12A30000',
    '남해서부': '12B10000',
    '남해동부': '12B20000',
    '제주도해상': '12B10500',
    '동해중부': '12C20000',
    '동해남부': '12C10000',
    '동해북부': '12C30000',
}

def read_medm_reg(txt_path):
    """medm_reg.txt에서 지역 코드 읽기"""
    city_regions = {}  # REG_SP='C'
    land_regions = {}  # REG_SP='A'

    with open(txt_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue

            parts = line.split()
            if len(parts) >= 5:
                reg_id = parts[0]
                reg_sp = parts[3]
                reg_name = ' '.join(parts[4:])

                if reg_sp == 'C':
                    city_regions[reg_name] = reg_id
                elif reg_sp == 'A':
                    land_regions[reg_name] = reg_id

    return city_regions, land_regions

def read_csv_stations(csv_path):
    """CSV 파일에서 관측소 정보 읽기"""
    stations = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            stations.append({
                'code': row['Code'],
                'name': row['Name'],
                'marine_reg_name': row['marine_reg_name'],
                'address_a': row['AddressA'],
                'address_b': row['AddressB'],
                'address_c': row['AddressC'],
            })
    return stations

def map_station_to_marine_region(station):
    """관측소를 해상 중기예보 지역에 매핑"""
    marine_reg = station['marine_reg_name']
    return marine_regions_map.get(marine_reg, None)

def map_station_to_city_region(station, city_regions):
    """관측소를 도시 중기예보 지역에 매핑 (REG_SP='C')"""
    address_b = station['address_b'].strip()
    address_c = station['address_c'].strip()

    # AddressB에서 도시 이름을 찾음 (예: "인천광역시" -> "인천")
    # 일부 도시는 AddressB에 정확히 매칭됨
    for city_name, city_code in city_regions.items():
        city_name_clean = city_name.strip()

        # 정확히 매칭되는 경우
        if address_b == city_name_clean:
            return city_code

        # AddressB에 도시 이름이 포함된 경우 (예: "인천광역시" contains "인천")
        if city_name_clean in address_b:
            return city_code

        # AddressC에서도 확인 (예: "중구" 등)
        if city_name_clean in address_c:
            return city_code

    return None

def map_station_to_land_region(station, land_regions):
    """관측소를 육상 광역 중기예보 지역에 매핑 (REG_SP='A')"""
    address_a = station['address_a'].strip()
    address_b = station['address_b'].strip()

    # AddressA를 기반으로 광역 지역 매핑
    for land_name, land_code in land_regions.items():
        land_name_clean = land_name.strip()

        # 정확히 매칭
        if land_name_clean == address_a:
            return land_code

        # 부분 매칭 (예: "서울.인천.경기" -> "서울특별시", "인천광역시", "경기도")
        if '서울.인천.경기' == land_name_clean:
            if '서울' in address_a or '인천' in address_a or '경기' in address_a:
                return land_code

        if '충청도' == land_name_clean:
            if '충청' in address_a:
                return land_code

        if '전라도' == land_name_clean:
            if '전라' in address_a or '전북' in address_a:
                return land_code

        if '경상도' == land_name_clean:
            if '경상' in address_a or '부산' in address_a or '울산' in address_a or '대구' in address_a:
                return land_code

        # 직접 포함 관계
        if land_name_clean in address_a or address_a in land_name_clean:
            return land_code

    return None

def create_mappings(txt_path, csv_path):
    """매핑 생성"""
    city_regions, land_regions = read_medm_reg(txt_path)
    stations = read_csv_stations(csv_path)

    # 해상 매핑 (marineMapping)
    marine_mapping = {}
    # 도시 매핑 (temperMapping)
    temper_mapping = {}
    # 육상 광역 매핑 (landMapping)
    land_mapping = {}

    for station in stations:
        code = station['code']

        # 해상 지역 매핑
        marine_region_code = map_station_to_marine_region(station)
        if marine_region_code:
            if marine_region_code not in marine_mapping:
                marine_mapping[marine_region_code] = []
            marine_mapping[marine_region_code].append(code)

        # 도시 지역 매핑
        city_region_code = map_station_to_city_region(station, city_regions)
        if city_region_code:
            if city_region_code not in temper_mapping:
                temper_mapping[city_region_code] = []
            temper_mapping[city_region_code].append(code)

        # 육상 광역 지역 매핑
        land_region_code = map_station_to_land_region(station, land_regions)
        if land_region_code:
            if land_region_code not in land_mapping:
                land_mapping[land_region_code] = []
            land_mapping[land_region_code].append(code)

    return marine_mapping, temper_mapping, land_mapping

def format_typescript_object(mapping, region_names_map, indent='  '):
    """TypeScript 객체 형식으로 포맷팅"""
    lines = []
    for key in sorted(mapping.keys()):
        values = sorted(mapping[key])
        values_str = ', '.join([f"'{v}'" for v in values])
        region_name = region_names_map.get(key, key)
        lines.append(f"{indent}'{key}': [{values_str}], // {region_name}")
    return ',\n'.join(lines)

def main():
    txt_path = 'medm_reg.txt'
    csv_path = 'tidedata-station_info_rows.csv'
    output_path = 'tide-medm_reg.md'

    marine_mapping, temper_mapping, land_mapping = create_mappings(txt_path, csv_path)

    # 해상 지역명 맵 (반대 방향)
    marine_names = {v: k for k, v in marine_regions_map.items()}

    # 도시 및 육상 지역명 읽기
    city_regions, land_regions = read_medm_reg(txt_path)
    city_names = {v: k for k, v in city_regions.items()}
    land_names = {v: k for k, v in land_regions.items()}

    # Markdown 파일 생성
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('# 조위 관측소 - 중기예보 지역 매핑\n\n')
        f.write('## 해상 중기예보 지역 매핑 (REG_SP=H)\n\n')
        f.write('```typescript\n')
        f.write('const marineMapping = {\n')
        f.write(format_typescript_object(marine_mapping, marine_names))
        f.write('\n};\n')
        f.write('```\n\n')

        f.write('## 도시 중기예보 지역 매핑 (REG_SP=C)\n\n')
        f.write('```typescript\n')
        f.write('const temperMapping = {\n')
        f.write(format_typescript_object(temper_mapping, city_names))
        f.write('\n};\n')
        f.write('```\n\n')

        f.write('## 육상 광역 중기예보 지역 매핑 (REG_SP=A)\n\n')
        f.write('```typescript\n')
        f.write('const landMapping = {\n')
        f.write(format_typescript_object(land_mapping, land_names))
        f.write('\n};\n')
        f.write('```\n\n')

        # 통계 정보 추가
        f.write('## 매핑 통계\n\n')
        f.write(f'- 해상 지역 수: {len(marine_mapping)}\n')
        f.write(f'- 도시 지역 수: {len(temper_mapping)}\n')
        f.write(f'- 육상 광역 지역 수: {len(land_mapping)}\n')

        total_marine_stations = sum(len(v) for v in marine_mapping.values())
        total_temper_stations = sum(len(v) for v in temper_mapping.values())
        total_land_stations = sum(len(v) for v in land_mapping.values())

        f.write(f'- 해상 매핑 관측소 수: {total_marine_stations}\n')
        f.write(f'- 도시 매핑 관측소 수: {total_temper_stations}\n')
        f.write(f'- 육상 광역 매핑 관측소 수: {total_land_stations}\n\n')

        # 지역별 상세 정보
        f.write('### 해상 지역별 관측소 수\n\n')
        for key in sorted(marine_mapping.keys()):
            region_name = [k for k, v in marine_regions_map.items() if v == key]
            region_name = region_name[0] if region_name else key
            f.write(f'- {key} ({region_name}): {len(marine_mapping[key])}개\n')

        f.write('\n### 도시 지역별 관측소 수 (상위 20개)\n\n')
        sorted_temper = sorted(temper_mapping.items(), key=lambda x: len(x[1]), reverse=True)
        for i, (key, stations) in enumerate(sorted_temper[:20], 1):
            f.write(f'{i}. {key}: {len(stations)}개 관측소\n')

        f.write('\n### 육상 광역 지역별 관측소 수\n\n')
        sorted_land = sorted(land_mapping.items(), key=lambda x: len(x[1]), reverse=True)
        for key, stations in sorted_land:
            region_name = land_names.get(key, key)
            f.write(f'- {key} ({region_name}): {len(stations)}개\n')

    print(f'매핑 완료: {output_path}')
    print(f'해상 지역: {len(marine_mapping)}개, 관측소: {total_marine_stations}개')
    print(f'도시 지역: {len(temper_mapping)}개, 관측소: {total_temper_stations}개')
    print(f'육상 광역 지역: {len(land_mapping)}개, 관측소: {total_land_stations}개')

if __name__ == '__main__':
    main()
