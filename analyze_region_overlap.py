#!/usr/bin/env python3
"""
각 예보 유형별 지역 코드 중복 분석 스크립트
"""

import re

def extract_region_codes_from_logs():
    """로그에서 각 예보 유형별 지역 코드를 추출"""
    
    # 로그에서 추출한 샘플 데이터 (실제로는 더 많은 데이터가 있을 것)
    log_samples = {
        'temperature': [
            '11A00101,202508280600,202509010000,A01,109,2,23,27,1,1,1,1,=',
            '11A00101,202508280600,202509020000,A01,109,2,22,28,1,1,1,1,=',
            # 더 많은 temperature 데이터...
        ],
        'land': [
            '11B00000,202508280600,202509010000,A02,109,2,WB04,WB09,없음,흐리고 비,90,=',
            '11B00000,202508280600,202509011200,A02,109,2,WB04,WB09,없음,흐리고 비,90,=',
            # 더 많은 land 데이터...
        ],
        'marine': [
            '12A10000,202508280600,202509010000,A02,109,2,1.0,2.0,WB04,WB09,흐리고 비,=',
            '12A10000,202508280600,202509011200,A02,109,2,1.0,2.0,WB04,WB09,흐리고 비,=',
            '12B20000,202508280600,202509020000,A02,109,2,0.5,1.5,WB03,WB00,구름많음,=',
            '12C10000,202508280600,202509030000,A02,109,2,0.5,1.5,WB03,WB00,구름많음,=',
            # 더 많은 marine 데이터...
        ]
    }
    
    region_codes = {}
    
    for forecast_type, logs in log_samples.items():
        codes = set()
        for log_line in logs:
            # CSV 형태에서 첫 번째 필드가 지역 코드
            parts = log_line.split(',')
            if parts:
                region_code = parts[0].strip()
                codes.add(region_code)
        region_codes[forecast_type] = codes
        
    return region_codes

def analyze_overlaps(region_codes):
    """지역 코드 중복 분석"""
    
    temp_codes = region_codes['temperature']
    land_codes = region_codes['land'] 
    marine_codes = region_codes['marine']
    
    print("=== 각 예보 유형별 지역 코드 분석 ===\n")
    
    print(f"Temperature 지역 코드: {len(temp_codes)}개")
    print(f"샘플: {list(temp_codes)}")
    print()
    
    print(f"Land 지역 코드: {len(land_codes)}개") 
    print(f"샘플: {list(land_codes)}")
    print()
    
    print(f"Marine 지역 코드: {len(marine_codes)}개")
    print(f"샘플: {list(marine_codes)}")
    print()
    
    # 중복 분석
    print("=== 중복 분석 ===\n")
    
    temp_land_overlap = temp_codes & land_codes
    temp_marine_overlap = temp_codes & marine_codes
    land_marine_overlap = land_codes & marine_codes
    all_overlap = temp_codes & land_codes & marine_codes
    
    print(f"Temperature ∩ Land: {len(temp_land_overlap)}개")
    if temp_land_overlap:
        print(f"  중복 지역: {temp_land_overlap}")
    
    print(f"Temperature ∩ Marine: {len(temp_marine_overlap)}개")
    if temp_marine_overlap:
        print(f"  중복 지역: {temp_marine_overlap}")
    
    print(f"Land ∩ Marine: {len(land_marine_overlap)}개") 
    if land_marine_overlap:
        print(f"  중복 지역: {land_marine_overlap}")
        
    print(f"모든 예보 유형 공통: {len(all_overlap)}개")
    if all_overlap:
        print(f"  공통 지역: {all_overlap}")
    
    # 지역 코드 패턴 분석
    print("\n=== 지역 코드 패턴 분석 ===\n")
    
    def analyze_pattern(codes, name):
        patterns = {}
        for code in codes:
            prefix = code[:2]  # 처음 2자리
            if prefix not in patterns:
                patterns[prefix] = []
            patterns[prefix].append(code)
        
        print(f"{name} 패턴:")
        for prefix, code_list in sorted(patterns.items()):
            print(f"  {prefix}XXXX: {len(code_list)}개 ({code_list[:3]}{'...' if len(code_list) > 3 else ''})")
        print()
    
    analyze_pattern(temp_codes, "Temperature")
    analyze_pattern(land_codes, "Land") 
    analyze_pattern(marine_codes, "Marine")

def main():
    print("중기예보 지역 코드 중복 분석을 시작합니다...\n")
    
    region_codes = extract_region_codes_from_logs()
    analyze_overlaps(region_codes)
    
    print("=== 결론 ===")
    print("실제 API 응답 데이터를 더 많이 수집해서 정확한 분석이 필요합니다.")
    print("현재 로그 샘플만으로는 제한적인 분석만 가능합니다.")

if __name__ == "__main__":
    main()