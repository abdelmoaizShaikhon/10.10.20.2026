// ============================================
// 🛡️ إدارة الجلسات - شركة العبادي
// ============================================

// التحقق من الجلسة
function checkSession() {
    const session = localStorage.getItem('fg_session');
    if (!session) {
        redirectToLogin();
        return false;
    }

    try {
        const data = JSON.parse(session);
        if (data.expires < Date.now()) {
            logout();
            return false;
        }
        return true;
    } catch (error) {
        logout();
        return false;
    }
}

// الحصول على المستخدم الحالي
function getCurrentUser() {
    try {
        const session = localStorage.getItem('fg_session');
        if (session) return JSON.parse(session);
        return null;
    } catch {
        return null;
    }
}

// تسجيل الخروج
function logout() {
    localStorage.removeItem('fg_session');
    localStorage.removeItem('currentUser');
    redirectToLogin();
}

// التوجيه إلى صفحة الدخول
function redirectToLogin() {
    if (!window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('index.html')) {
        window.location.href = 'login.html';
    }
}

// حماية الصفحات
function protectPage() {
    if (!checkSession()) return false;
    return true;
}

// تصدير الدوال
window.checkSession = checkSession;
window.getCurrentUser = getCurrentUser;
window.logout = logout;
window.protectPage = protectPage;