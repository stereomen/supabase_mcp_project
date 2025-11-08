#!/usr/bin/env python3
"""
tidedata.csv의 지역들을 중기예보 지역과 매칭하는 스크립트 (v2)
매칭 기준을 명시하는 컬럼 추가
"""

import csv
import re
from difflib import SequenceMatcher

def parse_forecast_regions(file_path):
    """중기예보 지역 파일을 파싱하여 딕셔너리로 반환"""
    regions = {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # #START7777과 #7777END 사이의 데이터 추출
    start_idx = content.find('#START7777')
    end_idx = content.find('#7777END')
    
    if start_idx != -1 and end_idx != -1:
        data_section = content[start_idx:end_idx]
        
        # REG_ID 패턴으로 시작하는 라인들 찾기 (11로 시작하는 코드들)
        pattern = r'(11[A-Z0-9]+)\s+(\d{12})\s+(\d{12})\s+([ACI])\s+([\w\s\(\)\.]+?)(?=\s+11[A-Z0-9]+|\s*$|#7777END)'
        
        matches = re.findall(pattern, data_section, re.MULTILINE)
        
        for match in matches:
            reg_id, tm_st, tm_ed, reg_sp, reg_name = match
            reg_name = reg_name.strip()
            
            # 육상(A)과 도시(C) 지역만 사용
            if reg_sp in ['A', 'C'] and reg_name:
                regions[reg_name] = {
                    'REG_ID': reg_id,
                    'REG_SP': reg_sp,
                    'REG_NAME': reg_name
                }
    
    return regions

def similarity(a, b):
    """두 문자열의 유사도를 계산 (0~1)"""
    return SequenceMatcher(None, a, b).ratio()

def find_best_match(location_name, forecast_regions):
    """location_name과 가장 유사한 중기예보 지역을 찾기"""
    best_match = None
    best_score = 0
    match_criteria = ""
    
    # 직접 매칭 규칙들
    name_mappings = {
        '인천': '인천',
        '평택': '평택',
        '영광': '영광',
        '제주': '제주',
        '부산': '부산', 
        '목포': '목포',
        '포항': '포항',
        '울릉도': '울릉도',
        '통영': '통영',
        '마산': '창원',  # 마산은 창원으로 통합
        '여수': '여수',
        '군산': '군산',
        '가덕도': '부산',  # 가덕도는 부산 인근
        '울산': '울산',
        '추자도': '추자도',
        '성산포': '성산',
        '모슬포': '서귀포',  # 모슬포는 서귀포 인근
        '장항': '서천',  # 장항은 서천 인근
        '보령': '보령',
        '고흥발포': '고흥',
        '완도': '완도',
        '진도': '진도',
        '거제도': '거제',
        '거문도': '고흥',  # 거문도는 고흥 인근
        '흑산도': '흑산도',
        '안흥': '태안',  # 안흥은 태안 인근
        '서천마량': '서천',
        '삼천포': '사천',  # 삼천포는 사천
        '동해항': '동해',
        '백령도': '백령도',
        '연평도': '인천',  # 연평도는 인천 관할
        '덕적도': '인천',  # 덕적도는 인천 관할
        '위도': '부안',  # 위도는 부안 인근
        '서산': '서산',
        '태안': '태안',
        '당진': '당진',
        '서귀포': '서귀포',
        '강릉': '강릉',
        '속초': '속초',
        '동해': '동해',
        '영덕': '영덕',
        '진해': '창원',  # 진해는 창원으로 통합
        '광양': '광양'
    }
    
    # 직접 매칭 확인
    for key, target in name_mappings.items():
        if key in location_name:
            if target in forecast_regions:
                if key == target:
                    match_criteria = "지역명"
                else:
                    match_criteria = f"지역명({key}→{target})"
                return forecast_regions[target], match_criteria
    
    # 유사도 기반 매칭
    for region_name, region_data in forecast_regions.items():
        score = similarity(location_name, region_name)
        if score > best_score:
            best_score = score
            best_match = region_data
    
    # 기본값: 지역별로 대표 지역 선택
    if best_match is None or best_score < 0.3:
        default_region = forecast_regions.get('제주', forecast_regions.get('부산', list(forecast_regions.values())[0]))
        match_criteria = "기본값"
        return default_region, match_criteria
    
    match_criteria = f"유사도({best_score:.2f})"
    return best_match, match_criteria

def main():
    # 중기예보 지역 데이터 로드
    forecast_regions = parse_forecast_regions('fct_medm_reg.csv')
    print(f"중기예보 지역 {len(forecast_regions)}개 로드됨")
    
    # 매칭 결과 저장할 리스트
    matched_data = []
    
    # tidedata.csv 읽기
    with open('tidedata.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            location_name = row['Name']
            
            # 가장 적합한 중기예보 지역 찾기
            match, criteria = find_best_match(location_name, forecast_regions)
            
            # 원본 데이터에 매칭 결과 추가
            new_row = {
                'Code': row['Code'],
                'Name': row['Name'],
                'Latitude': row['Latitude'],
                'Longitude': row['Longitude'],
                'REG_ID': match['REG_ID'],
                'REG_SP': match['REG_SP'], 
                'REG_NAME': match['REG_NAME'],
                'MATCH_CRITERIA': criteria
            }
            matched_data.append(new_row)
            
            print(f"{location_name} -> {match['REG_NAME']} ({match['REG_ID']}) [{criteria}]")
    
    # 새로운 CSV 파일로 저장
    with open('tidedata_with_criteria.csv', 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['Code', 'Name', 'Latitude', 'Longitude', 'REG_ID', 'REG_SP', 'REG_NAME', 'MATCH_CRITERIA']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(matched_data)
    
    print(f"\n매칭 완료! 결과가 tidedata_with_criteria.csv에 저장되었습니다.")
    print(f"총 {len(matched_data)}개 지역 매칭됨")

if __name__ == "__main__":
    main()