// ============================================
// 🔐 نظام المصادقة والجلسة - شركة العبادي
// ============================================

// ============================================
// المتغيرات العامة
// ============================================
// ============================================
// 🔐 نظام المصادقة والجلسة - شركة العبادي
// ============================================

let loginAttempts = 0;
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; 
const LOCK_KEY = 'account_lock';
const ATTEMPTS_KEY = 'login_attempts';
const SALT = 'ALABADY_SALT_2026';

// ... (باقي دوالك كما هي بدون أي تعريف لـ SESSION_KEY)

// ============================================
// 🔒 تبديل إظهار/إخفاء كلمة المرور
// ============================================
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggleBtn') || document.querySelector('.toggle-password');
    if (!passwordInput || !toggleBtn) return;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

// ============================================
// 🔐 تشفير كلمة المرور (SHA-256)
// ============================================
async function hashPassword(password) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + SALT);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        console.warn('خطأ في التشفير:', e);
        return password;
    }
}

// ============================================
// 🔒 التحقق من قفل الحساب
// ============================================
function isAccountLocked() {
    const lockData = localStorage.getItem(LOCK_KEY);
    if (!lockData) return false;

    try {
        const lockInfo = JSON.parse(lockData);
        const now = Date.now();
        if (now - lockInfo.timestamp > LOCK_TIME) {
            localStorage.removeItem(LOCK_KEY);
            loginAttempts = 0;
            localStorage.removeItem(ATTEMPTS_KEY);
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// ============================================
// 🔒 قفل الحساب
// ============================================
function lockAccount() {
    const lockData = {
        timestamp: Date.now(),
        attempts: loginAttempts
    };
    localStorage.setItem(LOCK_KEY, JSON.stringify(lockData));
}

// ============================================
// 📊 تسجيل محاولة فاشلة
// ============================================
function recordFailedAttempt() {
    loginAttempts++;
    localStorage.setItem(ATTEMPTS_KEY, loginAttempts.toString());

    if (loginAttempts >= MAX_ATTEMPTS) {
        lockAccount();
    }
}

// ============================================
// 🔄 إعادة تعيين المحاولات
// ============================================
function resetAttempts() {
    loginAttempts = 0;
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCK_KEY);
}

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

        if (data.expires && data.expires < Date.now()) {
            logout();
            return false;
        }

        return true;
    } catch (error) {
        console.warn('خطأ في قراءة الجلسة:', error);
        logout();
        return false;
    }
}

// ============================================
// ✅ إنشاء جلسة
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

    if (remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(USER_KEY, JSON.stringify(session));
    } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        sessionStorage.setItem(USER_KEY, JSON.stringify(session));
    }

    logUserActivity(user.username, 'login');
    return session;
}

// ============================================
// 👤 الحصول على المستخدم الحالي
// ============================================
function getCurrentUser() {
    try {
        const session = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (session) return JSON.parse(session);
        return null;
    } catch {
        return null;
    }
}

// ============================================
// 🚪 تسجيل الخروج
// ============================================
function logout() {
    if (typeof confirm === 'function' && !window.location.pathname.includes('login.html')) {
        if (!confirm('هل تريد تسجيل الخروج من النظام؟')) return;
    }

    try {
        const user = getCurrentUser();
        if (user) logUserActivity(user.username, 'logout');
    } catch (e) { /* تجاهل */ }

    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);

    redirectToLogin();
}

// ============================================
// 🔄 التوجيه إلى صفحة الدخول
// ============================================
function redirectToLogin() {
    const path = window.location.pathname;
    if (!path.includes('login.html')) {
        window.location.replace('login.html');
    }
}

// ============================================
// 📝 تسجيل نشاط المستخدم
// ============================================
async function logUserActivity(username, action) {
    try {
        const logData = {
            username: username,
            action: action,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };

        // حاول الإضافة إلى Supabase
        try {
            if (typeof supabase !== 'undefined') {
                await supabase.from('activity_logs').insert([logData]);
            }
        } catch (e) {
            // تجاهل إذا لم يكن الجدول موجود
        }

        console.log('📝 نشاط المستخدم:', logData);
    } catch (error) {
        console.warn('⚠️ فشل تسجيل النشاط:', error);
    }
}

