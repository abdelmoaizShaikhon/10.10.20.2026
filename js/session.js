// ============================================
// 🛡️ إدارة الجلسات - شركة العبادي
// ============================================

// ============================================
// 🔑 مفاتيح التخزين الموحدة
// ============================================
const SESSION_KEY = 'alabady_session';
const USER_KEY = 'currentUser';
const REMEMBER_KEY = 'remember_me';

// ============================================
// ✅ التحقق من الجلسة
// ============================================
function checkSession() {
    try {
        const session = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);

        if (!session) {
            redirectToLogin();
            return false;
        }

        const data = JSON.parse(session);

        // فحص انتهاء الجلسة
        if (data.expires && data.expires < Date.now()) {
            console.warn('⏰ انتهت الجلسة');
            logout(false); // بدون تأكيد
            return false;
        }

        // فحص وجود اسم المستخدم
        if (!data.username) {
            console.warn('⚠️ جلسة غير صالحة');
            logout(false);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ خطأ في فحص الجلسة:', error);
        logout(false);
        return false;
    }
}

// ============================================
// 👤 الحصول على المستخدم الحالي
// ============================================
function getCurrentUser() {
    try {
        const session = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (session) {
            const data = JSON.parse(session);
            return data;
        }
        return null;
    } catch (error) {
        console.warn('خطأ في قراءة المستخدم:', error);
        return null;
    }
}

// ============================================
// 💾 إنشاء جلسة جديدة
// ============================================
function createSession(user, remember = true) {
    const session = {
        id: user.id || user._id,
        username: user.username,
        fullName: user.full_name || user.fullName || user.username,
        role: user.role || 'user',
        permissions: user.permissions || {},
        expires: Date.now() + (24 * 60 * 60 * 1000), // 24 ساعة
        loginTime: new Date().toISOString()
    };

    try {
        if (remember) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            localStorage.setItem(USER_KEY, JSON.stringify(session));
            localStorage.setItem(REMEMBER_KEY, 'true');
        } else {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
            sessionStorage.setItem(USER_KEY, JSON.stringify(session));
            localStorage.removeItem(REMEMBER_KEY);
        }

        console.log('✅ تم إنشاء الجلسة:', session.username);
        return session;
    } catch (error) {
        console.error('❌ خطأ في إنشاء الجلسة:', error);
        return null;
    }
}

// ============================================
// 🚪 تسجيل الخروج
// ============================================
function logout(confirmFirst = true) {
    // تأكيد قبل الخروج (إذا كان مفعلاً)
    if (confirmFirst && typeof window.confirm === 'function') {
        if (!window.confirm('هل تريد تسجيل الخروج من النظام؟')) {
            return;
        }
    }

    try {
        // حذف جميع بيانات الجلسة
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(USER_KEY);
        localStorage.removeItem(REMEMBER_KEY);

        console.log('👋 تم تسجيل الخروج');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الخروج:', error);
    }

    redirectToLogin();
}

// ============================================
// 🔄 التوجيه إلى صفحة الدخول
// ============================================
function redirectToLogin() {
    const path = window.location.pathname;

    // لا توجّه إذا كنا في صفحة الدخول
    if (path.includes('login.html')) {
        return;
    }

    console.log('🔄 توجيه إلى صفحة الدخول...');
    window.location.replace('login.html');
}

// ============================================
// 🛡️ حماية الصفحة
// ============================================
function protectPage(requiredPermission = null) {
    if (!checkSession()) {
        return false;
    }

    const user = getCurrentUser();
    if (!user) {
        return false;
    }

    // فحص الصلاحيات
    if (requiredPermission && user.role !== 'admin') {
        const perms = user.permissions || {};
        if (!perms.all && !perms[requiredPermission]) {
            console.warn('⛔ ليس لديك صلاحية للوصول');
            if (typeof showToast === 'function') {
                showToast('⛔ ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
            }
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            return false;
        }
    }

    return true;
}

// ============================================
// 🔍 التحقق من تسجيل الدخول
// ============================================
function isLoggedIn() {
    try {
        const session = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (!session) return false;

        const data = JSON.parse(session);
        if (data.expires && data.expires < Date.now()) return false;

        return !!data.username;
    } catch {
        return false;
    }
}

// ============================================
// ⏱️ تمديد الجلسة
// ============================================
function extendSession() {
    try {
        const session = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (!session) return false;

        const data = JSON.parse(session);
        data.expires = Date.now() + (24 * 60 * 60 * 1000); // تمديد 24 ساعة

        // حفظ في نفس المكان الذي جاءت منه
        if (localStorage.getItem(SESSION_KEY)) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        } else {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
        }

        return true;
    } catch {
        return false;
    }
}

// ============================================
// 🌐 إتاحة الدوال عالمياً
// ============================================
window.checkSession = checkSession;
window.getCurrentUser = getCurrentUser;
window.createSession = createSession;
window.logout = logout;
window.redirectToLogin = redirectToLogin;
window.protectPage = protectPage;
window.isLoggedIn = isLoggedIn;
window.extendSession = extendSession;

// ============================================
// 🚀 التهيئة عند تحميل الصفحة
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // إذا كان المستخدم في صفحة محمية، فحص الجلسة تلقائياً
    const protectedPages = ['index.html', 'dashboard.html', 'sales.html', 
                            'products.html', 'purchases.html', 'customers.html',
                            'suppliers.html', 'accounts.html', 'transfers.html',
                            'expenses.html', 'reports.html', 'users.html', 'settings.html'];
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (protectedPages.includes(currentPage)) {
        // فحص الجلسة
        if (!checkSession()) {
            return; // سيتم التوجيه تلقائياً
        }

        // تحديث اسم المستخدم في الواجهة
        const user = getCurrentUser();
        if (user) {
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = '👤 ' + (user.fullName || user.username);
            }

            const currentUserInfoEl = document.getElementById('currentUserInfo');
            if (currentUserInfoEl) {
                currentUserInfoEl.textContent = user.fullName || user.username;
            }
        }

        // تمديد الجلسة تلقائياً عند كل تفاعل
        let extendTimeout;
        document.addEventListener('click', () => {
            clearTimeout(extendTimeout);
            extendTimeout = setTimeout(() => {
                extendSession();
            }, 1000);
        });
    }
});

console.log('✅ session.js loaded successfully');
