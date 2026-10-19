// ============================================
// 👥 إدارة المستخدمين - كود متكامل ومصحح
// ============================================

let allUsers = [];
let pendingDeleteId = null;

// 🔐 دالة تشفير كلمة المرور
async function hashPassword(password) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'ALABADY_SALT_2026');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return password;
    }
}

// 📥 تحميل المستخدمين
async function loadUsers() {
    const container = document.getElementById('usersList');
    if (container) container.innerHTML = '<div class="empty-state"><p>⏳ جاري التحميل...</p></div>';

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        allUsers = data || [];
        displayUsers(allUsers);
        updateUserStats();
    } catch (err) {
        console.error('❌ خطأ في تحميل المستخدمين:', err);
        if (container) container.innerHTML = `<div class="empty-state"><p style="color:red;">خطأ: ${err.message}</p></div>`;
    }
}

// 🎨 عرض المستخدمين
function displayUsers(users) {
    const container = document.getElementById('usersList');
    if (!container) return;

    if (!users || users.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>لا يوجد مستخدمين</p></div>`;
        return;
    }

    const roleLabels = {
        'admin': { label: 'مدير النظام', color: '#dc2626' },
        'manager': { label: 'مدير', color: '#f59e0b' },
        'accountant': { label: 'محاسب', color: '#0891b2' },
        'cashier': { label: 'كاشير', color: '#8b5cf6' },
        'user': { label: 'مستخدم', color: '#64748b' }
    };

    container.innerHTML = users.map(u => {
        const role = roleLabels[u.role] || roleLabels['user'];
        const isActive = u.status === true || u.status === 'true' || u.status === 1 || u.is_active !== false;
        const isMainAdmin = u.username === 'admin';
        
        return `
            <div class="user-card" style="background:#fff;padding:16px;border-radius:12px;box-shadow:0 2px 10px rgba(15,61,62,0.08);border:1px solid #d1d9d9;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:250px;">
                    <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;">
                        ${(u.full_name || u.username || 'م').charAt(0)}
                    </div>
                    <div>
                        <div style="font-weight:800;color:#0f3d3e;font-size:15px;">${u.full_name || u.username}</div>
                        <div style="font-size:12px;color:#64748b;">@${u.username}</div>
                        <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
                            <span style="background:${role.color}20;color:${role.color};padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${role.label}</span>
                            <span style="background:${isActive ? '#d1fae5' : '#fee2e2'};color:${isActive ? '#059669' : '#dc2626'};padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">
                                ${isActive ? '🟢 نشط' : '🔴 غير نشط'}
                            </span>
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${!isMainAdmin ? `
                        <button onclick="editUser(${u.id})" style="padding:8px 16px;border:none;border-radius:8px;background:#e0f2f1;color:#0f766e;font-family:'Tajawal',sans-serif;font-weight:700;font-size:12px;cursor:pointer;">✏️ تعديل</button>
                        <button onclick="confirmDeleteUser(${u.id}, '${(u.full_name || u.username).replace(/'/g, "\\'")}')" style="padding:8px 16px;border:none;border-radius:8px;background:#fee2e2;color:#dc2626;font-family:'Tajawal',sans-serif;font-weight:700;font-size:12px;cursor:pointer;">🗑️ حذف</button>
                    ` : '<span style="color:#94a3b8;font-size:11px;font-weight:bold;">حساب رئيسي</span>'}
                </div>
            </div>
        `;
    }).join('');
}

// 📊 الإحصائيات
function updateUserStats() {
    const totalEl = document.getElementById('totalUsers');
    const activeEl = document.getElementById('activeUsers');
    const inactiveEl = document.getElementById('inactiveUsers');
    
    if (!totalEl || !activeEl || !inactiveEl) return;
    
    const total = allUsers.length;
    const active = allUsers.filter(u => u.status === true || u.status === 'true' || u.status === 1 || u.is_active !== false).length;
    
    totalEl.textContent = total;
    activeEl.textContent = active;
    inactiveEl.textContent = total - active;
}

// ➕ فتح النافذة
function openUserModal(data = null) {
    const isEdit = !!data;
    document.getElementById('userModalTitle').textContent = isEdit ? '✏️ تعديل مستخدم' : '➕ مستخدم جديد';
    document.getElementById('editUserId').value = data?.id || '';
    document.getElementById('userUsername').value = data?.username || '';
    document.getElementById('userFullName').value = data?.full_name || '';
    document.getElementById('userRole').value = data?.role || 'user';
    
    const isActive = data ? (data.status === true || data.status === 'true' || data.status === 1 || data.is_active !== false) : true;
    document.getElementById('userStatus').value = isActive ? 'true' : 'false';
    
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = !isEdit;
    
    const hintEl = document.getElementById('userPasswordHint');
    if (hintEl) hintEl.style.display = isEdit ? 'block' : 'none';
    
    openModal('userModal');
}

// 💾 حفظ المستخدم
async function saveUser() {
    const id = document.getElementById('editUserId')?.value;
    const username = document.getElementById('userUsername')?.value.trim();
    const fullName = document.getElementById('userFullName')?.value.trim();
    const role = document.getElementById('userRole')?.value || 'user';
    const isActive = document.getElementById('userStatus')?.value === 'true';
    const password = document.getElementById('userPassword')?.value;
    
    if (!username) { showToast('❌ أدخل اسم المستخدم', 'error'); return; }
    if (!fullName) { showToast('❌ أدخل الاسم الكامل', 'error'); return; }
    if (!id && !password) { showToast('❌ أدخل كلمة المرور', 'error'); return; }
    
    const data = {
        username: username,
        full_name: fullName,
        role: role,
        status: isActive
    };
    
    if (password) {
        data.password = await hashPassword(password);
    }
    
    try {
        let error;
        if (id) {
            ({ error } = await supabase.from('users').update(data).eq('id', id));
        } else {
            ({ error } = await supabase.from('users').insert([data]));
        }
        
        if (error) throw error;
        
        closeModal('userModal');
        showToast(id ? '✅ تم تحديث المستخدم' : '✅ تم إضافة المستخدم بنجاح', 'success');
        await loadUsers();
    } catch (error) {
        console.error('خطأ في حفظ المستخدم:', error);
        // إذا كان الخطأ بسبب عدم وجود عمود معين، سيظهر في التنبيه
        showToast('حدث خطأ: ' + error.message, 'error');
    }
}

// ✏️ تعديل
function editUser(id) {
    const user = allUsers.find(u => u.id === id || u.id == id);
    if (user) openUserModal(user);
}

// 🗑️ تأكيد الحذف
function confirmDeleteUser(id, name) {
    pendingDeleteId = id;
    const msgEl = document.getElementById('confirmMessage');
    if (msgEl) msgEl.innerHTML = `⚠️ هل أنت متأكد من حذف المستخدم <strong style="color:#dc2626;">"${name}"</strong>؟`;
    openModal('confirmModal');
}

// 🗑️ حذف
async function deleteUser() {
    if (!pendingDeleteId) return;
    try {
        const { error } = await supabase.from('users').delete().eq('id', pendingDeleteId);
        if (error) throw error;
        
        closeModal('confirmModal');
        pendingDeleteId = null;
        showToast('✅ تم حذف المستخدم', 'success');
        await loadUsers();
    } catch (error) {
        console.error('خطأ في الحذف:', error);
        showToast('حدث خطأ: ' + error.message, 'error');
    }
}

// 🛠️ أدوات مساعدة
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

function showToast(msg, type = 'info') {
    const div = document.createElement('div');
    div.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 20px; color: white; font-weight: 700; z-index: 100000; font-family: 'Tajawal', sans-serif; background: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#3b82f6'}; box-shadow: 0 6px 20px rgba(0,0,0,0.2);`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 3000);
}

// 🌐 تصدير الدوال (هذا هو السر لجعل الأزرار تعمل)
window.loadUsers = loadUsers;
window.openUserModal = openUserModal;
window.saveUser = saveUser;
window.editUser = editUser;
window.confirmDeleteUser = confirmDeleteUser;
window.deleteUser = deleteUser;
window.openModal = openModal;
window.closeModal = closeModal;

// 🚀 التحميل التلقائي
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('usersList')) {
        loadUsers();
    }
});