// ============================================
// 🚀 معالج تسجيل الدخول
// ============================================
async function handleLogin(event) {
    if (event) event.preventDefault();

    // فحص القفل
    if (isAccountLocked()) {
        showError('🔒 الحساب مقفل مؤقتاً، حاول بعد 15 دقيقة');
        return;
    }

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText') || document.getElementById('loginBtnText');
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showError('⚠️ يرجى إدخال اسم المستخدم وكلمة المرور');
        return;
    }

    // تعطيل الزر
    if (loginBtn) loginBtn.disabled = true;
    if (loginText) loginText.innerHTML = '⏳ جاري التحقق...';

    try {
        let user = null;
        let isFromDB = false;

        // ✅ 1. محاولة من Supabase
        try {
            if (typeof supabase !== 'undefined') {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .maybeSingle();

                if (!error && data) {
                    user = data;
                    isFromDB = true;
                    console.log('✅ تم العثور على المستخدم في Supabase');
                }
            }
        } catch (dbError) {
            console.warn('⚠️ فشل الاتصال بـ Supabase:', dbError.message);
        }

        // ✅ 2. إذا لم يوجد، استخدام المستخدمين المحليين
        if (!user) {
            const localUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');

            // إذا لم يوجد مستخدمون محليون، أنشئ المستخدم الافتراضي
            if (localUsers.length === 0) {
                const defaultUser = {
                    id: 1,
                    username: 'admin',
                    password: await hashPassword('admin123'),
                    full_name: 'مدير النظام',
                    role: 'admin',
                    status: true,
                    permissions: { all: true }
                };
                localUsers.push(defaultUser);
                localStorage.setItem('localUsers', JSON.stringify(localUsers));
            }

            user = localUsers.find(u => u.username === username);
            if (user) console.log('✅ تم العثور على المستخدم محلياً');
        }

        // ✅ 3. لم يتم إيجاد المستخدم
        if (!user) {
            recordFailedAttempt();
            const remaining = MAX_ATTEMPTS - loginAttempts;
            if (remaining > 0) {
                showError(`❌ اسم المستخدم غير موجود (متبقي ${remaining} محاولة)`);
            } else {
                showError('🔒 تم قفل الحساب لمدة 15 دقيقة');
            }
            if (loginBtn) loginBtn.disabled = false;
            if (loginText) loginText.textContent = '🚀 تسجيل الدخول';
            return;
        }

        // ✅ 4. التحقق من حالة الحساب
        const isActive = user.status === true || user.status === 'true' || user.status === 1 || user.is_active === true;
        if (!isActive) {
            showError('❌ الحساب غير نشط، تواصل مع المدير');
            if (loginBtn) loginBtn.disabled = false;
            if (loginText) loginText.textContent = '🚀 تسجيل الدخول';
            return;
        }

        // ✅ 5. التحقق من كلمة المرور
        let isPasswordValid = false;
        const storedPassword = user.password || user.password_hash || '';

        if (isFromDB) {
            // من Supabase: مقارنة مباشرة
            isPasswordValid = (password === storedPassword);
        } else {
            // من التخزين المحلي: مقارنة بالـ hash
            const hashedInput = await hashPassword(password);
            isPasswordValid = (hashedInput === storedPassword);
        }

        // ✅ 6. المستخدم الافتراضي admin/admin123 (احتياطي)
        if (!isPasswordValid && username === 'admin' && password === 'admin123') {
            isPasswordValid = true;
        }

        if (!isPasswordValid) {
            recordFailedAttempt();
            const remaining = MAX_ATTEMPTS - loginAttempts;
            if (remaining > 0) {
                showError(`❌ كلمة المرور غير صحيحة (متبقي ${remaining} محاولة)`);
            } else {
                showError('🔒 تم قفل الحساب لمدة 15 دقيقة');
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
            if (loginBtn) loginBtn.disabled = false;
            if (loginText) loginText.textContent = '🚀 تسجيل الدخول';
            return;
        }

        // ✅ 7. نجاح تسجيل الدخول
        resetAttempts();
        createSession(user, rememberMe);

        // حفظ اسم المستخدم
        if (rememberMe) {
            localStorage.setItem('saved_username', username);
        } else {
            localStorage.removeItem('saved_username');
        }

        showSuccess(`✅ مرحباً ${user.full_name || user.fullName || user.username}`);
        if (loginText) loginText.textContent = '✅ تم بنجاح';

        // التوجيه
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 700);

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        showError('❌ حدث خطأ، حاول مرة أخرى');
        if (loginBtn) loginBtn.disabled = false;
        if (loginText) loginText.textContent = '🚀 تسجيل الدخول';
    }
}

