-- Supabase Storage 버킷 및 RLS 정책 생성
-- 광고 이미지 저장용

-- 1. ad-images 버킷 생성 (public access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ad-images',
    'ad-images',
    true,  -- public access
    5242880,  -- 5MB 제한
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Public read access - 누구나 이미지 조회 가능
DROP POLICY IF EXISTS "Public read access for ad images" ON storage.objects;
CREATE POLICY "Public read access for ad images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-images');

-- 3. Authenticated upload - 인증된 사용자만 업로드 가능
DROP POLICY IF EXISTS "Authenticated users can upload ad images" ON storage.objects;
CREATE POLICY "Authenticated users can upload ad images"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'ad-images');

-- 4. Authenticated update - 본인이 업로드한 이미지만 수정 가능
DROP POLICY IF EXISTS "Users can update their own ad images" ON storage.objects;
CREATE POLICY "Users can update their own ad images"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'ad-images');

-- 5. Authenticated delete - 본인이 업로드한 이미지만 삭제 가능
DROP POLICY IF EXISTS "Users can delete their own ad images" ON storage.objects;
CREATE POLICY "Users can delete their own ad images"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'ad-images');

-- 확인
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'ad-images';

SELECT '✅ ad-images 스토리지 버킷 생성 완료!' as message;
