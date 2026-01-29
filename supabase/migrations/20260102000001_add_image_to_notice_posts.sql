-- Add image_url column to notice_posts table
-- 공지사항 이미지 첨부 기능 추가

ALTER TABLE public.notice_posts
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment
COMMENT ON COLUMN public.notice_posts.image_url IS '공지사항 이미지 URL (ad-images 버킷 사용)';
