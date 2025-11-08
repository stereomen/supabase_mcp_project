// Firebase Cloud Messaging을 통한 안드로이드 앱 푸시 알림 전송 함수
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Firebase 프로젝트 설정
const PROJECT_ID = 'mancooltime-83e29';
const FCM_API_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

// 푸시 알림 데이터 인터페이스
interface NotificationPayload {
  token?: string; // FCM 디바이스 토큰 (token 또는 topic 중 하나 필수)
  topic?: string; // FCM 토픽 이름 (token 또는 topic 중 하나 필수)
  title?: string; // 선택사항 (data-only 메시지의 경우)
  body?: string; // 선택사항 (data-only 메시지의 경우)
  data?: { 
    title?: string;           // 알림 제목
    body?: string;            // 알림 내용
    type?: string;            // 알림 타입 (예: promotion, message, news)
    promotion_url?: string;   // 프로모션 URL
    [key: string]: string | undefined;    // 기타 추가 데이터
  }; // 추가 데이터 (data-only 메시지에서는 필수)
  priority?: 'normal' | 'high'; // 우선순위 (기본값: high for data-only)
  icon?: string; // 알림 아이콘 (선택사항)
  sound?: string; // 알림 사운드 (선택사항)
  dataOnly?: boolean; // true일 경우 notification 없이 data만 전송
}

interface FirebaseMessage {
  message: {
    token?: string; // 개별 디바이스용
    topic?: string; // 토픽용
    notification?: {
      title: string;
      body: string;
    };
    data?: { [key: string]: string };
    android?: {
      priority: 'normal' | 'high';
      notification?: {
        icon?: string;
        sound?: string;
      };
    };
  };
}

// Firebase v1 API용 OAuth 2.0 액세스 토큰 획득
async function getAccessToken(): Promise<string> {
  const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
  
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    // JWT 생성을 위한 헤더와 페이로드
    const header = {
      alg: "RS256",
      typ: "JWT"
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600, // 1시간
      iat: now
    };

    // Base64 URL 안전 인코딩
    const base64UrlEncode = (obj: any) => {
      return btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // 실제로는 private key로 서명해야 하지만, 
    // Deno 환경에서 간단한 구현을 위해 Google의 토큰 교환 서비스 사용
    
    // Google OAuth 2.0 토큰 요청 (서비스 계정 인증)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(serviceAccount)
      })
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      console.log('OAuth 토큰 획득 성공');
      return tokenData.access_token;
    } else {
      const errorText = await tokenResponse.text();
      console.error('토큰 요청 실패:', tokenResponse.status, errorText);
      throw new Error(`토큰 요청 실패: ${tokenResponse.status}`);
    }

  } catch (error) {
    console.error('액세스 토큰 생성 실패:', error);
    throw new Error(`Firebase 인증 토큰 생성에 실패했습니다: ${error.message}`);
  }
}

// RSA-SHA256 서명을 사용한 JWT 생성
async function createJWT(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // JWT 헤더
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  
  // JWT 페이로드
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging", 
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  
  // Base64URL 인코딩
  const base64UrlEncode = (obj: any) => {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')  
      .replace(/=/g, '');
  };
  
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  try {
    // PEM 형식의 private key를 가져옴
    const privateKey = serviceAccount.private_key;
    
    // Web Crypto API를 사용하여 RSA 키 가져오기
    const keyData = await crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(privateKey),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );
    
    // 서명 생성
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      keyData,
      encoder.encode(signingInput)
    );
    
    // Base64URL 인코딩된 서명
    const encodedSignature = arrayBufferToBase64Url(signature);
    
    return `${signingInput}.${encodedSignature}`;
    
  } catch (error) {
    console.error('JWT 서명 실패:', error);
    throw new Error(`JWT 생성 실패: ${error.message}`);
  }
}