// ============================================
// 📢 عرض رسالة خطأ
// ============================================
function showError(msg) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    if (errorText) errorText.textContent = msg;
    if (errorDiv) {
        errorDiv.classList.add('show');
        setTimeout(() => errorDiv.classList.remove('show'), 5000);
    } else {
        // fallback: toast
        showToast(msg, 'error');
    }
}

// ============================================
// ✅ عرض رسالة نجاح
// ============================================
function showSuccess(msg) {
    const successDiv = document.getElementById('successMessage');
    const successText = document.getElementById('successText');

    if (successText) successText.textContent = msg;
    if (successDiv) successDiv.classList.add('show');
}

// ============================================
// 🍞 إشعار Toast (احتياطي)
// ============================================
function showToast(msg, type = 'info') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'toast-notification';
    div.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 20px;
        color: white;
        font-weight: 700;
        z-index: 100000;
        font-family: 'Tajawal', sans-serif;
        background: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#3b82f6'};
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease;
    `;
    div.textContent = msg;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.3s';
        setTimeout(() => div.remove(), 300);
    }, 2800);
}

// ============================================
// 🛡️ حماية الصفحات (للصفحات الداخلية)
// ============================================
function protectPage(requiredPermission = null) {
    if (!checkSession()) return false;

    const user = getCurrentUser();
    if (!user) return false;

    if (requiredPermission && user.role !== 'admin') {
        const perms = user.permissions || {};
        if (!perms.all && !perms[requiredPermission]) {
            showToast('⛔ ليس لديك صلاحية للوصول', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            return false;
        }
    }

    return true;
}

// ============================================
// 🌐 إتاحة الدوال عالمياً
// ============================================
window.togglePassword = togglePassword;
window.hashPassword = hashPassword;
window.handleLogin = handleLogin;
window.checkSession = checkSession;
window.getCurrentUser = getCurrentUser;
window.logout = logout;
window.protectPage = protectPage;
window.showToast = showToast;
window.redirectToLogin = redirectToLogin;

// ============================================
// 🚀 التهيئة عند تحميل الصفحة
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    // استعادة عدد المحاولات
    const savedAttempts = localStorage.getItem(ATTEMPTS_KEY);
    if (savedAttempts) {
        loginAttempts = parseInt(savedAttempts) || 0;
    }

    // استعادة اسم المستخدم المحفوظ
    const savedUsername = localStorage.getItem('saved_username');
    if (savedUsername) {
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.value = savedUsername;
            const rememberMe = document.getElementById('rememberMe');
            if (rememberMe) rememberMe.checked = true;
        }
    }

    // تركيز تلقائي
    const usernameInput = document.getElementById('username');
    if (usernameInput && window.location.pathname.includes('login.html')) {
        setTimeout(() => usernameInput.focus(), 500);
    }

    console.log('🔐 نظام المصادقة جاهز - شركة العبادي');
});

console.log('✅ auth.js loaded successfully');
