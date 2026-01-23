import { corsHeaders } from '../_shared/cors.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

interface RemoteConfigParameter {
  defaultValue?: {
    value?: string;
    useInAppDefault?: boolean;
  };
  conditionalValues?: {
    [key: string]: {
      value: string;
    };
  };
  description?: string;
  valueType?: 'STRING' | 'BOOLEAN' | 'NUMBER' | 'JSON';
}

interface RemoteConfigCondition {
  name: string;
  expression: string;
  tagColor?: 'BLUE' | 'BROWN' | 'CYAN' | 'GREEN' | 'INDIGO' | 'LIME' | 'ORANGE' | 'PINK' | 'PURPLE' | 'TEAL';
}

interface RemoteConfigTemplate {
  conditions?: RemoteConfigCondition[];
  parameters?: {
    [key: string]: RemoteConfigParameter;
  };
  parameterGroups?: {
    [key: string]: {
      description?: string;
      parameters: {
        [key: string]: RemoteConfigParameter;
      };
    };
  };
  version?: {
    versionNumber?: string;
    updateTime?: string;
    updateUser?: {
      email?: string;
    };
    description?: string;
    rollbackSource?: string;
    isLegacy?: boolean;
  };
  etag?: string;
}

// Firebase Service Account에서 JWT 토큰 생성
async function generateJWT(): Promise<string> {
  const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.');
  }

  const serviceAccount = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.remoteconfig',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  
  // PEM 형식의 private key를 처리
  const privateKeyPem = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKeyPem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// OAuth 2.0 액세스 토큰 획득
async function getAccessToken(): Promise<string> {
  const jwt = await generateJWT();
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('토큰 획득 실패:', response.status, errorText);
    throw new Error(`토큰 획득 실패: ${response.status}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

// Remote Config 템플릿 조회
async function getRemoteConfigTemplate(projectId: string): Promise<RemoteConfigTemplate> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://firebaseremoteconfig.googleapis.com/v1/projects/${projectId}/remoteConfig`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; UTF-8',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Remote Config 조회 실패:', response.status, errorText);
    throw new Error(`Remote Config 조회 실패: ${response.status}`);
  }

  const config = await response.json();

  // etag는 HTTP 헤더에서 가져옴
  const etag = response.headers.get('etag');
  if (etag) {
    config.etag = etag;
  }

  return config;
}

// Remote Config 템플릿 업데이트
async function updateRemoteConfigTemplate(
  projectId: string,
  template: RemoteConfigTemplate,
  etag: string
): Promise<RemoteConfigTemplate> {
  const accessToken = await getAccessToken();

  // etag와 version은 읽기 전용이므로 요청 본문에서 제거
  // undefined 필드도 제거
  const templateToSend: any = {};

  if (template.conditions && template.conditions.length > 0) {
    templateToSend.conditions = template.conditions;
  }

  if (template.parameters && Object.keys(template.parameters).length > 0) {
    templateToSend.parameters = template.parameters;
  }

  if (template.parameterGroups && Object.keys(template.parameterGroups).length > 0) {
    templateToSend.parameterGroups = template.parameterGroups;
  }

  const response = await fetch(
    `https://firebaseremoteconfig.googleapis.com/v1/projects/${projectId}/remoteConfig`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; UTF-8',
        'If-Match': etag,
      },
      body: JSON.stringify(templateToSend),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Remote Config 업데이트 실패:', response.status, errorText);
    throw new Error(`Remote Config 업데이트 실패: ${response.status}`);
  }

  return await response.json();
}

// 관리자 권한 검증
function validateAdminAuth(adminPassword: string): boolean {
  const expectedPassword = Deno.env.get('ADMIN_SECRET');
  if (!expectedPassword) {
    console.error('ADMIN_SECRET 환경변수가 설정되지 않았습니다.');
    return false;
  }
  return adminPassword === expectedPassword;
}

