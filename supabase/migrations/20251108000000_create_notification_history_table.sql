-- Firebase 푸시 알림 발송 내역 저장 테이블
-- 생성일: 2025-11-08
-- 목적: 푸시 알림 발송 기록 및 랜딩 페이지 게시판 데이터

CREATE TABLE IF NOT EXISTS notification_history (
    -- 기본 키
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 알림 내용
    title TEXT NOT NULL,                    -- 알림 제목
    body TEXT NOT NULL,                     -- 알림 본문
    type TEXT NOT NULL DEFAULT 'message',   -- 알림 타입: promotion, notice, message, news
    promotion_url TEXT,                     -- 프로모션 URL (랜딩 페이지 URL)

    -- 발송 대상 정보
    target_type TEXT NOT NULL,              -- 발송 대상 타입: topic, token, bulk
    target_value TEXT,                      -- 토픽명 또는 토큰 값

    -- 발송 설정
    priority TEXT DEFAULT 'normal',         -- 우선순위: normal, high
    data_only BOOLEAN DEFAULT true,        -- data-only 메시지 여부

    -- 발송 결과
    status TEXT NOT NULL DEFAULT 'pending', -- 발송 상태: pending, success, failed
    fcm_message_id TEXT,                   -- FCM 응답 메시지 ID
    error_message TEXT,                    -- 실패 시 오류 메시지

    -- 추가 데이터 (JSONB로 유연하게 저장)
    additional_data JSONB,                 -- 기타 추가 데이터

    -- 타임스탬프
    sent_at TIMESTAMPTZ,                   -- 실제 발송 시각
    created_at TIMESTAMPTZ DEFAULT NOW(),  -- 레코드 생성 시각
    updated_at TIMESTAMPTZ DEFAULT NOW()   -- 레코드 수정 시각
);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(type);
CREATE INDEX IF NOT EXISTS idx_notification_history_target_type ON notification_history(target_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON notification_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_notification_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_history_updated_at
    BEFORE UPDATE ON notification_history
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_history_updated_at();

-- RLS (Row Level Security) 설정
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (게시판은 누구나 볼 수 있음)
CREATE POLICY "Enable read access for all users" ON notification_history
    FOR SELECT
    USING (status = 'success');  -- 성공한 알림만 공개

-- 서비스 역할만 쓰기 가능
CREATE POLICY "Enable insert for service role only" ON notification_history
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role only" ON notification_history
    FOR UPDATE
    USING (auth.role() = 'service_role');

-- 테이블 및 컬럼 코멘트
COMMENT ON TABLE notification_history IS 'Firebase 푸시 알림 발송 내역';
COMMENT ON COLUMN notification_history.id IS '고유 식별자';
COMMENT ON COLUMN notification_history.title IS '알림 제목';
COMMENT ON COLUMN notification_history.body IS '알림 본문';
COMMENT ON COLUMN notification_history.type IS '알림 타입 (promotion, notice, message, news)';
COMMENT ON COLUMN notification_history.promotion_url IS '프로모션 랜딩 URL';
COMMENT ON COLUMN notification_history.target_type IS '발송 대상 타입 (topic, token, bulk)';
COMMENT ON COLUMN notification_history.target_value IS '토픽명 또는 토큰';
COMMENT ON COLUMN notification_history.priority IS '발송 우선순위';
COMMENT ON COLUMN notification_history.status IS '발송 상태 (pending, success, failed)';
COMMENT ON COLUMN notification_history.fcm_message_id IS 'FCM 응답 메시지 ID';
COMMENT ON COLUMN notification_history.sent_at IS '실제 발송 시각';
