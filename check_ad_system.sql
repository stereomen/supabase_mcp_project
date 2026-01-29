-- 광고 시스템 설치 상태 확인

-- 1. 테이블 확인
SELECT 'TABLES' as type, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('ad_repo', 'ad_analytics', 'ad_partners', 'ad_partner_password_history')
ORDER BY table_name;

-- 2. 뷰 확인
SELECT 'VIEWS' as type, table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE 'ad_%'
ORDER BY table_name;

-- 3. 함수 확인
SELECT 'FUNCTIONS' as type, routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%ad%' OR routine_name LIKE 'get_active%')
ORDER BY routine_name;

-- 4. ad_repo_view 존재 여부 확인
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views
            WHERE table_schema = 'public'
            AND table_name = 'ad_repo_view'
        ) THEN '✅ ad_repo_view 존재'
        ELSE '❌ ad_repo_view 없음 - 마이그레이션 필요!'
    END as status;

-- 5. get_active_ads_for_station 함수 존재 여부
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'get_active_ads_for_station'
        ) THEN '✅ get_active_ads_for_station 함수 존재'
        ELSE '❌ get_active_ads_for_station 함수 없음 - 마이그레이션 필요!'
    END as status;

-- 6. 데이터 개수 확인 (테이블이 있을 경우)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_partners') THEN
        RAISE NOTICE '제휴사 수: %', (SELECT COUNT(*) FROM ad_partners);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_repo') THEN
        RAISE NOTICE '캠페인 수: %', (SELECT COUNT(*) FROM ad_repo);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_analytics') THEN
        RAISE NOTICE '이벤트 수: %', (SELECT COUNT(*) FROM ad_analytics);
    END IF;
END $$;
