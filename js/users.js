// ============================================
// 👥 دوال المستخدمين - شركة العبادي
// ============================================

let allUsers = [];
let editingUserId = null;
let pendingDeleteId = null;

// تحميل المستخدمين
async function loadUsers() {
    try {
        allUsers = await query('users');
        displayUsers(allUsers);
        updateUserStats();
    } catch (error) {
        console.error('❌ خطأ في تحميل المستخدمين:', error);
        showToast('❌ فشل تحميل المستخدمين', 'error');
    }
}

// عرض المستخدمين
function displayUsers(users) {
    const container = document.getElementById('usersList');
    if (!container) {
        console.warn('⚠️ عنصر usersList غير موجود');
        return;
    }
    
    if (!users || users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <p>لا يوجد مستخدمين</p>
                <p style="font-size:12px;color:var(--text-light);">اضغط على "مستخدم جديد"</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = users.map(u => `
        <div class="user-card">
            <div class="user-info">
                <span class="user-name">${u.full_name || u.username}</span>
                <span class="user-username">@${u.username}</span>
                <span class="user-role ${u.role}">${getRoleLabel(u.role)}</span>
                <span class="user-status ${u.is_active !== false ? 'active' : 'inactive'}">${u.is_active !== false ? '🟢 نشط' : '🔴 غير نشط'}</span>
            </div>
            <div class="user-actions">
                ${u.username !== 'admin' ? `
                    <button class="btn-edit" onclick="editUser(${u.id})">✏️</button>
                    <button class="btn-delete" onclick="confirmDeleteUser(${u.id})">🗑️</button>
                ` : '<span style="color:#94a3b8;font-size:11px;">رئيسي</span>'}
            </div>
        </div>
    `).join('');
}

// الحصول على تسمية الدور
function getRoleLabel(role) {
    const labels = {
        admin: 'مدير النظام',
        manager: 'مدير',
        cashier: 'كاشير',
        accountant: 'محاسب',
        user: 'مستخدم'
    };
    return labels[role] || role;
}

// تحديث إحصائيات المستخدمين
function updateUserStats() {
    const totalEl = document.getElementById('totalUsers');
    const activeEl = document.getElementById('activeUsers');
    const inactiveEl = document.getElementById('inactiveUsers');
    
    if (!totalEl || !activeEl || !inactiveEl) {
        console.warn('⚠️ عناصر الإحصائيات غير موجودة');
        return;
    }
    
    const total = allUsers.length;
    const active = allUsers.filter(u => u.is_active !== false).length;
    const inactive = total - active;
    
    totalEl.textContent = total;
    activeEl.textContent = active;
    inactiveEl.textContent = inactive;
}

// فتح نافذة المستخدم
function openUserModal(data = null) {
    const isEdit = !!data;
    const titleEl = document.getElementById('userModalTitle');
    const editIdEl = document.getElementById('editUserId');
    const usernameEl = document.getElementById('userUsername');
    const fullNameEl = document.getElementById('userFullName');
    const roleEl = document.getElementById('userRole');
    const statusEl = document.getElementById('userStatus');
    const passwordEl = document.getElementById('userPassword');
    const hintEl = document.getElementById('userPasswordHint');
    
    if (!titleEl || !editIdEl || !usernameEl || !fullNameEl || !roleEl || !statusEl || !passwordEl) {
        console.error('❌ عناصر النافذة غير موجودة');
        showToast('خطأ في تحميل النافذة', 'error');
        return;
    }
    
    titleEl.textContent = isEdit ? '✏️ تعديل مستخدم' : '➕ مستخدم جديد';
    editIdEl.value = data?.id || '';
    usernameEl.value = data?.username || '';
    fullNameEl.value = data?.full_name || '';
    roleEl.value = data?.role || 'user';
    statusEl.value = data?.is_active !== false ? 'true' : 'false';
    passwordEl.value = '';
    passwordEl.required = !isEdit;
    
    if (hintEl) {
        hintEl.style.display = isEdit ? 'block' : 'none';
    }
    
    openModal('userModal');
}

// حفظ المستخدم
async function saveUser() {
    const id = document.getElementById('editUserId')?.value;
    const username = document.getElementById('userUsername')?.value.trim();
    const fullName = document.getElementById('userFullName')?.value.trim();
    const role = document.getElementById('userRole')?.value;
    const isActive = document.getElementById('userStatus')?.value === 'true';
    const password = document.getElementById('userPassword')?.value;
    
    if (!username) {
        showToast('يرجى إدخال اسم المستخدم', 'error');
        return;
    }
    if (!fullName) {
        showToast('يرجى إدخال الاسم الكامل', 'error');
        return;
    }
    if (!id && !password) {
        showToast('يرجى إدخال كلمة المرور', 'error');
        return;
    }
    
    const data = {
        username,
        full_name: fullName,
        role,
        is_active: isActive
    };
    
    if (password) {
        data.password = password;
    }
    
    try {
        let result;
        if (id) {
            result = await update('users', id, data);
        } else {
            result = await add('users', data);
        }
        
        if (result.success) {
            closeModal('userModal');
            showToast(id ? '✅ تم تحديث المستخدم' : '✅ تم إضافة المستخدم', 'success');
            await loadUsers();
        } else {
            showToast('❌ ' + (result.error || 'فشل الحفظ'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// فتح نافذة التعديل
function editUser(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) {
        showToast('المستخدم غير موجود', 'error');
        return;
    }
    openUserModal(user);
}

// تأكيد حذف المستخدم
function confirmDeleteUser(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    if (user.username === 'admin') {
        showToast('⚠️ لا يمكن حذف المستخدم الرئيسي', 'error');
        return;
    }
    pendingDeleteId = id;
    document.getElementById('confirmMessage').textContent = `⚠️ هل أنت متأكد من حذف "${user.full_name || user.username}"؟`;
    openModal('confirmModal');
}

// حذف المستخدم
async function deleteUser() {
    if (!pendingDeleteId) return;
    try {
        const result = await remove('users', pendingDeleteId);
        if (result.success) {
            closeModal('confirmModal');
            pendingDeleteId = null;
            showToast('✅ تم حذف المستخدم', 'success');
            await loadUsers();
        } else {
            showToast('❌ ' + (result.error || 'فشل الحذف'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// ✅ تصدير الدوال
window.loadUsers = loadUsers;
window.openUserModal = openUserModal;
window.saveUser = saveUser;
window.editUser = editUser;
window.confirmDeleteUser = confirmDeleteUser;
window.deleteUser = deleteUser;

// ✅ تحميل المستخدمين عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('usersList')) {
        loadUsers();
    }
});

console.log('✅ Users module loaded');