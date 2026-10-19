// ============================================
// 🛡️ إدارة الجلسات - شركة العبادي
// ============================================

// 🔑 المفاتيح الموحدة (معرفة هنا فقط)
const SESSION_KEY = 'alabady_session';
const USER_KEY = 'currentUser';
const REMEMBER_KEY = 'remember_me';

// ✅ التحقق من الجلسة
function checkSession() {
    try {
        const session = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (!session) {
            redirectToLogin();
            return false;
        }
        const data = JSON.parse(session);
        if (data.expires && data.expires < Date.now()) {
            logout(false);
            return false;
        }
        if (!data.username) {
            logout(false);
            return false;
        }
        return true;
    } catch (error) {
        logout(false);
        return false;
    }
}

// 👤 الحصول على المستخدم الحالي
function getCurrentUser() {
    try {
        const session = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        return session ? JSON.parse(session) : null;
    } catch (error) {
        return null;
    }
}

// 💾 إنشاء جلسة جديدة
function createSession(user, remember = true) {
    const session = {
        id: user.id || user._id,
        username: user.username,
        fullName: user.full_name || user.fullName || user.username,
        role: user.role || 'user',
        permissions: user.permissions || {},
        expires: Date.now() + (24 * 60 * 60 * 1000),
        loginTime: new Date().toISOString()
    };

    try {
        if (remember) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            localStorage.setItem(USER_KEY, JSON.stringify(session));
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(USER_KEY);
        } else {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
            sessionStorage.setItem(USER_KEY, JSON.stringify(session));
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(USER_KEY);
        }
        return session;
    } catch (error) {
        return null;
    }
}

// 🚪 تسجيل الخروج
function logout(confirmFirst = true) {
    if (confirmFirst && typeof window.confirm === 'function') {
        if (!window.confirm('هل تريد تسجيل الخروج من النظام؟')) return;
    }
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    redirectToLogin();
}

// 🔄 التوجيه إلى صفحة الدخول
function redirectToLogin() {
    const path = window.location.pathname;
    if (!path.includes('login.html')) {
        window.location.replace('login.html');
    }
}

// 🌐 إتاحة الدوال عالمياً
window.checkSession = checkSession;
window.getCurrentUser = getCurrentUser;
window.createSession = createSession;
window.logout = logout;
window.redirectToLogin = redirectToLogin;
