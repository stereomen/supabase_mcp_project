# Add Location - Tide Data Upload Scripts

## 개요
JSON 형식의 조석 데이터를 Supabase tide_data 테이블에 업로드하고 관리하는 Python 스크립트 모음

## Python 스크립트 목록

### 1. upload_tide_data.py
**기능**:merged_ad_tideData.json (pasingtide에서 만들어 지역 모두를 합친 json파일) JSON 파일을 tide_data 테이블에 업로드

**주요 기능**:
- merged_ad_tideData.json 파일 읽기
- JSON 데이터를 테이블 스키마에 맞게 변환
- 자동 중복 제거 (obs_date + location_code 조합 기준)
- 배치 업로드 (1000개씩)
- Upsert 방식 (기존 데이터 업데이트, 신규 데이터 삽입)

**실행 방법**:
```bash
cd /path/to/add_location
python3 upload_tide_data.py
```

**필요 환경 변수** (.env 파일):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

---

### 2. check_tide_data.py
**기능**: 업로드된 데이터 확인 및 통계

**주요 기능**:
- 전체 레코드 수 조회
- 지역별 데이터 개수
- 샘플 데이터 조회 (최근 3개)
- 날짜 범위 확인

**실행 방법**:
```bash
python3 check_tide_data.py
```

**출력 예시**:
```
전체 레코드 수: 47,877개
지역 수: 6개
날짜 범위: 2025-05-01 ~ 2027-01-02
```

---

### 3. check_duplicates.py
**기능**: 중복 데이터 검사

**주요 기능**:
- obs_date + location_code 조합으로 중복 검사
- 중복 그룹 수 및 삭제될 레코드 수 계산
- 중복 예시 출력

**실행 방법**:
```bash
python3 check_duplicates.py
```

**사용 시나리오**:
- 유니크 제약 조건 추가 전 중복 확인
- 데이터 정합성 검증

---

## 데이터베이스 구조

### tide_data 테이블

**주요 컬럼**:
- id: Primary key (bigserial, 자동 생성)
- obs_date: 관측 날짜
- location_code: 지역 코드
- location_name: 지역 이름
- obs_post_name: 관측소 이름
- obs_lon, obs_lat: 좌표
- lvl1, lvl2, lvl3, lvl4: 만조/간조 정보
- date_sun, date_moon: 양력/음력 날짜
- mool_normal, mool7, mool8: 물때 정보

**제약 조건**:
```sql
-- Primary Key
CONSTRAINT tide_data_pkey PRIMARY KEY (id)

-- Unique Constraint
CONSTRAINT tide_data_obs_date_location_code_unique
UNIQUE (obs_date, location_code)
```

---

## 필요 라이브러리

```bash
pip install python-dotenv supabase --break-system-packages
```

---

## 업로드 워크플로우

1. **데이터 준비**: merged_ad_tideData.json 파일 준비
2. **중복 확인**: python3 check_duplicates.py
3. **데이터 업로드**: python3 upload_tide_data.py
4. **결과 확인**: python3 check_tide_data.py

---

## 주의사항

- **환경 변수**: .env 파일에 Supabase 인증 정보 필수
- **중복 처리**: 같은 날짜/지역의 데이터는 자동으로 최신 것으로 업데이트
- **배치 크기**: 1000개씩 처리 (대용량 데이터 안전 처리)
- **타임아웃**: 대용량 파일의 경우 300초 이상 소요 가능

---

## 최근 업로드 결과

- **총 데이터**: 47,877개
- **날짜 범위**: 2025-05-01 ~ 2027-01-02
- **지역 수**: 여러 관측소 포함
- **JSON 중복 제거**: 1,468개

---

## 관련 파일

- **데이터 파일**: merged_ad_tideData.json (10.5MB)
- **마이그레이션**: ../supabase/migrations/20251205150830_add_unique_constraint_tide_data.sql
- **환경 설정**: ../.env

---

**작성일**: 2025-12-05
**작성자**: Claude Code
