-- 중기예보 테이블에서 각 예보 유형별 고유 지역 코드 확인
-- Temperature, Land, Marine 예보의 지역 코드 중복 분석

-- 1. 각 예보 유형별 고유 지역 코드 개수
SELECT 
    forecast_type,
    COUNT(DISTINCT reg_id) as unique_regions,
    COUNT(*) as total_records
FROM medium_term_forecasts 
WHERE forecast_type IN ('land', 'temperature', 'marine')
GROUP BY forecast_type
ORDER BY forecast_type;

-- 2. 각 예보 유형별 지역 코드 샘플 (최대 10개씩)
SELECT 
    forecast_type,
    reg_id,
    reg_name,
    COUNT(*) as record_count
FROM medium_term_forecasts 
WHERE forecast_type = 'temperature'
GROUP BY forecast_type, reg_id, reg_name
ORDER BY reg_id
LIMIT 10;

SELECT 
    forecast_type,
    reg_id,
    reg_name,
    COUNT(*) as record_count
FROM medium_term_forecasts 
WHERE forecast_type = 'land'
GROUP BY forecast_type, reg_id, reg_name
ORDER BY reg_id
LIMIT 10;

SELECT 
    forecast_type,
    reg_id,
    reg_name,
    COUNT(*) as record_count
FROM medium_term_forecasts 
WHERE forecast_type = 'marine'
GROUP BY forecast_type, reg_id, reg_name
ORDER BY reg_id
LIMIT 10;

-- 3. 지역 코드 중복 확인
-- Temperature와 Land 공통 지역
SELECT 
    t.reg_id,
    t.reg_name,
    'temperature_land_overlap' as overlap_type
FROM (
    SELECT DISTINCT reg_id, reg_name 
    FROM medium_term_forecasts 
    WHERE forecast_type = 'temperature'
) t
INNER JOIN (
    SELECT DISTINCT reg_id, reg_name 
    FROM medium_term_forecasts 
    WHERE forecast_type = 'land'
) l ON t.reg_id = l.reg_id
ORDER BY t.reg_id;

-- Temperature와 Marine 공통 지역
SELECT 
    t.reg_id,
    t.reg_name,
    'temperature_marine_overlap' as overlap_type
FROM (
    SELECT DISTINCT reg_id, reg_name 
    FROM medium_term_forecasts 
    WHERE forecast_type = 'temperature'
) t
INNER JOIN (
    SELECT DISTINCT reg_id, reg_name 
    FROM medium_term_forecasts 
    WHERE forecast_type = 'marine'
) m ON t.reg_id = m.reg_id
ORDER BY t.reg_id;

-- Land와 Marine 공통 지역
SELECT 
    l.reg_id,
    l.reg_name,
    'land_marine_overlap' as overlap_type
FROM (
    SELECT DISTINCT reg_id, reg_name 
    FROM medium_term_forecasts 
    WHERE forecast_type = 'land'
) l
INNER JOIN (
    SELECT DISTINCT reg_id, reg_name 
    FROM medium_term_forecasts 
    WHERE forecast_type = 'marine'
) m ON l.reg_id = m.reg_id
ORDER BY l.reg_id;

-- 4. 지역 코드 패턴 분석
SELECT 
    forecast_type,
    SUBSTR(reg_id, 1, 2) as region_prefix,
    COUNT(DISTINCT reg_id) as region_count,
    MIN(reg_id) as first_code,
    MAX(reg_id) as last_code
FROM medium_term_forecasts 
WHERE forecast_type IN ('land', 'temperature', 'marine')
GROUP BY forecast_type, SUBSTR(reg_id, 1, 2)
ORDER BY forecast_type, region_prefix;