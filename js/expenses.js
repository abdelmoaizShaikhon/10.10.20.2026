// ============================================
// 🧾 دوال المصروفات - شركة العبادي
// ============================================

let allExpenses = [];
let editingExpenseId = null;
let pendingDeleteId = null;

// تحميل المصروفات
async function loadExpenses() {
    try {
        allExpenses = await query('expenses');
        displayExpenses(allExpenses);
        updateExpenseStats();
        loadMonthFilter();
    } catch (error) {
        console.error('❌ خطأ في تحميل المصروفات:', error);
        showToast('❌ فشل تحميل المصروفات', 'error');
    }
}

// عرض المصروفات
function displayExpenses(expenses) {
    const container = document.getElementById('expensesList');
    if (!container) return;
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🧾</div>
                <p>لا توجد مصروفات</p>
                <p style="font-size:12px;color:var(--text-light);">اضغط على "مصروف جديد"</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = expenses.map(e => `
        <div class="expense-card">
            <div class="expense-info">
                <span class="expense-type">${e.type || 'مصروفات مجمعه'}</span>
                <span class="expense-description">${e.description || '-'}</span>
                <span class="expense-date">${formatDate(e.date || e.created_at)}</span>
            </div>
            <div class="expense-amount">${formatNumber(e.amount)} ج.م</div>
            <div class="expense-actions">
                <button class="btn-edit" onclick="editExpense(${e.id})">✏️</button>
                <button class="btn-delete" onclick="confirmDeleteExpense(${e.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

// تحديث إحصائيات المصروفات
function updateExpenseStats() {
    const total = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // مصروفات الشهر
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthExpenses = allExpenses
        .filter(e => (e.date || e.created_at || '').split('T')[0] >= monthStart)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // مصروفات اليوم
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = allExpenses
        .filter(e => (e.date || e.created_at || '').split('T')[0] === today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    document.getElementById('totalExpenses').textContent = formatNumber(total) + ' ج.م';
    document.getElementById('monthExpenses').textContent = formatNumber(monthExpenses) + ' ج.م';
    document.getElementById('todayExpenses').textContent = formatNumber(todayExpenses) + ' ج.م';
}

// تحميل فلتر الشهور
function loadMonthFilter() {
    const select = document.getElementById('monthFilter');
    if (!select) return;
    
    const months = [...new Set(allExpenses.map(e => {
        const d = new Date(e.date || e.created_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }))].sort().reverse();
    
    select.innerHTML = `
        <option value="all">كل الشهور</option>
        ${months.map(m => `<option value="${m}">${m}</option>`).join('')}
    `;
}

// فلترة المصروفات
function filterExpenses() {
    const term = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const type = document.getElementById('typeFilter')?.value || 'all';
    const month = document.getElementById('monthFilter')?.value || 'all';
    
    let filtered = [...allExpenses];
    
    if (term) {
        filtered = filtered.filter(e => 
            (e.type || '').toLowerCase().includes(term) ||
            (e.description || '').toLowerCase().includes(term)
        );
    }
    
    if (type !== 'all') {
        filtered = filtered.filter(e => e.type === type);
    }
    
    if (month !== 'all') {
        filtered = filtered.filter(e => {
            const d = new Date(e.date || e.created_at);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month;
        });
    }
    
    displayExpenses(filtered);
}

// فتح نافذة المصروف
function openExpenseModal(data = null) {
    const isEdit = !!data;
    document.getElementById('expenseModalTitle').textContent = isEdit ? '✏️ تعديل مصروف' : '➕ مصروف جديد';
    document.getElementById('editExpenseId').value = data?.id || '';
    document.getElementById('expenseType').value = data?.type || 'مصروفات مجمعه';
    document.getElementById('expenseAmount').value = data?.amount || '';
    document.getElementById('expenseDescription').value = data?.description || '';
    document.getElementById('expenseDate').value = data?.date || new Date().toISOString().split('T')[0];
    document.getElementById('expensePaymentMethod').value = data?.payment_method || 'نقدي';
    openModal('expenseModal');
}

// حفظ المصروف
async function saveExpense() {
    const id = document.getElementById('editExpenseId').value;
    const type = document.getElementById('expenseType').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const description = document.getElementById('expenseDescription').value.trim();
    const date = document.getElementById('expenseDate').value;
    const paymentMethod = document.getElementById('expensePaymentMethod').value;
    
    if (!type) {
        showToast('يرجى اختيار نوع المصروف', 'error');
        return;
    }
    if (!amount || amount <= 0) {
        showToast('يرجى إدخال مبلغ صحيح', 'error');
        return;
    }
    
    const data = {
        type,
        amount,
        description: description || null,
        date: date || new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        user_id: app.currentUser?.id || null
    };
    
    try {
        let result;
        if (id) {
            result = await update('expenses', id, data);
        } else {
            result = await add('expenses', data);
        }
        
        if (result.success) {
            closeModal('expenseModal');
            showToast(id ? '✅ تم تحديث المصروف' : '✅ تم إضافة المصروف', 'success');
            await loadExpenses();
        } else {
            showToast('❌ ' + (result.error || 'فشل الحفظ'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// تأكيد حذف المصروف
function confirmDeleteExpense(id) {
    const expense = allExpenses.find(e => e.id === id);
    if (!expense) return;
    pendingDeleteId = id;
    document.getElementById('confirmMessage').textContent = `⚠️ هل أنت متأكد من حذف "${expense.type}" بقيمة ${formatNumber(expense.amount)} ج.م؟`;
    openModal('confirmModal');
}

// حذف المصروف
async function deleteExpense() {
    if (!pendingDeleteId) return;
    try {
        const result = await remove('expenses', pendingDeleteId);
        if (result.success) {
            closeModal('confirmModal');
            pendingDeleteId = null;
            showToast('✅ تم حذف المصروف', 'success');
            await loadExpenses();
        } else {
            showToast('❌ ' + (result.error || 'فشل الحذف'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// تصدير الدوال
window.loadExpenses = loadExpenses;
window.filterExpenses = filterExpenses;
window.openExpenseModal = openExpenseModal;
window.saveExpense = saveExpense;
window.confirmDeleteExpense = confirmDeleteExpense;
window.deleteExpense = deleteExpense;