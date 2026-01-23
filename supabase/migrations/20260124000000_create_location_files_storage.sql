-- Supabase Storage 버킷 및 RLS 정책 생성
-- 지역 목록 XML 파일 저장용

-- 1. location-files 버킷 생성 (public access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'location-files',
    'location-files',
    true,  -- public access
    10485760,  -- 10MB 제한
    ARRAY['application/xml', 'text/xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Public read access - 누구나 XML 파일 조회 가능
DROP POLICY IF EXISTS "Public read access for location files" ON storage.objects;
CREATE POLICY "Public read access for location files"
ON storage.objects FOR SELECT
USING (bucket_id = 'location-files');

-- 3. Authenticated upload - 인증된 사용자만 업로드 가능
DROP POLICY IF EXISTS "Authenticated users can upload location files" ON storage.objects;
CREATE POLICY "Authenticated users can upload location files"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'location-files');

-- 4. Authenticated update - 본인이 업로드한 파일만 수정 가능
DROP POLICY IF EXISTS "Users can update their own location files" ON storage.objects;
CREATE POLICY "Users can update their own location files"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'location-files');

-- 5. Authenticated delete - 본인이 업로드한 파일만 삭제 가능
DROP POLICY IF EXISTS "Users can delete their own location files" ON storage.objects;
CREATE POLICY "Users can delete their own location files"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'location-files');

-- 확인
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'location-files';

SELECT '✅ location-files 스토리지 버킷 생성 완료!' as message;