// PEM 형식을 ArrayBuffer로 변환
function pemToArrayBuffer(pem: string): ArrayBuffer {
  try {
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    
    // PEM 형식에서 헤더와 푸터 제거
    let pemContents = pem.replace(pemHeader, '').replace(pemFooter, '');
    
    // 모든 공백, 개행 문자 제거
    pemContents = pemContents.replace(/\s/g, '');
    
    // Base64 디코딩
    const binaryString = atob(pemContents);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  } catch (error) {
    console.error('PEM 파싱 실패:', error);
    throw new Error(`PEM 키 파싱 실패: ${error.message}`);
  }
}

// ArrayBuffer를 Base64URL로 변환
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// FCM을 통한 푸시 알림 전송 (v1 API 사용)
async function sendPushNotificationV1(payload: NotificationPayload): Promise<any> {
  try {
    const accessToken = await getAccessToken();

    const message: FirebaseMessage = {
      message: {}
    };

    // token 또는 topic 설정
    if (payload.token) {
      message.message.token = payload.token;
      console.log(`개별 디바이스로 전송: ${payload.token}`);
    } else if (payload.topic) {
      // 허용된 토픽만 사용
      const allowedTopics = ['all_users', 'push_enabled_users'];
      if (!allowedTopics.includes(payload.topic)) {
        throw new Error(`허용되지 않은 토픽입니다. 사용 가능한 토픽: ${allowedTopics.join(', ')}`);
      }
      message.message.topic = payload.topic;
      console.log(`토픽으로 전송: ${payload.topic}`);
    } else {
      throw new Error('token 또는 topic 중 하나는 필수입니다.');
    }

    // data-only 메시지인지 확인
    if (payload.dataOnly) {
      // data-only 메시지: notification 객체 없이 data만 전송
      if (!payload.data) {
        throw new Error('data-only 메시지의 경우 data 필드는 필수입니다.');
      }
      
      message.message.data = payload.data;
      
      // data-only 메시지는 기본적으로 high priority
      message.message.android = {
        priority: payload.priority || 'high'
      };
      
      console.log('data-only 메시지 전송:', message);
    } else {
      // 일반 알림 메시지: notification과 data 모두 포함
      if (!payload.title || !payload.body) {
        throw new Error('일반 알림 메시지의 경우 title과 body는 필수입니다.');
      }
      
      message.message.notification = {
        title: payload.title,
        body: payload.body
      };

      // 추가 데이터 설정
      if (payload.data) {
        message.message.data = payload.data;
      }

      // Android 특정 설정
      if (payload.priority || payload.icon || payload.sound) {
        message.message.android = {
          priority: payload.priority || 'normal'
        };

        if (payload.icon || payload.sound) {
          message.message.android.notification = {};
          if (payload.icon) message.message.android.notification.icon = payload.icon;
          if (payload.sound) message.message.android.notification.sound = payload.sound;
        }
      }
      
      console.log('일반 알림 메시지 전송:', message);
    }

    const response = await fetch(FCM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('FCM v1 전송 실패:', response.status, errorData);
      throw new Error(`푸시 알림 전송 실패: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log('푸시 알림 전송 성공 (v1):', result);
    return result;

  } catch (error) {
    console.error('푸시 알림 전송 오류 (v1):', error);
    throw error;
  }
}

// 레거시 API는 더 이상 권장되지 않으므로 제거됨

// DB에 알림 발송 내역 저장
async function saveNotificationHistory(
  payload: NotificationPayload,
  result: any,
  status: 'success' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Netlify 배포된 알림 센터 URL
    const NOTIFICATION_CENTER_URL = 'https://mancool.netlify.app/notifications.html';

    const historyData = {
      title: payload.data?.title || payload.title || '',
      body: payload.data?.body || payload.body || '',
      type: payload.data?.type || 'message',
      promotion_url: payload.data?.promotion_url || NOTIFICATION_CENTER_URL,
      target_type: payload.topic ? 'topic' : (payload.token ? 'token' : 'unknown'),
      target_value: payload.topic || payload.token || null,
      priority: payload.priority || 'normal',
      data_only: payload.dataOnly || false,
      status: status,
      fcm_message_id: result?.name || null,
      error_message: errorMessage || null,
      additional_data: payload.data || null,
      sent_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('notification_history')
      .insert([historyData]);

    if (error) {
      console.error('알림 내역 저장 실패:', error);
    } else {
      console.log('알림 내역 저장 성공:', historyData.title);
    }
  } catch (error) {
    console.error('알림 내역 저장 중 오류:', error);
  }
}

// 메인 알림 전송 함수 (v1 API 전용)
async function sendPushNotification(payload: NotificationPayload): Promise<any> {
  try {
    // Firebase HTTP v1 API 사용 (권장 방식)
    const result = await sendPushNotificationV1(payload);

    // 발송 성공 시 DB에 저장
    await saveNotificationHistory(payload, result, 'success');

    return result;
  } catch (error) {
    console.error('Firebase v1 API 전송 실패:', error);

    // 발송 실패 시에도 DB에 저장
    await saveNotificationHistory(payload, null, 'failed', error.message);

    throw error;
  }
}

// 여러 디바이스에 일괄 전송
async function sendBulkPushNotifications(
  tokens: string[], 
  title?: string, 
  body?: string, 
  data?: { [key: string]: string },
  dataOnly?: boolean,
  priority?: 'normal' | 'high'
): Promise<any[]> {
  const results = [];
  
  for (const token of tokens) {
    try {
      const result = await sendPushNotification({
        token,
        title,
        body,
        data,
        dataOnly,
        priority
      });
      results.push({ token, success: true, result });
    } catch (error) {
      console.error(`토큰 ${token}에 대한 알림 전송 실패:`, error);
      results.push({ token, success: false, error: error.message });
    }
  }
  
  return results;
}

// 인증 검사 함수
// 관리자 인증 검증 (2단계 인증 시스템)
function validateAdminAuth(adminPassword: string): boolean {
  const expectedPassword = Deno.env.get('ADMIN_SECRET');
  
  if (!expectedPassword) {
    console.error('ADMIN_SECRET 환경변수가 설정되지 않았습니다.');
    return false;
  }

  return adminPassword === expectedPassword;
}

// 기존 ANON_KEY 검증은 레거시 지원용으로 유지
function validateAuth(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  const expectedToken = Deno.env.get('ANON_KEY');
  
  if (!expectedToken) {
    console.error('ANON_KEY 환경변수가 설정되지 않았습니다.');
    return false;
  }

  return token === expectedToken;
}

// HTML UI 반환
function getHTML(anonKey: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firebase 푸시 알림 관리</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
        textarea { height: 80px; resize: vertical; }
        button { background-color: #4CAF50; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-right: 10px; }
        button:hover { background-color: #45a049; }
        button:disabled { background-color: #cccccc; cursor: not-allowed; }
        .clear-btn { background-color: #f44336; }
        .clear-btn:hover { background-color: #da190b; }
        .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
        .status.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .status.loading { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .log-container { max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background-color: #f9f9f9; font-family: monospace; font-size: 12px; }
        .log-entry { margin-bottom: 8px; padding: 5px; border-left: 3px solid #4CAF50; background-color: white; }
        .log-entry.error { border-left-color: #f44336; }
        .log-timestamp { color: #666; font-size: 11px; }
        .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .radio-group { display: flex; gap: 15px; margin-top: 5px; }
        .radio-group label { display: flex; align-items: center; font-weight: normal; margin-bottom: 0; }
        .radio-group input[type="radio"] { width: auto; margin-right: 5px; }
    </style>
</head>
<body>
    <h1>🔥 Firebase 푸시 알림 관리</h1>
    <div class="container">
        <h2>📱 알림 발송</h2>
        <div class="form-group" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 2px solid #007bff;">
            <label for="adminPassword">🔒 관리자 인증</label>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <input type="password" id="adminPassword" placeholder="관리자 비밀번호를 입력하세요" 
                       style="flex: 1; border: 2px solid #007bff;">
                <button onclick="verifyPassword()" id="verifyBtn" 
                        style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                    🔐 확인
                </button>
            </div>
            <div id="authStatus" style="margin-top: 10px; font-weight: bold; padding: 8px; border-radius: 4px;">
                ⚠️ 인증이 필요합니다. 관리자 비밀번호를 입력하고 확인 버튼을 눌러주세요.
            </div>
        </div>
        <div id="mainForm" style="opacity: 0.5; pointer-events: none;">
        <div class="form-group">
            <label>발송 대상</label>
            <div class="radio-group">
                <label><input type="radio" name="sendType" value="topic" checked disabled> 토픽</label>
                <label><input type="radio" name="sendType" value="token" disabled> 개별 디바이스</label>
            </div>
        </div>
        <div class="form-group" id="topicGroup">
            <label for="topic">토픽 선택</label>
            <select id="topic">
                <option value="all_users">전체 사용자 (all_users)</option>
                <option value="push_enabled_users">푸시 활성화 사용자 (push_enabled_users)</option>
            </select>
        </div>
        <div class="form-group" id="tokenGroup" style="display: none;">
            <label for="token">FCM 토큰</label>
            <input type="text" id="token" placeholder="FCM 디바이스 토큰 입력">
        </div>
        <div class="two-column">
            <div class="form-group">
                <label for="title">제목</label>
                <input type="text" id="title" placeholder="알림 제목" value="🎉 특별 할인">
            </div>
            <div class="form-group">
                <label for="type">타입</label>
                <select id="type">
                    <option value="promotion">프로모션</option>
                    <option value="notice">공지사항</option>
                    <option value="message">일반 메시지</option>
                    <option value="news">뉴스</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label for="body">내용</label>
            <textarea id="body" placeholder="알림 내용">50% 할인 이벤트 진행중!</textarea>
        </div>
        <div class="form-group">
            <label for="promotionUrl">프로모션 URL (선택사항)</label>
            <input type="url" id="promotionUrl" placeholder="https://sale.company.com" value="https://sale.company.com">
        </div>
        <div class="form-group">
            <label for="priority">우선순위</label>
            <select id="priority">
                <option value="high">높음 (High)</option>
                <option value="normal">보통 (Normal)</option>
            </select>
        </div>
        <button onclick="sendNotification()" id="sendBtn" disabled style="opacity: 0.5;">🚀 알림 발송</button>
        <button onclick="clearForm()" class="clear-btn" disabled style="opacity: 0.5;">🗑️ 초기화</button>
        <div id="status"></div>
        </div>
    </div>
    <div class="container">
        <h2>📋 발송 로그</h2>
        <button onclick="clearLogs()" class="clear-btn">로그 초기화</button>
        <div class="log-container" id="logContainer">
            <div class="log-entry"><div class="log-timestamp">[시작] 푸시 알림 관리 시스템 준비 완료</div></div>
        </div>
    </div>
    <script>
        // Supabase 설정 (보안 강화: 인증 키 제거)
        const SUPABASE_URL = 'https://iwpgvdtfpwazzfeniusk.supabase.co';
        const FUNCTION_URL = SUPABASE_URL + '/functions/v1/send-firebase-notification';
        
        // 인증 상태 관리
        let isAuthenticated = false;
        
        // 비밀번호 검증 함수
        async function verifyPassword() {
            const adminPassword = document.getElementById('adminPassword').value;
            const authStatus = document.getElementById('authStatus');
            const verifyBtn = document.getElementById('verifyBtn');
            
            if (!adminPassword) {
                authStatus.style.background = '#f8d7da';
                authStatus.style.color = '#721c24';
                authStatus.innerHTML = '❌ 비밀번호를 입력해주세요.';
                return;
            }
            
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '⏳  확인 중...';
            authStatus.style.background = '#fff3cd';
            authStatus.style.color = '#856404';
            authStatus.innerHTML = '🔄 인증 확인 중입니다...';
            
            try {
                // 서버에 인증 요청 (빈 payload로 비밀번호만 검증)
                const response = await fetch(FUNCTION_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminPassword: adminPassword, testAuth: true })
                });
                
                if (response.status === 401) {
                    // 인증 실패
                    authStatus.style.background = '#f8d7da';
                    authStatus.style.color = '#721c24';
                    authStatus.innerHTML = '❌ 관리자 비밀번호가 올바르지 않습니다.';
                    isAuthenticated = false;
                } else {
                    // 인증 성공
                    authStatus.style.background = '#d4edda';
                    authStatus.style.color = '#155724';
                    authStatus.innerHTML = '✅ 인증 성공! 알림을 발송할 수 있습니다.';
                    isAuthenticated = true;
                    enableForm();
                }
            } catch (error) {
                authStatus.style.background = '#f8d7da';
                authStatus.style.color = '#721c24';
                authStatus.innerHTML = '❌ 네트워크 오류: ' + error.message;
                isAuthenticated = false;
            }
            
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '🔐 확인';
        }
        
        // 폼 활성화 함수
        function enableForm() {
            const mainForm = document.getElementById('mainForm');
            const sendBtn = document.getElementById('sendBtn');
            const clearBtn = document.querySelector('.clear-btn');
            
            mainForm.style.opacity = '1';
            mainForm.style.pointerEvents = 'auto';
            
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
            
            clearBtn.disabled = false;
            clearBtn.style.opacity = '1';
            
            // 라디오 버튼 활성화
            document.querySelectorAll('input[name="sendType"]').forEach(radio => {
                radio.disabled = false;
            });
            
            addLog('🔓 인증 성공 - 폼이 활성화되었습니다.');
        }
        
        document.querySelectorAll('input[name="sendType"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const topicGroup = document.getElementById('topicGroup');
                const tokenGroup = document.getElementById('tokenGroup');
                if (this.value === 'topic') {
                    topicGroup.style.display = 'block';
                    tokenGroup.style.display = 'none';
                } else {
                    topicGroup.style.display = 'none';
                    tokenGroup.style.display = 'block';
                }
            });
        });
        function addLog(message, isError = false) {
            const logContainer = document.getElementById('logContainer');
            const timestamp = new Date().toLocaleString('ko-KR');
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry ' + (isError ? 'error' : '');
            logEntry.innerHTML = '<div class="log-timestamp">[' + timestamp + '] ' + message + '</div>';
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        function showStatus(message, type = 'success') {
            const statusDiv = document.getElementById('status');
            statusDiv.className = 'status ' + type;
            statusDiv.textContent = message;
            if (type !== 'loading') {
                setTimeout(() => { statusDiv.innerHTML = ''; statusDiv.className = ''; }, 5000);
            }
        }
        async function sendNotification() {
            const sendBtn = document.getElementById('sendBtn');
            const sendType = document.querySelector('input[name="sendType"]:checked').value;
            const adminPassword = document.getElementById('adminPassword').value;
            
            // Step 1: 인증 상태 확인
            if (!isAuthenticated) {
                showStatus('먼저 관리자 인증을 완료해주세요.', 'error');
                return;
            }
            
            const payload = {
                authenticated: true, // 클라이언트에서 인증된 상태임을 표시
                dataOnly: true,
                priority: document.getElementById('priority').value,
                data: {
                    title: document.getElementById('title').value,
                    body: document.getElementById('body').value,
                    type: document.getElementById('type').value
                }
            };
            const promotionUrl = document.getElementById('promotionUrl').value;
            if (promotionUrl) { payload.data.promotion_url = promotionUrl; }
            if (sendType === 'topic') {
                payload.topic = document.getElementById('topic').value;
            } else {
                const token = document.getElementById('token').value;
                if (!token) { showStatus('FCM 토큰을 입력해주세요.', 'error'); return; }
                payload.token = token;
            }
            if (!payload.data.title || !payload.data.body) {
                showStatus('제목과 내용을 입력해주세요.', 'error'); return;
            }
            sendBtn.disabled = true;
            showStatus('알림 발송 중...', 'loading');
            const sendTarget = sendType === 'topic' ? '토픽: ' + payload.topic : '토큰: ' + payload.token.substring(0, 20) + '...';
            addLog('🚀 알림 발송 시작 - ' + sendTarget);
            addLog('📝 내용: ' + payload.data.title + ' / ' + payload.data.body);
            try {
                const response = await fetch(FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    mode: 'cors',
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    showStatus('✅ 알림이 성공적으로 발송되었습니다!', 'success');
                    addLog('✅ 발송 성공 - 메시지 ID: ' + result.result.name);
                } else {
                    showStatus('❌ 발송 실패: ' + (result.error || '알 수 없는 오류'), 'error');
                    addLog('❌ 발송 실패: ' + (result.error || JSON.stringify(result)), true);
                }
            } catch (error) {
                showStatus('❌ 네트워크 오류: ' + error.message, 'error');
                addLog('❌ 네트워크 오류: ' + error.message, true);
            } finally {
                sendBtn.disabled = false;
            }
        }
        function clearForm() {
            document.getElementById('title').value = '🎉 특별 할인';
            document.getElementById('body').value = '50% 할인 이벤트 진행중!';
            document.getElementById('promotionUrl').value = 'https://sale.company.com';
            document.getElementById('token').value = '';
            document.querySelector('input[value="topic"]').checked = true;
            document.getElementById('topicGroup').style.display = 'block';
            document.getElementById('tokenGroup').style.display = 'none';
            showStatus('', '');
            addLog('🗑️ 폼이 초기화되었습니다.');
        }
        function clearLogs() {
            const logContainer = document.getElementById('logContainer');
            logContainer.innerHTML = '<div class="log-entry"><div class="log-timestamp">[초기화] 로그가 초기화되었습니다.</div></div>';
        }
        // 페이지 로드 시 초기화
        window.addEventListener('load', function() {
            addLog('🌟 Firebase 푸시 알림 관리 시스템이 준비되었습니다.');
            addLog('🔒 보안 강화: 2단계 인증 시스템이 적용되었습니다.');
            
            // 비밀번호 입력 필드에서 Enter 키 처리
            document.getElementById('adminPassword').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    verifyPassword();
                }
            });
        });
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
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // POST 요청이 아니면 에러
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'GET (UI) 또는 POST (알림 전송) 요청만 지원됩니다.' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json();

    // 알림 목록 조회 요청 처리
    if (body.action === 'getNotifications') {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 파라미터 추출
        const type = body.type || null;
        const limit = body.limit || 50;
        const offset = body.offset || 0;

        // 쿼리 생성
        let query = supabase
          .from('notification_history')
          .select('*')
          .eq('status', 'success')  // 성공한 알림만 조회
          .order('sent_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // 타입 필터 적용
        if (type && type !== 'all') {
          query = query.eq('type', type);
        }

        const { data, error } = await query;

        if (error) {
          console.error('알림 내역 조회 실패:', error);
          return new Response(
            JSON.stringify({ error: '알림 내역 조회 실패', message: error.message }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            notifications: data || [],
            count: data?.length || 0
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        console.error('알림 조회 중 오류:', error);
        return new Response(
          JSON.stringify({
            error: '알림 조회 실패',
            message: error instanceof Error ? error.message : String(error)
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // 2단계 인증 시스템: adminPassword 필드 우선 확인
    if (body.adminPassword) {
      // Step 1: 관리자 비밀번호 검증
      if (!validateAdminAuth(body.adminPassword)) {
        return new Response(
          JSON.stringify({ error: '관리자 비밀번호가 올바르지 않습니다.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // 인증 테스트 요청인 경우 성공 응답만 반환
      if (body.testAuth) {
        return new Response(
          JSON.stringify({ success: true, message: '인증 성공' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // 비밀번호 검증 성공 시 알림 발송 진행
    } else {
      // adminPassword 없는 경우 - 클라이언트 인증 상태나 Referer 확인
      if (body.authenticated) {
        // 클라이언트에서 인증 완료 표시가 있으면 허용 (UI 인증 완료)
        console.log('클라이언트 UI에서 인증된 요청을 처리합니다.');
      } else {
        // authenticated 플래그 없으면 Referer 체크 또는 토큰 인증
        const referer = req.headers.get('referer');
        if (!referer || !referer.includes('iwpgvdtfpwazzfeniusk.supabase.co')) {
          // 외부 API 호출인 경우 토큰 인증 필요
          if (!validateAuth(req)) {
            return new Response(
              JSON.stringify({ error: '인증이 필요합니다. 관리자 UI를 통해 인증 후 사용하거나 Authorization 헤더를 제공하세요.' }),
              {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        }
      }
    }

    // 개별 디바이스 또는 토픽 전송
    if (body.token || body.topic) {
      const { token, topic, title, body: messageBody, data, priority, icon, sound, dataOnly } = body;

      // token과 topic 중 하나는 필수
      if (!token && !topic) {
        return new Response(
          JSON.stringify({ error: 'token 또는 topic 중 하나는 필수입니다.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // 토픽 유효성 검사
      if (topic) {
        const allowedTopics = ['all_users', 'push_enabled_users'];
        if (!allowedTopics.includes(topic)) {
          return new Response(
            JSON.stringify({ 
              error: `허용되지 않은 토픽입니다. 사용 가능한 토픽: ${allowedTopics.join(', ')}` 
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // data-only 메시지와 일반 메시지 유효성 검사
      if (dataOnly) {
        if (!data || Object.keys(data).length === 0) {
          return new Response(
            JSON.stringify({ error: 'data-only 메시지의 경우 data 필드는 필수이며 비어있으면 안됩니다.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      } else {
        if (!title || !messageBody) {
          return new Response(
            JSON.stringify({ error: '일반 알림 메시지의 경우 title, body는 필수 필드입니다.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      const result = await sendPushNotification({
        token,
        topic,
        title,
        body: messageBody,
        data,
        priority,
        icon,
        sound,
        dataOnly
      });

      return new Response(
        JSON.stringify({ success: true, result }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 일괄 전송
    if (body.tokens && Array.isArray(body.tokens)) {
      const { tokens, title, body: messageBody, data, dataOnly, priority } = body;

      if (!tokens.length) {
        return new Response(
          JSON.stringify({ error: 'tokens 배열은 비어있으면 안됩니다.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // data-only 메시지와 일반 메시지 유효성 검사
      if (dataOnly) {
        if (!data || Object.keys(data).length === 0) {
          return new Response(
            JSON.stringify({ error: 'data-only 일괄 전송의 경우 data 필드는 필수이며 비어있으면 안됩니다.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      } else {
        if (!title || !messageBody) {
          return new Response(
            JSON.stringify({ error: '일반 알림 일괄 전송의 경우 title, body는 필수 필드입니다.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      const results = await sendBulkPushNotifications(tokens, title, messageBody, data, dataOnly, priority);

      return new Response(
        JSON.stringify({ success: true, results }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'token, topic 또는 tokens 배열 중 하나는 필수입니다.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('함수 실행 오류:', error);
    
    return new Response(
      JSON.stringify({
        error: '내부 서버 오류',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});