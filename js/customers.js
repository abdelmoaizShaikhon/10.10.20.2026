// ============================================
// 👤 دوال العملاء - شركة العبادي
// ============================================

let allCustomers = [];
let allSales = [];
let allPayments = [];
let editingCustomerId = null;
let pendingDeleteId = null;
let currentCustomerId = null;

// ============================================
// 📥 تحميل وعرض العملاء
// ============================================

// تحميل العملاء
async function loadCustomers() {
    try {
        allCustomers = await query('customers');
        allSales = await query('sales');
        allPayments = await query('customer_payments') || [];
        displayCustomers(allCustomers);
        updateCustomerStats();
    } catch (error) {
        console.error('❌ خطأ في تحميل العملاء:', error);
        showToast('❌ فشل تحميل العملاء', 'error');
    }
}

// عرض العملاء
function displayCustomers(customers) {
    const container = document.getElementById('customersList');
    if (!container) {
        console.warn('⚠️ عنصر customersList غير موجود');
        return;
    }
    
    if (!customers || customers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👤</div>
                <p>لا يوجد عملاء</p>
                <p style="font-size:12px;color:var(--text-light);">اضغط على "عميل جديد"</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = customers.map(c => {
        const stats = getCustomerStats(c.id);
        return `
            <div class="customer-card">
                <div class="customer-info">
                    <div class="customer-header">
                        <span class="customer-name">${c.name}</span>
                        <span class="customer-type ${c.type || 'عادي'}">${c.type || 'عادي'}</span>
                    </div>
                    <div class="customer-details">
                        ${c.code ? `🆔 ${c.code}` : ''}
                        ${c.phone ? `| 📞 ${c.phone}` : ''}
                        ${c.address ? `| 📍 ${c.address}` : ''}
                    </div>
                    <div class="customer-stats">
                        <span class="stat-item">
                            <span class="stat-label">💰 المشتريات:</span>
                            <span class="stat-value" style="color:#3b82f6;">${formatNumber(stats.totalPurchases)} ج.م</span>
                        </span>
                        <span class="stat-item">
                            <span class="stat-label">💵 المدفوع:</span>
                            <span class="stat-value" style="color:#10b981;">${formatNumber(stats.totalPaid)} ج.م</span>
                        </span>
                        <span class="stat-item">
                            <span class="stat-label">⚠️ المتبقي:</span>
                            <span class="stat-value" style="color:${stats.remaining > 0 ? '#ef4444' : '#10b981'};">${formatNumber(stats.remaining)} ج.م</span>
                        </span>
                    </div>
                    ${c.discount_percent > 0 ? `<span class="discount-badge">💎 خصم ${c.discount_percent}%</span>` : ''}
                </div>
                <div class="customer-actions">
                    <button class="btn-action btn-view" onclick="viewCustomerDetails(${c.id})">📋</button>
                    <button class="btn-action btn-pay" onclick="openPaymentModal(${c.id})">💵</button>
                    <button class="btn-action btn-edit" onclick="editCustomer(${c.id})">✏️</button>
                    <button class="btn-action btn-delete" onclick="confirmDeleteCustomer(${c.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// حساب إحصائيات العميل
function getCustomerStats(customerId) {
    // فواتير المبيعات
    const sales = allSales.filter(s => s.customer_id == customerId);
    const totalPurchases = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalPaidInSales = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
    
    // المدفوعات المنفصلة
    const payments = allPayments.filter(p => p.customer_id == customerId);
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // الاستردادات (إذا وجدت)
    const refunds = allPayments.filter(p => p.customer_id == customerId && p.type === 'refund');
    const totalRefunds = refunds.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const totalPaid = totalPaidInSales + totalPayments - totalRefunds;
    const remaining = totalPurchases - totalPaid;
    
    // إضافة الرصيد الافتتاحي من جدول العملاء
    const customer = allCustomers.find(c => c.id == customerId);
    const balance = customer?.balance || 0;
    
    return {
        totalPurchases,
        totalPaid,
        remaining: Math.max(0, remaining + balance),
        salesCount: sales.length,
        paymentsCount: payments.length,
        balance: balance
    };
}

// تحديث إحصائيات العملاء
function updateCustomerStats() {
    const totalEl = document.getElementById('totalCustomers');
    const debtEl = document.getElementById('totalDebt');
    const paidEl = document.getElementById('totalPaid');
    const salesEl = document.getElementById('totalSales');
    
    if (totalEl) totalEl.textContent = allCustomers.length;
    
    let totalDebt = 0;
    let totalPaid = 0;
    let totalSales = 0;
    
    allCustomers.forEach(c => {
        const stats = getCustomerStats(c.id);
        totalDebt += stats.remaining;
        totalPaid += stats.totalPaid;
        totalSales += stats.totalPurchases;
    });
    
    if (debtEl) debtEl.textContent = formatNumber(totalDebt) + ' ج.م';
    if (paidEl) paidEl.textContent = formatNumber(totalPaid) + ' ج.م';
    if (salesEl) salesEl.textContent = allSales.length;
}

// فلترة العملاء
function filterCustomers() {
    const term = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';
    const type = document.getElementById('typeFilter')?.value || 'all';
    
    let filtered = [...allCustomers];
    
    if (term) {
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(term) ||
            (c.phone && c.phone.includes(term)) ||
            (c.code && c.code.toLowerCase().includes(term))
        );
    }
    
    if (type !== 'all') {
        filtered = filtered.filter(c => c.type === type);
    }
    
    displayCustomers(filtered);
}

// ============================================
// ➕ إضافة وتعديل العملاء
// ============================================

// فتح نافذة العميل
function openCustomerModal(data = null) {
    const isEdit = !!data;
    
    const titleEl = document.getElementById('customerModalTitle');
    const editIdEl = document.getElementById('editCustomerId');
    const nameEl = document.getElementById('customerName');
    const phoneEl = document.getElementById('customerPhone');
    const addressEl = document.getElementById('customerAddress');
    const typeEl = document.getElementById('customerType');
    const discountEl = document.getElementById('customerDiscount');
    const balanceEl = document.getElementById('customerBalance');
    
    if (!titleEl || !editIdEl || !nameEl || !phoneEl || !addressEl || !typeEl || !discountEl || !balanceEl) {
        console.error('❌ بعض عناصر نافذة العميل غير موجودة');
        showToast('خطأ في تحميل النافذة', 'error');
        return;
    }
    
    titleEl.textContent = isEdit ? '✏️ تعديل عميل' : '➕ عميل جديد';
    editIdEl.value = data?.id || '';
    nameEl.value = data?.name || '';
    phoneEl.value = data?.phone || '';
    addressEl.value = data?.address || '';
    typeEl.value = data?.type || 'عادي';
    discountEl.value = data?.discount_percent || '0';
    balanceEl.value = data?.balance || '0';
    
    openModal('customerModal');
}

// فتح نافذة التعديل
function editCustomer(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) {
        showToast('العميل غير موجود', 'error');
        return;
    }
    openCustomerModal(customer);
}

// حفظ العميل
async function saveCustomer() {
    const id = document.getElementById('editCustomerId')?.value;
    const name = document.getElementById('customerName')?.value?.trim();
    const phone = document.getElementById('customerPhone')?.value?.trim();
    const address = document.getElementById('customerAddress')?.value?.trim();
    const type = document.getElementById('customerType')?.value || 'عادي';
    const discount = parseFloat(document.getElementById('customerDiscount')?.value) || 0;
    const balance = parseFloat(document.getElementById('customerBalance')?.value) || 0;
    
    if (!name) {
        showToast('يرجى إدخال اسم العميل', 'error');
        return;
    }
    
    const data = {
        name,
        phone: phone || null,
        address: address || null,
        type,
        discount_percent: discount,
        balance
    };
    
    try {
        let result;
        if (id) {
            result = await update('customers', id, data);
        } else {
            const code = 'C' + Date.now().toString().slice(-6);
            data.code = code;
            result = await add('customers', data);
        }
        
        if (result.success) {
            closeModal('customerModal');
            showToast(id ? '✅ تم تحديث العميل' : '✅ تم إضافة العميل', 'success');
            await loadCustomers();
        } else {
            showToast('❌ ' + (result.error || 'فشل الحفظ'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// ============================================
// 💵 دوال المدفوعات
// ============================================

// فتح نافذة الدفع
function openPaymentModal(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) {
        showToast('العميل غير موجود', 'error');
        return;
    }
    
    currentCustomerId = customerId;
    const stats = getCustomerStats(customerId);
    
    const nameEl = document.getElementById('payCustomerName');
    const debtEl = document.getElementById('payCurrentDebt');
    const amountEl = document.getElementById('payAmount');
    const methodEl = document.getElementById('payMethod');
    const noteEl = document.getElementById('payNote');
    
    if (nameEl) nameEl.value = customer.name;
    if (debtEl) debtEl.value = formatNumber(stats.remaining) + ' ج.م';
    if (amountEl) amountEl.value = '';
    if (methodEl) methodEl.value = 'نقدي';
    if (noteEl) noteEl.value = '';
    
    if (stats.remaining <= 0) {
        showToast('⚠️ لا توجد مستحقات على هذا العميل', 'info');
    }
    
    openModal('paymentModal');
}

// ✅ إضافة دفعة من العميل
async function addPayment() {
    const customerId = currentCustomerId;
    const amount = parseFloat(document.getElementById('payAmount')?.value);
    const method = document.getElementById('payMethod')?.value || 'نقدي';
    const notes = document.getElementById('payNote')?.value?.trim() || '';
    
    if (!customerId) {
        showToast('خطأ في بيانات العميل', 'error');
        return;
    }
    if (!amount || amount <= 0) {
        showToast('أدخل مبلغ صحيح', 'error');
        return;
    }
    
    const stats = getCustomerStats(customerId);
    if (amount > stats.remaining) {
        showToast(`⚠️ المبلغ أكبر من المستحق (${formatNumber(stats.remaining)} ج.م)`, 'error');
        return;
    }
    
    const data = {
        customer_id: Number(customerId),
        amount: amount,
        payment_method: method,
        payment_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        notes: notes || null,
        type: 'payment',
        created_by: getCurrentUser()?.id || null,
        created_at: new Date().toISOString()
    };
    
    try {
        const result = await add('customer_payments', data);
        if (result.success) {
            closeModal('paymentModal');
            showToast(`✅ تم تسجيل دفعة بقيمة ${formatNumber(amount)} ج.م`, 'success');
            await loadCustomers();
            // تحديث عرض التفاصيل إذا كان مفتوحاً
            if (currentCustomerId) {
                viewCustomerDetails(currentCustomerId);
            }
        } else {
            showToast('❌ ' + (result.error || 'فشل تسجيل الدفعة'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// ============================================
// 📋 عرض تفاصيل العميل
// ============================================

function viewCustomerDetails(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) {
        showToast('العميل غير موجود', 'error');
        return;
    }
    
    currentCustomerId = customerId;
    const stats = getCustomerStats(customerId);
    
    // جلب فواتير العميل
    const customerSales = allSales
        .filter(s => s.customer_id == customerId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // جلب مدفوعات العميل
    const customerPayments = allPayments
        .filter(p => p.customer_id == customerId && p.type !== 'refund')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // جلب استردادات العميل
    const customerRefunds = allPayments
        .filter(p => p.customer_id == customerId && p.type === 'refund')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const content = document.getElementById('customerDetailsContent');
    if (!content) {
        console.warn('⚠️ عنصر customerDetailsContent غير موجود');
        return;
    }
    
    // بناء جدول الفواتير
    let salesHtml = '';
    if (customerSales.length === 0) {
        salesHtml = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">لا توجد فواتير</td></tr>';
    } else {
        salesHtml = customerSales.map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${s.invoice_number || '#' + s.id}</strong></td>
                <td>${formatDate(s.created_at)}</td>
                <td style="color:#3b82f6;">${formatNumber(s.total_amount)} ج.م</td>
                <td style="color:#10b981;">${formatNumber(s.paid_amount)} ج.م</td>
                <td style="color:${(s.remaining_amount || 0) > 0 ? '#ef4444' : '#10b981'};">${formatNumber(s.remaining_amount)} ج.م</td>
            </tr>
        `).join('');
    }
    
    // بناء جدول المدفوعات
    let paymentsHtml = '';
    if (customerPayments.length === 0 && customerRefunds.length === 0) {
        paymentsHtml = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">لا توجد مدفوعات</td></tr>';
    } else {
        const allTransactions = [
            ...customerPayments.map(p => ({ ...p, type_label: '💵 دفعة', type_class: 'payment' })),
            ...customerRefunds.map(p => ({ ...p, type_label: '↩️ استرداد', type_class: 'refund' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        paymentsHtml = allTransactions.map((t, i) => `
            <tr class="${t.type_class}">
                <td>${i + 1}</td>
                <td>${formatDate(t.created_at)}</td>
                <td>${t.type_label}</td>
                <td style="color:${t.type === 'refund' ? '#f59e0b' : '#10b981'};font-weight:700;">
                    ${t.type === 'refund' ? '-' : ''}${formatNumber(t.amount)} ج.م
                </td>
            </tr>
        `).join('');
    }
    
    content.innerHTML = `
        <!-- معلومات العميل -->
        <div class="detail-row">
            <div class="detail-card">
                <h4>👤 معلومات العميل</h4>
                <div class="detail-item"><span class="lbl">الاسم:</span><span class="val"><strong>${customer.name}</strong></span></div>
                ${customer.code ? `<div class="detail-item"><span class="lbl">الكود:</span><span class="val">${customer.code}</span></div>` : ''}
                ${customer.phone ? `<div class="detail-item"><span class="lbl">الهاتف:</span><span class="val">${customer.phone}</span></div>` : ''}
                ${customer.address ? `<div class="detail-item"><span class="lbl">العنوان:</span><span class="val">${customer.address}</span></div>` : ''}
                <div class="detail-item"><span class="lbl">النوع:</span><span class="val">${customer.type || 'عادي'}</span></div>
                ${customer.discount_percent > 0 ? `<div class="detail-item"><span class="lbl">الخصم:</span><span class="val" style="color:#f59e0b;">${customer.discount_percent}%</span></div>` : ''}
                ${customer.balance ? `<div class="detail-item"><span class="lbl">الرصيد الافتتاحي:</span><span class="val" style="color:#f59e0b;">${formatNumber(customer.balance)} ج.م</span></div>` : ''}
            </div>
            <div class="detail-card">
                <h4>📊 الملخص المالي</h4>
                <div class="summary-mini">
                    <div class="summary-item">
                        <span class="summary-label">💰 إجمالي المشتريات</span>
                        <span class="summary-value" style="color:#3b82f6;">${formatNumber(stats.totalPurchases)} ج.م</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">💵 إجمالي المدفوع</span>
                        <span class="summary-value" style="color:#10b981;">${formatNumber(stats.totalPaid)} ج.م</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">⚠️ المتبقي</span>
                        <span class="summary-value" style="color:${stats.remaining > 0 ? '#ef4444' : '#10b981'};">${formatNumber(stats.remaining)} ج.م</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">📄 عدد الفواتير</span>
                        <span class="summary-value">${stats.salesCount}</span>
                    </div>
                </div>
                <button class="btn-add" onclick="openPaymentModal(${customer.id})" style="width:100%;margin-top:10px;">
                    💵 إضافة دفعة
                </button>
            </div>
        </div>
        
        <!-- فواتير العميل -->
        <div class="detail-card" style="margin-top:12px;">
            <h4>🧾 فواتير المبيعات <span style="font-size:12px;color:#94a3b8;">(${customerSales.length})</span></h4>
            <div class="table-responsive">
                <table style="font-size:12px;">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>رقم الفاتورة</th>
                            <th>التاريخ</th>
                            <th>الإجمالي</th>
                            <th>المدفوع</th>
                            <th>المتبقي</th>
                        </tr>
                    </thead>
                    <tbody>${salesHtml}</tbody>
                    <tfoot>
                        <tr style="background:#f8fafc;font-weight:700;">
                            <td colspan="3" style="text-align:left;">الإجمالي</td>
                            <td style="color:#3b82f6;">${formatNumber(stats.totalPurchases)} ج.م</td>
                            <td style="color:#10b981;">${formatNumber(stats.totalPaid)} ج.م</td>
                            <td style="color:${stats.remaining > 0 ? '#ef4444' : '#10b981'};">${formatNumber(stats.remaining)} ج.م</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
        
        <!-- سجل المدفوعات -->
        <div class="detail-card" style="margin-top:12px;">
            <h4>💳 سجل المدفوعات والاستردادات <span style="font-size:12px;color:#94a3b8;">(${customerPayments.length + customerRefunds.length})</span></h4>
            <div class="table-responsive">
                <table style="font-size:12px;">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>التاريخ</th>
                            <th>النوع</th>
                            <th>المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>${paymentsHtml}</tbody>
                    <tfoot>
                        <tr style="background:#f8fafc;font-weight:700;">
                            <td colspan="3" style="text-align:left;">الإجمالي</td>
                            <td style="color:#10b981;">${formatNumber(stats.totalPaid)} ج.م</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
    
    openModal('customerDetailsModal');
}

// ============================================
// 🗑️ حذف العملاء
// ============================================

// تأكيد حذف العميل
function confirmDeleteCustomer(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;
    
    const stats = getCustomerStats(id);
    if (stats.totalPurchases > 0) {
        showToast(`⚠️ لا يمكن حذف العميل "${customer.name}" لديه فواتير مسجلة`, 'error');
        return;
    }
    
    pendingDeleteId = id;
    const msgEl = document.getElementById('confirmMessage');
    if (msgEl) {
        msgEl.textContent = `⚠️ هل أنت متأكد من حذف "${customer.name}"؟`;
    }
    openModal('confirmModal');
}

// حذف العميل
async function deleteCustomer() {
    if (!pendingDeleteId) return;
    
    try {
        const result = await remove('customers', pendingDeleteId);
        if (result.success) {
            closeModal('confirmModal');
            pendingDeleteId = null;
            showToast('✅ تم حذف العميل', 'success');
            await loadCustomers();
        } else {
            showToast('❌ ' + (result.error || 'فشل الحذف'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// ============================================
// 📤 تصدير الدوال
// ============================================

window.loadCustomers = loadCustomers;
window.filterCustomers = filterCustomers;
window.openCustomerModal = openCustomerModal;
window.editCustomer = editCustomer;
window.saveCustomer = saveCustomer;
window.confirmDeleteCustomer = confirmDeleteCustomer;
window.deleteCustomer = deleteCustomer;
window.viewCustomerDetails = viewCustomerDetails;
window.openPaymentModal = openPaymentModal;
window.addPayment = addPayment;
window.getCustomerStats = getCustomerStats;

// ✅ تحميل العملاء عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('customersList')) {
        loadCustomers();
    }
});

console.log('✅ Customers module loaded');