-- ============================================
-- 광고 시스템 더미 데이터 삽입
-- 실행일: 2025-12-23
-- ============================================

-- 1. 제휴사 더미 데이터 (이미 있으면 건너뛰기)
INSERT INTO ad_partners (partner_id, partner_name, address, phone, contact_name, business_type, business_level, staff_name_1, password)
VALUES
    ('PARTNER_001', '바다낚시 전문점', '부산광역시 해운대구 우동 123', '051-123-4567', '김해운', '낚시가게', 5, '이민수', 'PARTNER_001'),
    ('PARTNER_002', '해양레저 마린', '인천광역시 중구 연안부두로 456', '032-987-6543', '박인천', '선박', 4, '최바다', 'PARTNER_002'),
    ('PARTNER_003', '남해 좌대낚시', '경상남도 남해군 미조면 789', '055-555-8888', '정남해', '좌대', 3, '강물고기', 'PARTNER_003'),
    ('PARTNER_004', '서해 피싱샵', '충청남도 태안군 안면읍 101', '041-333-2222', '오서해', '낚시가게', 4, '윤조수', 'PARTNER_004'),
    ('PARTNER_005', '동해 마린스포츠', '강원도 속초시 동명항 202', '033-444-5555', '한동해', '선박', 5, '송파도', 'PARTNER_005')
ON CONFLICT (partner_id) DO NOTHING;

-- 2. 광고 캠페인 더미 데이터
INSERT INTO ad_repo (
    partner_id,
    campaign_name,
    matched_station_id,
    matched_area,
    ad_type_a,
    ad_type_b,
    image_a_url,
    image_b_url,
    landing_url,
    display_start_date,
    display_end_date,
    is_active,
    priority,
    description
)
VALUES
    -- 현재 진행 중인 캠페인들
    (
        'PARTNER_001',
        '부산 해운대 낚시 장비 할인',
        'DT_0005',  -- 부산
        NULL,
        'banner',
        'popup',
        'https://picsum.photos/800/400?random=1',
        'https://picsum.photos/400/600?random=2',
        'https://example.com/busan-fishing',
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        true,
        10,
        '부산 지역 낚시 장비 20% 할인 이벤트'
    ),
    (
        'PARTNER_002',
        '인천 선상낚시 패키지',
        'DT_0001',  -- 인천
        '서해중부',
        'banner',
        'inline',
        'https://picsum.photos/800/400?random=3',
        'https://picsum.photos/600/400?random=4',
        'https://example.com/incheon-boat',
        CURRENT_DATE - INTERVAL '10 days',
        CURRENT_DATE + INTERVAL '20 days',
        true,
        8,
        '인천 선상낚시 주말 특가 - 4인 패키지 30% 할인'
    ),
    (
        'PARTNER_003',
        '남해 좌대낚시 시즌 오픈',
        NULL,  -- 전체 관측소 대상
        '남해동부',
        'banner',
        NULL,
        'https://picsum.photos/800/400?random=5',
        NULL,
        'https://example.com/namhae-jwadae',
        CURRENT_DATE - INTERVAL '3 days',
        CURRENT_DATE + INTERVAL '27 days',
        true,
        9,
        '남해 좌대낚시 봄 시즌 오픈 - 예약자 사은품 증정'
    ),
    (
        'PARTNER_004',
        '태안 갯바위 낚시투어',
        'DT_0050',  -- 태안
        '서해중부',
        'banner',
        'popup',
        'https://picsum.photos/800/400?random=6',
        'https://picsum.photos/400/600?random=7',
        'https://example.com/taean-tour',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        true,
        7,
        '태안 갯바위 낚시투어 - 전문 가이드 동행'
    ),
    (
        'PARTNER_005',
        '속초 마린스포츠 체험',
        'DT_0012',  -- 속초
        '동해중부',
        'inline',
        'banner',
        'https://picsum.photos/600/400?random=8',
        'https://picsum.photos/800/400?random=9',
        'https://example.com/sokcho-marine',
        CURRENT_DATE - INTERVAL '7 days',
        CURRENT_DATE + INTERVAL '23 days',
        true,
        6,
        '속초 마린스포츠 여름 시즌 조기 예약 할인'
    ),

    -- 예정된 캠페인 (아직 시작 안 함)
    (
        'PARTNER_001',
        '여름 릴 낚시대 신제품',
        NULL,
        NULL,
        'banner',
        'popup',
        'https://picsum.photos/800/400?random=10',
        'https://picsum.photos/400/600?random=11',
        'https://example.com/summer-reel',
        CURRENT_DATE + INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '35 days',
        true,
        5,
        '여름 시즌 신제품 릴 낚시대 사전 예약'
    ),
    (
        'PARTNER_003',
        '가족 낚시 체험',
        NULL,
        '남해서부',
        'banner',
        NULL,
        'https://picsum.photos/800/400?random=12',
        NULL,
        'https://example.com/family-fishing',
        CURRENT_DATE + INTERVAL '10 days',
        CURRENT_DATE + INTERVAL '40 days',
        true,
        4,
        '가족과 함께하는 낚시 체험 프로그램'
    ),

    -- 종료된 캠페인
    (
        'PARTNER_002',
        '겨울 방한 낚시복 세일',
        'DT_0001',
        NULL,
        'banner',
        'inline',
        'https://picsum.photos/800/400?random=13',
        'https://picsum.photos/600/400?random=14',
        'https://example.com/winter-clothes',
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE - INTERVAL '30 days',
        false,
        3,
        '겨울 시즌 방한 낚시복 재고 정리 세일 (종료)'
    ),

    -- 비활성 캠페인
    (
        'PARTNER_004',
        '테스트 캠페인',
        'DT_0050',
        NULL,
        'banner',
        NULL,
        'https://picsum.photos/800/400?random=15',
        NULL,
        'https://example.com/test',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        false,
        1,
        '테스트용 캠페인 - 비활성화됨'
    ),

    -- 전체 지역 대상 고우선순위 캠페인
    (
        'PARTNER_005',
        '전국 낚시 페스티벌',
        NULL,  -- 전체 관측소
        NULL,  -- 전체 해역
        'banner',
        'popup',
        'https://picsum.photos/800/400?random=16',
        'https://picsum.photos/400/600?random=17',
        'https://example.com/festival',
        CURRENT_DATE - INTERVAL '2 days',
        CURRENT_DATE + INTERVAL '28 days',
        true,
        15,  -- 최고 우선순위
        '전국 낚시 페스티벌 - 다양한 이벤트 및 경품 행사'
    );

