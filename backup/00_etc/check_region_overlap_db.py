#!/usr/bin/env python3
"""
데이터베이스에서 Temperature, Land, Marine 예보의 지역 코드 중복을 분석하는 스크립트
"""

import os
from supabase import create_client, Client
from collections import defaultdict

def get_supabase_client():
    """Supabase 클라이언트 생성"""
    url = "https://iwpgvdtfpwazzfeniusk.supabase.co"
    # 서비스 롤 키 필요 (환경변수에서 가져오거나 직접 설정)
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        print("SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정해주세요.")
        return None
    
    return create_client(url, key)

def analyze_region_overlap():
    """지역 코드 중복 분석"""
    
    supabase = get_supabase_client()
    if not supabase:
        return
    
    print("=== 중기예보 지역 코드 중복 분석 ===\n")
    
    try:
        # 1. 각 예보 유형별 모든 데이터 가져오기
        response = supabase.table('medium_term_forecasts').select('forecast_type, reg_id, reg_name').execute()
        
        if not response.data:
            print("데이터를 찾을 수 없습니다.")
            return
        
        # 예보 유형별로 데이터 분류
        data_by_type = defaultdict(set)
        region_names = {}
        
        for row in response.data:
            forecast_type = row['forecast_type']
            reg_id = row['reg_id']
            reg_name = row['reg_name']
            
            data_by_type[forecast_type].add(reg_id)
            region_names[reg_id] = reg_name
        
        # 2. 각 예보 유형별 통계
        print("=== 예보 유형별 고유 지역 수 ===")
        for forecast_type in ['temperature', 'land', 'marine']:
            if forecast_type in data_by_type:
                count = len(data_by_type[forecast_type])
                print(f"{forecast_type.capitalize()}: {count}개 지역")
            else:
                print(f"{forecast_type.capitalize()}: 데이터 없음")
        print()
        
        # 3. 각 예보 유형별 지역 코드 샘플
        print("=== 예보 유형별 지역 코드 샘플 (처음 10개) ===")
        for forecast_type in ['temperature', 'land', 'marine']:
            if forecast_type in data_by_type:
                regions = sorted(list(data_by_type[forecast_type]))[:10]
                print(f"\n{forecast_type.capitalize()}:")
                for reg_id in regions:
                    reg_name = region_names.get(reg_id, '이름없음')
                    print(f"  {reg_id}: {reg_name}")
        print()
        
        # 4. 중복 지역 분석
        print("=== 지역 코드 중복 분석 ===")
        
        temp_regions = data_by_type.get('temperature', set())
        land_regions = data_by_type.get('land', set())
        marine_regions = data_by_type.get('marine', set())
        
        # Temperature와 Land 중복
        temp_land_overlap = temp_regions & land_regions
        print(f"\nTemperature ∩ Land: {len(temp_land_overlap)}개")
        if temp_land_overlap:
            print("중복 지역:")
            for reg_id in sorted(list(temp_land_overlap)[:10]):  # 최대 10개만 표시
                print(f"  {reg_id}: {region_names.get(reg_id, '이름없음')}")
        
        # Temperature와 Marine 중복
        temp_marine_overlap = temp_regions & marine_regions
        print(f"\nTemperature ∩ Marine: {len(temp_marine_overlap)}개")
        if temp_marine_overlap:
            print("중복 지역:")
            for reg_id in sorted(list(temp_marine_overlap)[:10]):
                print(f"  {reg_id}: {region_names.get(reg_id, '이름없음')}")
        
        # Land와 Marine 중복
        land_marine_overlap = land_regions & marine_regions
        print(f"\nLand ∩ Marine: {len(land_marine_overlap)}개")
        if land_marine_overlap:
            print("중복 지역:")
            for reg_id in sorted(list(land_marine_overlap)[:10]):
                print(f"  {reg_id}: {region_names.get(reg_id, '이름없음')}")
        
        # 모든 예보 유형 공통
        all_overlap = temp_regions & land_regions & marine_regions
        print(f"\n모든 예보 유형 공통: {len(all_overlap)}개")
        if all_overlap:
            print("공통 지역:")
            for reg_id in sorted(list(all_overlap)):
                print(f"  {reg_id}: {region_names.get(reg_id, '이름없음')}")
        
        # 5. 지역 코드 패턴 분석
        print("\n=== 지역 코드 패턴 분석 ===")
        
        for forecast_type in ['temperature', 'land', 'marine']:
            if forecast_type not in data_by_type:
                continue
                
            print(f"\n{forecast_type.capitalize()} 패턴:")
            patterns = defaultdict(list)
            
            for reg_id in data_by_type[forecast_type]:
                prefix = reg_id[:2]  # 처음 2자리
                patterns[prefix].append(reg_id)
            
            for prefix in sorted(patterns.keys()):
                codes = sorted(patterns[prefix])
                print(f"  {prefix}XXXX: {len(codes)}개")
                print(f"    범위: {codes[0]} ~ {codes[-1]}")
                if len(codes) <= 5:
                    print(f"    전체: {codes}")
                else:
                    print(f"    샘플: {codes[:3]} ... {codes[-2:]}")
        
        # 6. 결론
        print("\n=== 분석 결과 요약 ===")
        print(f"• Temperature: {len(temp_regions)}개 지역")
        print(f"• Land: {len(land_regions)}개 지역")  
        print(f"• Marine: {len(marine_regions)}개 지역")
        print(f"• Temperature-Land 중복: {len(temp_land_overlap)}개")
        print(f"• Temperature-Marine 중복: {len(temp_marine_overlap)}개")
        print(f"• Land-Marine 중복: {len(land_marine_overlap)}개")
        print(f"• 모든 유형 공통: {len(all_overlap)}개")
        
        if len(temp_land_overlap) == 0 and len(temp_marine_overlap) == 0 and len(land_marine_overlap) == 0:
            print("\n✅ 결론: 각 예보 유형별로 완전히 다른 지역 코드를 사용합니다.")
        else:
            print(f"\n⚠️  결론: 일부 지역 코드가 중복됩니다.")
        
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    analyze_region_overlap()