// ============================================
// 🚀 التطبيق الرئيسي - شركة العبادي
// ============================================

// ✅ متغيرات التطبيق
const app = {
    currentUser: null,
    isSidebarOpen: false,
    isOnline: navigator.onLine,
    isConnected: false
};

// ✅ دالة عرض التنبيهات
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ✅ دالة تأكيد العمليات
function showConfirmModal(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="modal-content modal-sm">
            <div class="modal-header" style="background:#fef3c7;">
                <h3>⚠️ تأكيد</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                <p style="text-align:center;font-size:15px;">${message}</p>
            </div>
            <div class="modal-footer" style="justify-content:center;">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">إلغاء</button>
                <button class="btn-primary" id="confirmOkBtn">تأكيد</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('confirmOkBtn').onclick = function() {
        modal.remove();
        if (onConfirm) onConfirm();
    };
}

// ✅ دالة تنسيق الأرقام
function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Number(num).toLocaleString('en-EG');
}

// ✅ دالة تنسيق التاريخ
function formatDate(date) {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('ar-EG');
    } catch {
        return '-';
    }
}

// ✅ دالة تنسيق الوقت
function formatTime(date) {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '-';
    }
}

// ✅ فتح/إغلاق المودال
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
}

// ✅ فتح/إغلاق القائمة الجانبية
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    app.isSidebarOpen = !app.isSidebarOpen;
    sidebar.classList.toggle('open', app.isSidebarOpen);
}

// ✅ الحصول على المستخدم الحالي
function getCurrentUser() {
    try {
        const session = localStorage.getItem('alabady_session');
        if (session) return JSON.parse(session);
        return null;
    } catch {
        return null;
    }
}

// ✅ تسجيل الخروج
function logout() {
    localStorage.removeItem('alabady_session');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// ✅ دالة اختبار الاتصال (معدلة)
async function testConnection() {
    // ✅ استخدام العميل من _supabase
    const supabase = window._supabase || window.supabase;
    
    if (!supabase) {
        console.error('❌ عميل Supabase غير متوفر');
        return false;
    }
    
    try {
        console.log('🔄 جاري اختبار الاتصال...');
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('❌ فشل الاتصال:', error.message);
            return false;
        }
        console.log('✅ تم الاتصال بنجاح');
        app.isConnected = true;
        return true;
    } catch (error) {
        console.error('❌ خطأ في الاتصال:', error.message);
        app.isConnected = false;
        return false;
    }
}

// ✅ تهيئة التطبيق
async function initApp() {
    console.log('🏢 مرحباً بك في شركة العبادي');
    console.log('🚀 نظام إدارة المخازن والمبيعات');
    
    // ✅ اختبار الاتصال بقاعدة البيانات
    const connected = await testConnection();
    if (connected) {
        showToast('✅ تم الاتصال بقاعدة البيانات', 'success');
        console.log('✅ قاعدة البيانات متصلة');
    } else {
        showToast('⚠️ فشل الاتصال بقاعدة البيانات، جاري استخدام وضع المحاكاة', 'error');
        console.warn('⚠️ قاعدة البيانات غير متصلة - وضع المحاكاة');
    }
    
    // ✅ عرض اسم المستخدم
    const user = getCurrentUser();
    if (user) {
        app.currentUser = user;
        const nameEl = document.getElementById('userName');
        if (nameEl) {
            nameEl.textContent = `👤 ${user.fullName || user.username}`;
        }
    }
    
    // ✅ مراقبة حالة الاتصال
    window.addEventListener('online', async () => {
        app.isOnline = true;
        showToast('✅ تم استعادة الاتصال بالإنترنت', 'success');
        await testConnection();
    });
    
    window.addEventListener('offline', () => {
        app.isOnline = false;
        showToast('⚠️ تم فقدان الاتصال بالإنترنت', 'error');
    });
    
    console.log('✅ تم تهيئة التطبيق بنجاح');
}

// ✅ تصدير الدوال إلى window
window.showToast = showToast;
window.showConfirmModal = showConfirmModal;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleSidebar = toggleSidebar;
window.getCurrentUser = getCurrentUser;
window.logout = logout;
window.initApp = initApp;
window.testConnection = testConnection;
window.app = app;

// ✅ تشغيل التطبيق
document.addEventListener('DOMContentLoaded', function() {
    // إغلاق المودال عند النقر خارجها
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('show');
        }
    });
    
    // تشغيل التطبيق
    initApp();
});

console.log('🚀 التطبيق الرئيسي جاهز - شركة العبادي');