-- 3. 광고 이벤트 더미 데이터 (조회수, 클릭수)
-- 먼저 캠페인 ID들을 가져와서 이벤트 생성
DO $$
DECLARE
    campaign RECORD;
    event_count INTEGER;
    i INTEGER;
BEGIN
    -- 각 캠페인에 대해 랜덤 이벤트 생성
    FOR campaign IN
        SELECT id, partner_id, matched_station_id, is_active
        FROM ad_repo
        WHERE display_start_date <= CURRENT_DATE
          AND display_end_date >= CURRENT_DATE - INTERVAL '30 days'
    LOOP
        -- 노출 이벤트 (100~500개)
        event_count := 100 + floor(random() * 400)::INTEGER;

        FOR i IN 1..event_count LOOP
            INSERT INTO ad_analytics (
                ad_repo_id,
                event_type,
                station_id,
                event_timestamp
            ) VALUES (
                campaign.id,
                'impression',
                COALESCE(campaign.matched_station_id, 'DT_' || lpad((floor(random() * 60) + 1)::text, 4, '0')),
                CURRENT_TIMESTAMP - (random() * INTERVAL '30 days')
            );
        END LOOP;

        -- 클릭 이벤트 (노출의 3~10%)
        event_count := floor(event_count * (0.03 + random() * 0.07))::INTEGER;

        FOR i IN 1..event_count LOOP
            INSERT INTO ad_analytics (
                ad_repo_id,
                event_type,
                station_id,
                event_timestamp
            ) VALUES (
                campaign.id,
                'click',
                COALESCE(campaign.matched_station_id, 'DT_' || lpad((floor(random() * 60) + 1)::text, 4, '0')),
                CURRENT_TIMESTAMP - (random() * INTERVAL '30 days')
            );
        END LOOP;

    END LOOP;
END $$;

-- 완료 메시지
SELECT
    '✅ 더미 데이터 삽입 완료!' as message,
    (SELECT COUNT(*) FROM ad_partners) as total_partners,
    (SELECT COUNT(*) FROM ad_repo) as total_campaigns,
    (SELECT COUNT(*) FROM ad_analytics) as total_events;