// 웹 UI HTML 생성
function getHTML(anonKey: string): string {
  const functionUrl = 'https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/manage-firebase-remote-config';
  
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firebase Remote Config 관리</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .section h2 {
            margin-top: 0;
            color: #555;
            border-bottom: 2px solid #007cba;
            padding-bottom: 10px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        input[type="text"], input[type="password"], textarea, select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        textarea {
            height: 100px;
            resize: vertical;
        }
        button {
            background-color: #007cba;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
        }
        button:hover {
            background-color: #005a8a;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .success {
            color: #28a745;
            font-weight: bold;
        }
        .error {
            color: #dc3545;
            font-weight: bold;
        }
        .auth-status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-weight: bold;
        }
        .auth-success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .auth-failed {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .config-item {
            border: 1px solid #eee;
            margin: 10px 0;
            padding: 15px;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        .config-key {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .config-value {
            color: #666;
            font-family: monospace;
            background-color: #fff;
            padding: 5px;
            border-radius: 3px;
            border: 1px solid #ddd;
        }
        .loading {
            display: none;
        }
        .tabs {
            display: flex;
            border-bottom: 1px solid #ddd;
            margin-bottom: 20px;
        }
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 3px solid transparent;
        }
        .tab.active {
            border-bottom-color: #007cba;
            color: #007cba;
            font-weight: bold;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .back-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            margin-bottom: 20px;
            transition: gap 0.2s;
            font-size: 14px;
        }
        .back-button:hover {
            gap: 12px;
        }
    </style>
</head>
<body>
    <a href="https://mancool.netlify.app/" class="back-button">← 대시보드로 돌아가기</a>
    <div class="container">
        <h1>🔧 Firebase Remote Config 관리</h1>
        
        <!-- 인증 섹션 -->
        <div class="section">
            <h2>🔐 관리자 인증</h2>
            <div class="form-group">
                <label for="adminPassword">관리자 비밀번호:</label>
                <input type="password" id="adminPassword" placeholder="관리자 비밀번호를 입력하세요">
                <button onclick="verifyPassword()">확인</button>
            </div>
            <div id="authStatus"></div>
        </div>

        <!-- 탭 메뉴 -->
        <div class="tabs">
            <div class="tab active" onclick="showTab('view')">조회</div>
            <div class="tab" onclick="showTab('update')">업데이트</div>
            <div class="tab" onclick="showTab('logs')">로그</div>
        </div>

        <!-- 조회 탭 -->
        <div id="viewTab" class="tab-content active">
            <div class="section">
                <h2>📋 현재 Remote Config 조회</h2>
                <div class="form-group">
                    <label for="projectId">Firebase 프로젝트 ID:</label>
                    <input type="text" id="projectId" placeholder="mancooltime-83e29" value="mancooltime-83e29">
                    <button onclick="loadRemoteConfig()">조회</button>
                </div>
                <div id="configDisplay"></div>
            </div>
        </div>

        <!-- 업데이트 탭 -->
        <div id="updateTab" class="tab-content">
            <div class="section">
                <h2>⚙️ Remote Config 업데이트</h2>
                <div class="form-group">
                    <label for="updateProjectId">Firebase 프로젝트 ID:</label>
                    <input type="text" id="updateProjectId" placeholder="mancooltime-83e29" value="mancooltime-83e29">
                </div>

                <h3>매개변수 추가/수정</h3>
                <div class="form-group">
                    <label for="paramKey">매개변수 키:</label>
                    <input type="text" id="paramKey" placeholder="예: feature_enabled">
                </div>
                <div class="form-group">
                    <label for="paramValue">기본값:</label>
                    <input type="text" id="paramValue" placeholder="예: true">
                </div>
                <div class="form-group">
                    <label for="paramType">값 타입:</label>
                    <select id="paramType">
                        <option value="STRING">문자열</option>
                        <option value="BOOLEAN">불린</option>
                        <option value="NUMBER">숫자</option>
                        <option value="JSON">JSON</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="paramDescription">설명:</label>
                    <textarea id="paramDescription" placeholder="매개변수 설명을 입력하세요"></textarea>
                </div>

                <button onclick="updateRemoteConfig()">업데이트</button>
            </div>
        </div>

        <!-- 로그 탭 -->
        <div id="logsTab" class="tab-content">
            <div class="section">
                <h2>📝 작업 로그</h2>
                <button onclick="clearLogs()">로그 지우기</button>
                <div id="logs"></div>
            </div>
        </div>
    </div>

    <script>
        let authenticated = false;
        const FUNCTION_URL = '${functionUrl}';
        
        function showTab(tabName) {
            // 모든 탭 비활성화
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // 선택된 탭 활성화
            event.target.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');
        }
        
        async function verifyPassword() {
            const adminPassword = document.getElementById('adminPassword').value;
            const authStatus = document.getElementById('authStatus');
            
            if (!adminPassword) {
                authStatus.innerHTML = '<div class="auth-failed">❌ 비밀번호를 입력하세요</div>';
                return;
            }
            
            try {
                const response = await fetch(FUNCTION_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ${anonKey}'
                    },
                    body: JSON.stringify({ 
                        adminPassword: adminPassword,
                        testAuth: true 
                    })
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    authenticated = true;
                    authStatus.innerHTML = '<div class="auth-success">✅ 인증 성공</div>';
                } else {
                    authenticated = false;
                    authStatus.innerHTML = '<div class="auth-failed">❌ 인증 실패: ' + (result.error || result.message || '잘못된 비밀번호') + '</div>';
                }
            } catch (error) {
                authenticated = false;
                authStatus.innerHTML = '<div class="auth-failed">❌ 인증 중 오류: ' + error.message + '</div>';
            }
        }
        
        async function loadRemoteConfig() {
            if (!authenticated) {
                alert('먼저 관리자 인증을 받아주세요.');
                return;
            }
            
            const projectId = document.getElementById('projectId').value;
            const adminPassword = document.getElementById('adminPassword').value;
            
            if (!projectId) {
                alert('프로젝트 ID를 입력하세요.');
                return;
            }
            
            const configDisplay = document.getElementById('configDisplay');
            configDisplay.innerHTML = '<div>🔄 로딩중...</div>';
            
            try {
                const response = await fetch(FUNCTION_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ${anonKey}'
                    },
                    body: JSON.stringify({
                        adminPassword: adminPassword,
                        authenticated: true,
                        action: 'get',
                        projectId: projectId
                    })
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    displayRemoteConfig(result.config);
                    addLog('✅ Remote Config 조회 성공: ' + projectId);
                } else {
                    configDisplay.innerHTML = '<div class="error">❌ 조회 실패: ' + (result.error || result.message || '알 수 없는 오류') + '</div>';
                    addLog('❌ Remote Config 조회 실패: ' + (result.error || result.message || '알 수 없는 오류'));
                }
            } catch (error) {
                configDisplay.innerHTML = '<div class="error">❌ 네트워크 오류: ' + error.message + '</div>';
                addLog('❌ 네트워크 오류: ' + error.message);
            }
        }
        
        async function updateRemoteConfig() {
            if (!authenticated) {
                alert('먼저 관리자 인증을 받아주세요.');
                return;
            }

            const projectId = document.getElementById('updateProjectId').value;
            const adminPassword = document.getElementById('adminPassword').value;
            const paramKey = document.getElementById('paramKey').value;
            const paramValue = document.getElementById('paramValue').value;
            const paramType = document.getElementById('paramType').value;
            const paramDescription = document.getElementById('paramDescription').value;

            if (!projectId || !paramKey || !paramValue) {
                alert('프로젝트 ID, 매개변수 키, 기본값은 필수입니다.');
                return;
            }

            const updateData = {
                adminPassword: adminPassword,
                authenticated: true,
                action: 'update',
                projectId: projectId,
                paramKey: paramKey,
                paramValue: paramValue,
                paramType: paramType,
                paramDescription: paramDescription
            };

            try {
                const response = await fetch(FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ${anonKey}'
                    },
                    body: JSON.stringify(updateData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    addLog('✅ Remote Config 업데이트 성공: ' + paramKey + ' = ' + paramValue);
                    alert('Remote Config가 성공적으로 업데이트되었습니다.');

                    // 폼 초기화
                    document.getElementById('paramKey').value = '';
                    document.getElementById('paramValue').value = '';
                    document.getElementById('paramDescription').value = '';
                } else {
                    addLog('❌ Remote Config 업데이트 실패: ' + (result.error || result.message || '알 수 없는 오류'));
                    alert('업데이트 실패: ' + (result.error || result.message || '알 수 없는 오류'));
                }
            } catch (error) {
                addLog('❌ 네트워크 오류: ' + error.message);
                alert('네트워크 오류: ' + error.message);
            }
        }
        
        function displayRemoteConfig(config) {
            const configDisplay = document.getElementById('configDisplay');
            
            let hasParameters = false;
            let html = '';
            
            // parameterGroups 확인
            if (config.parameterGroups && Object.keys(config.parameterGroups).length > 0) {
                html += '<h3>📁 매개변수 그룹</h3>';
                for (const [groupName, group] of Object.entries(config.parameterGroups)) {
                    html += '<h4>🔹 ' + groupName + '</h4>';
                    if (group.parameters) {
                        for (const [key, param] of Object.entries(group.parameters)) {
                            hasParameters = true;
                            html += '<div class="config-item">';
                            html += '<div class="config-key">' + key + '</div>';
                            html += '<div class="config-value">기본값: ' + (param.defaultValue?.value || '없음') + '</div>';
                            if (param.description) {
                                html += '<div style="margin-top: 5px; font-size: 12px; color: #888;">설명: ' + param.description + '</div>';
                            }
                            html += '</div>';
                        }
                    }
                }
            }
            
            // 직접 parameters 확인 (그룹 없는 매개변수)
            if (config.parameters && Object.keys(config.parameters).length > 0) {
                html += '<h3>📋 매개변수 목록</h3>';
                for (const [key, param] of Object.entries(config.parameters)) {
                    hasParameters = true;
                    html += '<div class="config-item">';
                    html += '<div class="config-key">' + key + '</div>';
                    html += '<div class="config-value">기본값: ' + (param.defaultValue?.value || '없음') + '</div>';
                    if (param.description) {
                        html += '<div style="margin-top: 5px; font-size: 12px; color: #888;">설명: ' + param.description + '</div>';
                    }
                    if (param.conditionalValues) {
                        html += '<div style="margin-top: 5px; font-size: 12px; color: #666;">조건부 값: ';
                        for (const [condition, value] of Object.entries(param.conditionalValues)) {
                            html += condition + ' = ' + value.value + ' ';
                        }
                        html += '</div>';
                    }
                    html += '</div>';
                }
            }
            
            if (!hasParameters) {
                html = '<div class="config-item">설정된 매개변수가 없습니다.</div>';
            }
            
            if (config.conditions && config.conditions.length > 0) {
                html += '<h3>📌 조건 목록</h3>';
                config.conditions.forEach(condition => {
                    html += '<div class="config-item">';
                    html += '<div class="config-key">' + condition.name + '</div>';
                    html += '<div class="config-value">' + condition.expression + '</div>';
                    html += '</div>';
                });
            }
            
            if (config.version) {
                html += '<div style="margin-top: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; font-size: 12px; color: #666;">';
                html += '📍 버전: ' + (config.version.versionNumber || 'N/A');
                if (config.version.updateTime) {
                    html += ' | 업데이트: ' + new Date(config.version.updateTime).toLocaleString('ko-KR');
                }
                if (config.version.updateUser?.email) {
                    html += ' | 사용자: ' + config.version.updateUser.email;
                }
                html += '</div>';
            }
            
            configDisplay.innerHTML = html;
        }
        
        function addLog(message) {
            const logs = document.getElementById('logs');
            const timestamp = new Date().toLocaleString('ko-KR');
            logs.innerHTML = '<div class="config-item">[' + timestamp + '] ' + message + '</div>' + logs.innerHTML;
        }
        
        function clearLogs() {
            document.getElementById('logs').innerHTML = '';
        }
    </script>
</body>
</html>`;
}

// 메인 서빙 함수
serve(async (req) => {
  // CORS 사전 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // GET 요청일 때는 HTML UI 반환
    if (req.method === 'GET') {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
      const html = getHTML(anonKey);
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        }
      });
    }

    // POST 요청: API 처리
    if (req.method === 'POST') {
      const body = await req.json();
      const { adminPassword, testAuth, authenticated, action, projectId } = body;

      // 인증 테스트
      if (testAuth) {
        const isValid = validateAdminAuth(adminPassword);
        return new Response(JSON.stringify({ 
          success: isValid,
          message: isValid ? '인증 성공' : '인증 실패'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 실제 작업 수행
      if (authenticated) {
        // adminPassword 검증
        if (!adminPassword || !validateAdminAuth(adminPassword)) {
          return new Response(JSON.stringify({
            success: false,
            error: '관리자 인증이 필요합니다.'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Service Account Key에서 실제 프로젝트 ID 추출
        let actualProjectId = projectId;
        try {
          const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
          if (serviceAccountKey) {
            const serviceAccount = JSON.parse(serviceAccountKey);
            if (serviceAccount.project_id) {
              actualProjectId = serviceAccount.project_id;
            }
          }
        } catch (e) {
          console.error('프로젝트 ID 추출 실패:', e);
        }

        if (!actualProjectId) {
          return new Response(JSON.stringify({
            success: false,
            error: '프로젝트 ID가 필요합니다.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          if (action === 'get') {
            // Remote Config 조회
            const config = await getRemoteConfigTemplate(actualProjectId);
            console.log('Remote Config 조회 성공:', actualProjectId);

            return new Response(JSON.stringify({
              success: true,
              config: config,
              message: 'Remote Config 조회 성공'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

          } else if (action === 'update') {
            // Remote Config 업데이트 (재시도 로직 포함)
            const { paramKey, paramValue, paramType, paramDescription } = body;

            let retries = 3;
            let lastError;

            while (retries > 0) {
              try {
                // 현재 설정 조회 (최신 etag 획득)
                const currentConfig = await getRemoteConfigTemplate(actualProjectId);

                if (!currentConfig.etag) {
                  throw new Error('etag를 가져올 수 없습니다. Remote Config가 초기화되지 않았을 수 있습니다.');
                }

                // 새 매개변수 추가/수정
                const newParameter: RemoteConfigParameter = {
                  defaultValue: { value: paramValue }
                };

                // description만 추가 (valueType은 Firebase API에서 자동 판단)
                if (paramDescription) {
                  newParameter.description = paramDescription;
                }

                // 기존 키가 parameterGroups에 있는지 확인하고 업데이트
                let foundInGroup = false;
                if (currentConfig.parameterGroups) {
                  for (const [groupName, group] of Object.entries(currentConfig.parameterGroups)) {
                    if (group.parameters && group.parameters[paramKey]) {
                      group.parameters[paramKey] = newParameter;
                      foundInGroup = true;
                      break;
                    }
                  }
                }

                // 그룹에 없으면 parameters에 추가/업데이트
                if (!foundInGroup) {
                  if (!currentConfig.parameters) {
                    currentConfig.parameters = {};
                  }
                  currentConfig.parameters[paramKey] = newParameter;
                }

                // 업데이트 실행
                const updatedConfig = await updateRemoteConfigTemplate(actualProjectId, currentConfig, currentConfig.etag);

                return new Response(JSON.stringify({
                  success: true,
                  config: updatedConfig,
                  message: `매개변수 '${paramKey}' 업데이트 성공`
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              } catch (error) {
                lastError = error;
                // 412 에러 (etag 불일치)인 경우 재시도
                if (error.message && error.message.includes('412')) {
                  retries--;
                  if (retries > 0) {
                    // 100ms 대기 후 재시도
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                  } else {
                    break;
                  }
                } else {
                  // 412가 아닌 다른 에러는 즉시 throw
                  throw error;
                }
              }
            }

            // 모든 재시도 실패
            if (lastError) {
              throw lastError;
            }

          } else if (action === 'upload-location-file') {
            // 지역 목록 XML 파일을 Storage에 업로드하고 Remote Config 업데이트
            const { version, fileContent } = body;

            if (!version || !fileContent) {
              return new Response(JSON.stringify({
                success: false,
                error: '버전 번호와 파일 내용이 필요합니다.'
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            try {
              // Supabase Storage Client 생성
              const supabaseUrl = Deno.env.get('SUPABASE_URL');
              const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

              if (!supabaseUrl || !supabaseServiceKey) {
                throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
              }

              const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

              // Base64 디코딩
              const decoder = new TextDecoder('utf-8');
              const fileData = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
              const xmlText = decoder.decode(fileData);

              // XML 유효성 간단 검증
              if (!xmlText.trim().startsWith('<?xml') && !xmlText.trim().startsWith('<')) {
                throw new Error('유효하지 않은 XML 형식입니다.');
              }

              // 파일명 생성
              const fileName = `locations_v${version}.xml`;

              // Storage에 업로드 (파일이 이미 존재하는지 확인)
              const { data: existingFiles, error: listError } = await supabaseClient
                .storage
                .from('location-files')
                .list('', { search: fileName });

              if (listError) {
                throw new Error(`Storage 조회 실패: ${listError.message}`);
              }

              if (existingFiles && existingFiles.length > 0) {
                return new Response(JSON.stringify({
                  success: false,
                  error: `버전 ${version}이 이미 존재합니다. 다른 버전 번호를 사용하세요.`
                }), {
                  status: 409,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }

              // 파일 업로드
              const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('location-files')
                .upload(fileName, fileData, {
                  contentType: 'application/xml',
                  upsert: false
                });

              if (uploadError) {
                throw new Error(`파일 업로드 실패: ${uploadError.message}`);
              }

              // Public URL 생성
              const { data: publicUrlData } = supabaseClient
                .storage
                .from('location-files')
                .getPublicUrl(fileName);

              const fileUrl = publicUrlData.publicUrl;

              console.log('파일 업로드 완료:', fileName, fileUrl);

              // Remote Config 업데이트 (버전과 URL)
              let retries = 3;
              let lastConfigError;

              while (retries > 0) {
                try {
                  const currentConfig = await getRemoteConfigTemplate(actualProjectId);

                  if (!currentConfig.etag) {
                    throw new Error('etag를 가져올 수 없습니다.');
                  }

                  // 두 개의 파라미터 추가/업데이트
                  if (!currentConfig.parameters) {
                    currentConfig.parameters = {};
                  }

                  currentConfig.parameters['location_file_version'] = {
                    defaultValue: { value: version.toString() },
                    description: '현재 지역 목록 파일 버전'
                  };

                  currentConfig.parameters['location_file_url'] = {
                    defaultValue: { value: fileUrl },
                    description: '지역 목록 XML 파일 공개 URL'
                  };

                  // 업데이트 실행
                  await updateRemoteConfigTemplate(actualProjectId, currentConfig, currentConfig.etag);

                  console.log('Remote Config 업데이트 완료');

                  return new Response(JSON.stringify({
                    success: true,
                    version: version,
                    url: fileUrl,
                    fileName: fileName,
                    message: `버전 ${version} 업로드 및 Remote Config 업데이트 완료`
                  }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                  });

                } catch (error) {
                  lastConfigError = error;
                  if (error.message && error.message.includes('412')) {
                    retries--;
                    if (retries > 0) {
                      await new Promise(resolve => setTimeout(resolve, 100));
                      continue;
                    }
                  } else {
                    throw error;
                  }
                }
              }

              // Remote Config 업데이트 실패해도 파일은 업로드됨
              if (lastConfigError) {
                return new Response(JSON.stringify({
                  success: true,
                  warning: 'Remote Config 업데이트 실패 (수동 업데이트 필요)',
                  version: version,
                  url: fileUrl,
                  fileName: fileName,
                  error: lastConfigError.message
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }

            } catch (error) {
              console.error('파일 업로드 실패:', error);
              return new Response(JSON.stringify({
                success: false,
                error: '파일 업로드 실패',
                message: error.message
              }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }

          return new Response(JSON.stringify({
            success: false,
            error: '지원하지 않는 작업입니다.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Remote Config 작업 실패:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Remote Config 작업 실패',
            message: error.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 인증되지 않은 요청
      return new Response(JSON.stringify({ 
        success: false,
        error: '인증이 필요합니다.',
        message: '관리자 UI를 통해 인증 후 사용하거나 adminPassword를 제공하세요.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: '지원하지 않는 메소드입니다.' 
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('함수 실행 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '내부 서버 오류',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});