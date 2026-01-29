-- Create notice_posts table for announcement/notice board functionality
-- 공지사항 테이블 생성

CREATE TABLE IF NOT EXISTS public.notice_posts (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    author TEXT DEFAULT 'Admin'
);

-- Add indexes for common queries
CREATE INDEX idx_notice_posts_created_at ON public.notice_posts(created_at DESC);
CREATE INDEX idx_notice_posts_is_pinned ON public.notice_posts(is_pinned, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notice_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow everyone to read (SELECT) notice posts
CREATE POLICY "Allow public read access to notice posts"
    ON public.notice_posts
    FOR SELECT
    USING (true);

-- Only service role can INSERT/UPDATE/DELETE (admin operations via Edge Functions)
CREATE POLICY "Service role can insert notice posts"
    ON public.notice_posts
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update notice posts"
    ON public.notice_posts
    FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete notice posts"
    ON public.notice_posts
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notice_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
CREATE TRIGGER trigger_update_notice_posts_updated_at
    BEFORE UPDATE ON public.notice_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_notice_posts_updated_at();

-- Add comment
COMMENT ON TABLE public.notice_posts IS '공지사항 게시글 테이블 - Admin only write, public read';
