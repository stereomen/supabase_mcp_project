-- tide_abs_region 테이블에 RLS 정책 추가
-- 익명 사용자가 데이터를 조회, 삽입, 수정할 수 있도록 허용

-- 기존 정책이 있다면 삭제
DROP POLICY IF EXISTS "Allow anonymous read access" ON tide_abs_region;
DROP POLICY IF EXISTS "Allow anonymous insert access" ON tide_abs_region;
DROP POLICY IF EXISTS "Allow anonymous update access" ON tide_abs_region;

-- RLS 활성화
ALTER TABLE tide_abs_region ENABLE ROW LEVEL SECURITY;

-- 익명 사용자 읽기 권한
CREATE POLICY "Allow anonymous read access"
ON tide_abs_region
FOR SELECT
TO anon
USING (true);

-- 익명 사용자 삽입 권한
CREATE POLICY "Allow anonymous insert access"
ON tide_abs_region
FOR INSERT
TO anon
WITH CHECK (true);

-- 익명 사용자 수정 권한
CREATE POLICY "Allow anonymous update access"
ON tide_abs_region
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
