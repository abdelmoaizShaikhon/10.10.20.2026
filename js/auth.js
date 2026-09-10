// ============================================
// 🔐 دوال المصادقة - شركة العبادي
// ============================================

// عدد محاولات الدخول الفاشلة
let loginAttempts = 0;
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 دقيقة

// تبديل إظهار/إخفاء كلمة المرور
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password');
    if (!passwordInput || !toggleBtn) return;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

// تشفير كلمة المرور (SHA-256)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'ALABADY_SALT_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// التحقق من قفل الحساب
function isAccountLocked() {
    const lockData = localStorage.getItem('account_lock');
    if (!lockData) return false;

    try {
        const lockInfo = JSON.parse(lockData);
        const now = Date.now();
        if (now - lockInfo.timestamp > LOCK_TIME) {
            localStorage.removeItem('account_lock');
            loginAttempts = 0;
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// قفل الحساب
function lockAccount() {
    const lockData = {
        timestamp: Date.now(),
        attempts: loginAttempts
    };
    localStorage.setItem('account_lock', JSON.stringify(lockData));
    showToast('🔒 تم قفل الحساب مؤقتاً، حاول بعد 15 دقيقة', 'error');
}

// تسجيل محاولة فاشلة
function recordFailedAttempt() {
    loginAttempts++;
    localStorage.setItem('login_attempts', loginAttempts.toString());

    if (loginAttempts >= MAX_ATTEMPTS) {
        lockAccount();
    } else {
        const remaining = MAX_ATTEMPTS - loginAttempts;
        showToast(`⚠️ متبقي ${remaining} محاولة قبل قفل الحساب`, 'error');
    }
}

// إعادة تعيين المحاولات
function resetAttempts() {
    loginAttempts = 0;
    localStorage.removeItem('login_attempts');
}

// التحقق من الجلسة
function checkSession() {
    const session = localStorage.getItem('alabady_session');
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

// إنشاء جلسة
function createSession(user) {
    const session = {
        id: user.id || user._id,
        username: user.username,
        fullName: user.full_name || user.fullName || user.username,
        role: user.role || 'user',
        permissions: user.permissions || {},
        expires: Date.now() + (24 * 60 * 60 * 1000),
        loginTime: new Date().toISOString()
    };

    localStorage.setItem('alabady_session', JSON.stringify(session));
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    logUserActivity(user.username, 'login');
    return session;
}

// الحصول على المستخدم الحالي
function getCurrentUser() {
    try {
        const session = localStorage.getItem('alabady_session');
        if (session) return JSON.parse(session);
        return null;
    } catch {
        return null;
    }
}

// تسجيل الخروج
function logout() {
    const user = getCurrentUser();
    if (user) {
        logUserActivity(user.username, 'logout');
    }
    localStorage.removeItem('alabady_session');
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

// تسجيل نشاط المستخدم
async function logUserActivity(username, action) {
    try {
        const logData = {
            username: username,
            action: action,
            ip: await getClientIP(),
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        if (typeof add === 'function') {
            await add('activity_logs', logData);
        }
        console.log('📝 نشاط المستخدم:', logData);
    } catch (error) {
        console.warn('⚠️ فشل تسجيل النشاط:', error);
    }
}

// الحصول على IP العميل
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || 'unknown';
    } catch {
        return 'unknown';
    }
}

// ✅ معالج تسجيل الدخول
async function handleLogin(event) {
    event.preventDefault();

    if (isAccountLocked()) {
        showToast('🔒 الحساب مقفل مؤقتاً، حاول بعد 15 دقيقة', 'error');
        return;
    }

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showToast('⚠️ يرجى إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }

    loginBtn.disabled = true;
    loginText.innerHTML = '⏳ جاري التحقق... <span class="loading-spinner"></span>';

    try {
        let user = null;
        let isLocal = false;
        
        // ✅ محاولة من قاعدة البيانات
        try {
            if (typeof query === 'function') {
                const users = await query('users', { username: username });
                if (users && users.length > 0) {
                    user = users[0];
                    console.log('✅ تم العثور على المستخدم في قاعدة البيانات');
                }
            }
        } catch (dbError) {
            console.warn('⚠️ فشل الاتصال بقاعدة البيانات، استخدام المستخدمين المحليين');
            isLocal = true;
        }

        // ✅ المستخدمين المحليين
        const localUsers = [
            {
                id: 1,
                username: 'admin',
                password: await hashPassword('admin123'),
                full_name: 'مدير النظام',
                role: 'admin',
                is_active: true,
                permissions: { all: true }
            },
            {
                id: 2,
                username: 'manager',
                password: await hashPassword('manager123'),
                full_name: 'مدير',
                role: 'manager',
                is_active: true,
                permissions: { 
                    dashboard: true, pos: true, products: true, 
                    purchases: true, sales: true, customers: true,
                    suppliers: true, reports: true, expenses: true,
                    users: true, accounts: true
                }
            },
            {
                id: 3,
                username: 'cashier',
                password: await hashPassword('cashier123'),
                full_name: 'كاشير',
                role: 'cashier',
                is_active: true,
                permissions: { 
                    dashboard: true, pos: true, products: true,
                    sales: true, customers: true
                }
            }
        ];

        if (!user) {
            const localUser = localUsers.find(u => u.username === username);
            if (localUser) {
                user = localUser;
                isLocal = true;
                console.log('✅ تم العثور على المستخدم محلياً');
            }
        }

        if (!user) {
            recordFailedAttempt();
            errorText.textContent = 'اسم المستخدم غير موجود';
            errorDiv.classList.add('show');
            showToast('❌ اسم المستخدم غير موجود', 'error');
            loginBtn.disabled = false;
            loginText.textContent = '🚀 تسجيل الدخول';
            return;
        }

        if (user.is_active === false) {
            errorText.textContent = 'الحساب غير نشط، تواصل مع المدير';
            errorDiv.classList.add('show');
            showToast('❌ الحساب غير نشط', 'error');
            loginBtn.disabled = false;
            loginText.textContent = '🚀 تسجيل الدخول';
            return;
        }

        // ✅ التحقق من كلمة المرور
        let isPasswordValid = false;
        
        if (isLocal) {
            const hashedInput = await hashPassword(password);
            isPasswordValid = hashedInput === user.password;
        } else {
            isPasswordValid = password === user.password;
        }

        if (!isPasswordValid) {
            recordFailedAttempt();
            errorText.textContent = 'كلمة المرور غير صحيحة';
            errorDiv.classList.add('show');
            showToast('❌ كلمة المرور غير صحيحة', 'error');
            passwordInput.value = '';
            passwordInput.focus();
            loginBtn.disabled = false;
            loginText.textContent = '🚀 تسجيل الدخول';
            return;
        }

        // ✅ نجاح تسجيل الدخول
        resetAttempts();
        createSession(user);
        errorDiv.classList.remove('show');
        
        if (document.getElementById('rememberMe')?.checked) {
            localStorage.setItem('saved_username', username);
        } else {
            localStorage.removeItem('saved_username');
        }

        showToast(`✅ مرحباً ${user.full_name || user.username}`, 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        showToast('❌ حدث خطأ، حاول مرة أخرى', 'error');
        loginBtn.disabled = false;
        loginText.textContent = '🚀 تسجيل الدخول';
    }
}

// ✅ حماية الصفحات
function protectPage(requiredPermission = null) {
    if (!checkSession()) return false;
    
    const user = getCurrentUser();
    if (!user) return false;
    
    if (requiredPermission) {
        const perms = user.permissions || {};
        if (user.role !== 'admin' && !perms.all && !perms[requiredPermission]) {
            showToast('⛔ ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            return false;
        }
    }
    
    return true;
}

// ✅ تصدير الدوال
window.togglePassword = togglePassword;
window.hashPassword = hashPassword;
window.handleLogin = handleLogin;
window.checkSession = checkSession;
window.getCurrentUser = getCurrentUser;
window.logout = logout;
window.protectPage = protectPage;

// ✅ التحقق من الجلسة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    const savedAttempts = localStorage.getItem('login_attempts');
    if (savedAttempts) {
        loginAttempts = parseInt(savedAttempts) || 0;
    }
    
    const savedUsername = localStorage.getItem('saved_username');
    if (savedUsername) {
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.value = savedUsername;
            const rememberMe = document.getElementById('rememberMe');
            if (rememberMe) rememberMe.checked = true;
        }
    }
    
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('index.html')) {
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.focus();
    }
    
    console.log('🔐 نظام المصادقة جاهز - شركة العبادي');
});

console.log('✅ auth.js loaded successfully');