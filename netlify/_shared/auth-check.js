// 관리자 인증 확인 및 자동 리다이렉트
// 모든 관리 페이지에서 사용

(function() {
    // 로그인 페이지는 체크 안 함
    if (window.location.pathname.includes('admin-login.html')) {
        return;
    }

    // 메인 페이지(index.html)는 체크 안 함 (공개 페이지)
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        return;
    }

    // 관리자 비밀번호 확인
    const adminSecret = sessionStorage.getItem('adminSecret');
    const loginTime = sessionStorage.getItem('adminLoginTime');

    if (!adminSecret) {
        // 로그인 안 되어 있음 - 로그인 페이지로
        alert('관리자 로그인이 필요합니다.');
        window.location.href = 'admin-login.html';
        return;
    }

    // 세션 만료 체크 (24시간)
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursPassed = (now - loginDate) / (1000 * 60 * 60);

        if (hoursPassed > 24) {
            // 세션 만료
            sessionStorage.removeItem('adminSecret');
            sessionStorage.removeItem('adminLoginTime');
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            window.location.href = 'admin-login.html';
            return;
        }
    }

    // 로그아웃 버튼 추가
    window.addEventListener('DOMContentLoaded', () => {
        addLogoutButton();
    });
})();

// 로그아웃 버튼 추가
function addLogoutButton() {
    const header = document.querySelector('.header');
    if (!header) return;

    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = '🚪 로그아웃';
    logoutBtn.style.cssText = `
        position: absolute;
        top: 30px;
        right: 30px;
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9em;
    `;

    logoutBtn.addEventListener('click', logout);
    logoutBtn.addEventListener('mouseover', () => {
        logoutBtn.style.background = 'rgba(255,255,255,0.3)';
    });
    logoutBtn.addEventListener('mouseout', () => {
        logoutBtn.style.background = 'rgba(255,255,255,0.2)';
    });

    header.appendChild(logoutBtn);
}

// 로그아웃 함수
function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        sessionStorage.removeItem('adminSecret');
        sessionStorage.removeItem('adminLoginTime');
        window.location.href = 'admin-login.html';
    }
}

// API 호출 시 사용할 헤더 가져오기
function getAuthHeaders() {
    const adminSecret = sessionStorage.getItem('adminSecret');

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'x-admin-secret': adminSecret
    };
}
