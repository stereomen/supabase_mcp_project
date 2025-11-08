const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function deployFunction() {
  const projectRef = 'iwpgvdtfpwazzfeniusk';
  const functionSlug = 'get-medm-weather';
  
  // 함수 소스 파일 읽기
  const sourceCode = fs.readFileSync('./supabase/functions/get-medm-weather/index.ts', 'utf8');
  
  // 메타데이터 설정
  const metadata = {
    entrypoint_path: 'index.ts',
    name: 'get-medm-weather',
    import_map: {}
  };
  
  // FormData 생성
  const formData = new FormData();
  formData.append('metadata', JSON.stringify(metadata));
  formData.append('file', sourceCode, 'index.ts');
  
  // API 호출
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${functionSlug}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN || 'sbp_YOUR_TOKEN_HERE'}`,
        ...formData.getHeaders()
      },
      body: formData
    }
  );
  
  if (response.ok) {
    const result = await response.json();
    console.log('함수 배포 성공:', result);
  } else {
    const error = await response.text();
    console.error('배포 실패:', response.status, error);
  }
}

deployFunction().catch(console.error);