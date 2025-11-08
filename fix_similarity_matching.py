#!/usr/bin/env python3
"""
유사도 기반으로 잘못 매칭된 지역들을 행정구역 기반으로 재매칭하는 스크립트
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

def extract_admin_regions(address):
    """주소에서 행정구역명들을 추출"""
    if not address:
        return []
    
    # 행정구역 패턴 정의
    patterns = [
        r'([가-힣]+시)\s+([가-힣]+구)',  # 서울 중구, 부산 해운대구 등
        r'([가-힣]+도)\s+([가-힣]+시)',  # 전북 군산시, 경남 통영시 등
        r'([가-힣]+도)\s+([가-힣]+군)',  # 전남 진도군, 충남 태안군 등
        r'([가-힣]+시)\s+([가-힣]+면)',  # 군산시 옥도면 등
        r'([가-힣]+군)\s+([가-힣]+면)',  # 진도군 조도면 등
        r'([가-힣]+시)$',               # 단독 시 단위
        r'([가-힣]+군)$',               # 단독 군 단위
        r'([가-힣]+구)$',               # 단독 구 단위
    ]
    
    regions = []
    
    for pattern in patterns:
        matches = re.findall(pattern, address)
        if matches:
            if isinstance(matches[0], tuple):
                regions.extend(matches[0])
            else:
                regions.append(matches[0])
    
    # 특별한 경우들 처리
    admin_mapping = {
        '전북': '전북자치도',
        '전라북도': '전북자치도',
        '경기': '서울.인천.경기',
        '경기도': '서울.인천.경기',
        '인천': '인천',
        '서울': '서울',
        '부산': '부산',
        '대구': '대구',
        '대전': '대전',
        '광주': '광주',
        '울산': '울산',
        '세종': '세종',
    }
    
    # 매핑된 지역명으로 변환
    mapped_regions = []
    for region in regions:
        if region in admin_mapping:
            mapped_regions.append(admin_mapping[region])
        else:
            mapped_regions.append(region)
    
    return list(set(mapped_regions))  # 중복 제거

def get_location_mapping():
    """조석 관측지점의 정확한 행정구역 매핑 테이블"""
    return {
        # 주요 조석 관측지점들의 실제 위치 기반 매핑
        '말도': '군산',        # 전북 군산시 옥도면
        '나로도': '고흥',      # 전남 고흥군 봉래면
        '여서도': '목포',      # 전남 목포시 관할
        '고현항': '거제',      # 경남 거제시 고현동
        '해운대': '부산',      # 부산 해운대구
        '영종왕산': '인천',    # 인천 중구 영종동
        '서망항': '완도',      # 전남 완도군
        '승봉도': '인천',      # 인천 옹진군 덕적면
        '국화도': '인천',      # 인천 옹진군 덕적면
        '향화도항': '완도',    # 전남 완도군
        '송공항': '진도',      # 전남 진도군
        '쉬미항': '진도',      # 전남 진도군
        '백야도': '고흥',      # 전남 고흥군
        '광암항': '거제',      # 경남 거제시
        '거제외포': '거제',    # 경남 거제시
        '읍천항': '포항',      # 경북 포항시
        '화봉리': '진도',      # 전남 진도군
        '가거도': '흑산도',    # 전남 신안군 흑산면
        '소매물도': '거제',    # 경남 거제시
        '강양항': '부산',      # 부산 기장군
        '암태도': '신안',      # 전남 신안군
        '홍도항': '흑산도',    # 전남 신안군 흑산면
        '진도옥도': '진도',    # 전남 진도군
        '땅끝항': '해남',      # 전남 해남군
        '소안항': '완도',      # 전남 완도군
        '마량항': '완도',      # 전남 완도군
        '청산도': '완도',      # 전남 완도군 청산면
        '시산항': '고흥',      # 전남 고흥군
        '안도항': '고흥',      # 전남 고흥군
        '두문포': '고흥',      # 전남 고흥군
        '봉우항': '고흥',      # 전남 고흥군
        '창선도': '통영',      # 경남 통영시
        '능양항': '거제',      # 경남 거제시
        '대진항': '고성',      # 강원 고성군
        '남애항': '양양',      # 강원 양양군
        '궁촌항': '울진',      # 경북 울진군
        '죽변항': '울진',      # 경북 울진군
        '축산항': '울진',      # 경북 울진군
        '강구항': '영덕',      # 경북 영덕군
        '여호항': '고흥',      # 전남 고흥군
        '보옥항': '해남',      # 전남 해남군
        '검산항': '신안',      # 전남 신안군
        '평호리': '해남',      # 전남 해남군
        '원동항': '완도',      # 전남 완도군
        '사초항': '완도',      # 전남 완도군
        '안남리': '고흥',      # 전남 고흥군
        '달천도': '고흥',      # 전남 고흥군
        '장문리': '거제',      # 경남 거제시
        '오산항': '동해',      # 강원 동해시
        '녹동항': '고흥',      # 전남 고흥군
        '영광': '영광',        # 전남 영광군
        '목포': '목포',        # 전남 목포시
        '후포': '울진',        # 경북 울진군
        '대산': '서산',        # 충남 서산시
        '군산': '군산',        # 전북 군산시
        '진도': '진도',        # 전남 진도군
        '위도': '부안',        # 전북 부안군
        '강화외포': '강화',    # 인천 강화군
        '강화대교': '강화',    # 인천 강화군
        '대청도': '백령도',    # 인천 옹진군 대청면
        '어청도': '서천',      # 충남 서천군 관할 (가장 가까운 기상청 지역)
        '굴업도': '인천',      # 인천 옹진군
        '왕돌초': '울진',      # 경북 울진군 앞바다
        '복사초': '해남',      # 전남 해남군 앞바다
        '교본초': '거제',      # 경남 거제시 앞바다
        '영흥도': '인천',      # 인천 옹진군
        '영종대교': '인천',    # 인천 중구
        '쌍정초': '울릉도',    # 경북 울릉군 앞바다
        '도농탄': '서귀포',    # 제주 서귀포시
        '경인항': '인천',      # 인천광역시
        '교동대교': '강화',    # 인천 강화군
        '여호항': '고흥',      # 전남 고흥군
        '소무의도': '인천',    # 인천 옹진군
        '서거차도': '진도',    # 전남 진도군
        # 추가 매핑 - 남은 지역들
        '여서도': '목포',      # 전남 목포시 관할
        '울도': '울릉도',      # 경북 울릉군 (울릉도가 맞음)
        '송공항': '진도',      # 전남 진도군
        '쉬미항': '진도',      # 전남 진도군
        '화봉리': '진도',      # 전남 진도군
        '암태도': '신안',      # 전남 신안군
        '진도옥도': '진도',    # 전남 진도군
        '검산항': '신안',      # 전남 신안군
    }

def find_region_by_admin_area(location_name, forecast_regions):
    """위치 매핑 테이블 기반으로 기상청 지역을 찾기"""
    location_mapping = get_location_mapping()
    
    # 매핑 테이블에서 직접 찾기
    if location_name in location_mapping:
        target_region = location_mapping[location_name]
        if target_region in forecast_regions:
            return forecast_regions[target_region], f"위치매핑({location_name}→{target_region})"
    
    return None, None

def main():
    # 중기예보 지역 데이터 로드
    forecast_regions = parse_forecast_regions('fct_medm_reg.csv')
    print(f"중기예보 지역 {len(forecast_regions)}개 로드됨")
    
    # 개선된 매칭 결과 저장할 리스트
    improved_data = []
    similarity_fixed_count = 0
    
    # tidedata.csv 읽기
    with open('tidedata.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            location_name = row['Name']
            current_criteria = row.get('MATCH_CRITERIA', '')
            
            # 유사도 기반 매칭인 경우만 재매칭 시도
            if current_criteria.startswith('유사도('):
                print(f"\n재매칭 시도: {location_name} (현재: {row['REG_NAME']})")
                
                # 행정구역 기반 매칭 시도
                match, criteria = find_region_by_admin_area(location_name, forecast_regions)
                
                if match:
                    # 더 나은 매칭을 찾은 경우
                    row['REG_ID'] = match['REG_ID']
                    row['REG_SP'] = match['REG_SP']
                    row['REG_NAME'] = match['REG_NAME']
                    row['MATCH_CRITERIA'] = criteria
                    similarity_fixed_count += 1
                    print(f"  → 개선됨: {match['REG_NAME']} [{criteria}]")
                else:
                    print(f"  → 개선 실패: 적절한 매칭을 찾을 수 없음")
            
            improved_data.append(row)
    
    # 개선된 결과를 새로운 CSV 파일로 저장
    output_filename = 'tidedata_fixed_similarity.csv'
    with open(output_filename, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['Code', 'Name', 'Latitude', 'Longitude', 'REG_ID', 'REG_SP', 'REG_NAME', 'MATCH_CRITERIA']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(improved_data)
    
    print(f"\n=== 재매칭 완료 ===")
    print(f"총 처리된 지역: {len(improved_data)}개")
    print(f"유사도 기반 매칭 개선: {similarity_fixed_count}개")
    print(f"결과 파일: {output_filename}")
    
    # 여전히 유사도 기반 매칭인 지역들 출력
    remaining_similarity = [row for row in improved_data if row['MATCH_CRITERIA'].startswith('유사도(')]
    if remaining_similarity:
        print(f"\n=== 여전히 유사도 기반 매칭인 지역들 ({len(remaining_similarity)}개) ===")
        for row in remaining_similarity:
            print(f"{row['Name']} → {row['REG_NAME']} ({row['MATCH_CRITERIA']})")

if __name__ == "__main__":
    main()