// ============================================
// 🏢 دوال الموردين - شركة العبادي
// ============================================

let allSuppliers = [];
let allPurchases = [];
let allPayments = [];
let editingSupplierId = null;
let pendingDeleteId = null;
let currentSupplierId = null;

// ============================================
// 📥 تحميل وعرض الموردين
// ============================================

// تحميل الموردين
async function loadSuppliers() {
    try {
        allSuppliers = await query('suppliers');
        allPurchases = await query('purchases');
        allPayments = await query('supplier_payments') || [];
        displaySuppliers(allSuppliers);
        updateSupplierStats();
    } catch (error) {
        console.error('❌ خطأ في تحميل الموردين:', error);
        showToast('❌ فشل تحميل الموردين', 'error');
    }
}

// عرض الموردين
function displaySuppliers(suppliers) {
    const container = document.getElementById('suppliersList');
    if (!container) {
        console.warn('⚠️ عنصر suppliersList غير موجود');
        return;
    }
    
    if (!suppliers || suppliers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏢</div>
                <p>لا يوجد موردين</p>
                <p style="font-size:12px;color:var(--text-light);">اضغط على "مورد جديد"</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = suppliers.map(s => {
        const stats = getSupplierStats(s.id);
        return `
            <div class="supplier-card">
                <div class="supplier-info">
                    <div class="supplier-header">
                        <span class="supplier-name">${s.name}</span>
                        ${s.company_name ? `<span class="supplier-company">🏢 ${s.company_name}</span>` : ''}
                    </div>
                    <div class="supplier-details">
                        ${s.phone ? `📞 ${s.phone}` : ''}
                        ${s.address ? `| 📍 ${s.address}` : ''}
                    </div>
                    <div class="supplier-stats">
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
                </div>
                <div class="supplier-actions">
                    <button class="btn-action btn-view" onclick="viewSupplierDetails(${s.id})">📋</button>
                    <button class="btn-action btn-pay" onclick="openPaymentModal(${s.id})">💵</button>
                    <button class="btn-action btn-edit" onclick="editSupplier(${s.id})">✏️</button>
                    <button class="btn-action btn-delete" onclick="confirmDeleteSupplier(${s.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// حساب إحصائيات المورد
function getSupplierStats(supplierId) {
    // فواتير الشراء
    const purchases = allPurchases.filter(p => p.supplier_id == supplierId);
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const totalPaidInPurchases = purchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
    
    // المدفوعات المنفصلة
    const payments = allPayments.filter(p => p.supplier_id == supplierId);
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // الاستردادات (إذا وجدت)
    const refunds = allPayments.filter(p => p.supplier_id == supplierId && p.type === 'refund');
    const totalRefunds = refunds.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const totalPaid = totalPaidInPurchases + totalPayments - totalRefunds;
    const remaining = totalPurchases - totalPaid;
    
    return {
        totalPurchases,
        totalPaid,
        remaining: Math.max(0, remaining),
        purchasesCount: purchases.length,
        paymentsCount: payments.length
    };
}

// تحديث إحصائيات الموردين
function updateSupplierStats() {
    const totalEl = document.getElementById('totalSuppliers');
    const debtEl = document.getElementById('totalDebt');
    const paidEl = document.getElementById('totalPaid');
    const purchasesEl = document.getElementById('totalPurchases');
    
    if (totalEl) totalEl.textContent = allSuppliers.length;
    
    let totalDebt = 0;
    let totalPaid = 0;
    let totalPurchases = 0;
    
    allSuppliers.forEach(s => {
        const stats = getSupplierStats(s.id);
        totalDebt += stats.remaining;
        totalPaid += stats.totalPaid;
        totalPurchases += stats.totalPurchases;
    });
    
    if (debtEl) debtEl.textContent = formatNumber(totalDebt) + ' ج.م';
    if (paidEl) paidEl.textContent = formatNumber(totalPaid) + ' ج.م';
    if (purchasesEl) purchasesEl.textContent = allPurchases.length;
}

// فلترة الموردين
function filterSuppliers() {
    const term = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';
    
    if (!term) {
        displaySuppliers(allSuppliers);
        return;
    }
    
    const filtered = allSuppliers.filter(s => 
        s.name.toLowerCase().includes(term) ||
        (s.company_name && s.company_name.toLowerCase().includes(term)) ||
        (s.phone && s.phone.includes(term))
    );
    
    displaySuppliers(filtered);
}

// ============================================
// ➕ إضافة وتعديل الموردين
// ============================================

// فتح نافذة المورد
function openSupplierModal(data = null) {
    const isEdit = !!data;
    
    const titleEl = document.getElementById('supplierModalTitle');
    const editIdEl = document.getElementById('editSupplierId');
    const nameEl = document.getElementById('supplierName');
    const companyEl = document.getElementById('supplierCompany');
    const phoneEl = document.getElementById('supplierPhone');
    const addressEl = document.getElementById('supplierAddress');
    const balanceEl = document.getElementById('supplierBalance');
    
    if (!titleEl || !editIdEl || !nameEl || !companyEl || !phoneEl || !addressEl || !balanceEl) {
        console.error('❌ بعض عناصر نافذة المورد غير موجودة');
        showToast('خطأ في تحميل النافذة', 'error');
        return;
    }
    
    titleEl.textContent = isEdit ? '✏️ تعديل مورد' : '➕ مورد جديد';
    editIdEl.value = data?.id || '';
    nameEl.value = data?.name || '';
    companyEl.value = data?.company_name || '';
    phoneEl.value = data?.phone || '';
    addressEl.value = data?.address || '';
    balanceEl.value = data?.balance || '0';
    
    openModal('supplierModal');
}

// فتح نافذة التعديل
function editSupplier(id) {
    const supplier = allSuppliers.find(s => s.id === id);
    if (!supplier) {
        showToast('المورد غير موجود', 'error');
        return;
    }
    openSupplierModal(supplier);
}

// حفظ المورد
async function saveSupplier() {
    const id = document.getElementById('editSupplierId')?.value;
    const name = document.getElementById('supplierName')?.value?.trim();
    const company = document.getElementById('supplierCompany')?.value?.trim();
    const phone = document.getElementById('supplierPhone')?.value?.trim();
    const address = document.getElementById('supplierAddress')?.value?.trim();
    const balance = parseFloat(document.getElementById('supplierBalance')?.value) || 0;
    
    if (!name) {
        showToast('يرجى إدخال اسم المورد', 'error');
        return;
    }
    
    const data = {
        name,
        company_name: company || null,
        phone: phone || null,
        address: address || null,
        balance
    };
    
    try {
        let result;
        if (id) {
            result = await update('suppliers', id, data);
        } else {
            const code = 'S' + Date.now().toString().slice(-6);
            data.code = code;
            result = await add('suppliers', data);
        }
        
        if (result.success) {
            closeModal('supplierModal');
            showToast(id ? '✅ تم تحديث المورد' : '✅ تم إضافة المورد', 'success');
            await loadSuppliers();
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
function openPaymentModal(supplierId) {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) {
        showToast('المورد غير موجود', 'error');
        return;
    }
    
    currentSupplierId = supplierId;
    const stats = getSupplierStats(supplierId);
    
    const nameEl = document.getElementById('paySupplierName');
    const debtEl = document.getElementById('payCurrentDebt');
    const amountEl = document.getElementById('payAmount');
    const methodEl = document.getElementById('payMethod');
    const noteEl = document.getElementById('payNote');
    
    if (nameEl) nameEl.value = supplier.name;
    if (debtEl) debtEl.value = formatNumber(stats.remaining) + ' ج.م';
    if (amountEl) amountEl.value = '';
    if (methodEl) methodEl.value = 'نقدي';
    if (noteEl) noteEl.value = '';
    
    if (stats.remaining <= 0) {
        showToast('⚠️ لا توجد مستحقات على هذا المورد', 'info');
    }
    
    openModal('paymentModal');
}

// ✅ إضافة دفعة للمورد
async function addPayment() {
    const supplierId = currentSupplierId;
    const amount = parseFloat(document.getElementById('payAmount')?.value);
    const method = document.getElementById('payMethod')?.value || 'نقدي';
    const notes = document.getElementById('payNote')?.value?.trim() || '';
    
    if (!supplierId) {
        showToast('خطأ في بيانات المورد', 'error');
        return;
    }
    if (!amount || amount <= 0) {
        showToast('أدخل مبلغ صحيح', 'error');
        return;
    }
    
    const stats = getSupplierStats(supplierId);
    if (amount > stats.remaining) {
        showToast(`⚠️ المبلغ أكبر من المستحق (${formatNumber(stats.remaining)} ج.م)`, 'error');
        return;
    }
    
    const data = {
        supplier_id: Number(supplierId),
        amount: amount,
        payment_method: method,
        payment_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        notes: notes || null,
        type: 'payment',
        created_by: getCurrentUser()?.id || null,
        created_at: new Date().toISOString()
    };
    
    try {
        const result = await add('supplier_payments', data);
        if (result.success) {
            closeModal('paymentModal');
            showToast(`✅ تم تسجيل دفعة بقيمة ${formatNumber(amount)} ج.م`, 'success');
            await loadSuppliers();
            // تحديث عرض التفاصيل إذا كان مفتوحاً
            if (currentSupplierId) {
                viewSupplierDetails(currentSupplierId);
            }
        } else {
            showToast('❌ ' + (result.error || 'فشل تسجيل الدفعة'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// ============================================
// 📋 عرض تفاصيل المورد
// ============================================

function viewSupplierDetails(supplierId) {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) {
        showToast('المورد غير موجود', 'error');
        return;
    }
    
    currentSupplierId = supplierId;
    const stats = getSupplierStats(supplierId);
    
    // جلب فواتير المورد
    const supplierPurchases = allPurchases
        .filter(p => p.supplier_id == supplierId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // جلب مدفوعات المورد
    const supplierPayments = allPayments
        .filter(p => p.supplier_id == supplierId && p.type !== 'refund')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // جلب استردادات المورد
    const supplierRefunds = allPayments
        .filter(p => p.supplier_id == supplierId && p.type === 'refund')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const content = document.getElementById('supplierDetailsContent');
    if (!content) {
        console.warn('⚠️ عنصر supplierDetailsContent غير موجود');
        return;
    }
    
    // بناء جدول الفواتير
    let purchasesHtml = '';
    if (supplierPurchases.length === 0) {
        purchasesHtml = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">لا توجد فواتير</td></tr>';
    } else {
        purchasesHtml = supplierPurchases.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${p.invoice_number || '#' + p.id}</strong></td>
                <td>${formatDate(p.created_at)}</td>
                <td style="color:#3b82f6;">${formatNumber(p.total_amount)} ج.م</td>
                <td style="color:#10b981;">${formatNumber(p.paid_amount)} ج.م</td>
                <td style="color:${(p.remaining_amount || 0) > 0 ? '#ef4444' : '#10b981'};">${formatNumber(p.remaining_amount)} ج.م</td>
            </tr>
        `).join('');
    }
    
    // بناء جدول المدفوعات
    let paymentsHtml = '';
    if (supplierPayments.length === 0 && supplierRefunds.length === 0) {
        paymentsHtml = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">لا توجد مدفوعات</td></tr>';
    } else {
        const allTransactions = [
            ...supplierPayments.map(p => ({ ...p, type_label: '💵 دفعة', type_class: 'payment' })),
            ...supplierRefunds.map(p => ({ ...p, type_label: '↩️ استرداد', type_class: 'refund' }))
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
        <!-- معلومات المورد -->
        <div class="detail-row">
            <div class="detail-card">
                <h4>🏢 معلومات المورد</h4>
                <div class="detail-item"><span class="lbl">الاسم:</span><span class="val"><strong>${supplier.name}</strong></span></div>
                ${supplier.company_name ? `<div class="detail-item"><span class="lbl">الشركة:</span><span class="val">${supplier.company_name}</span></div>` : ''}
                ${supplier.phone ? `<div class="detail-item"><span class="lbl">الهاتف:</span><span class="val">${supplier.phone}</span></div>` : ''}
                ${supplier.address ? `<div class="detail-item"><span class="lbl">العنوان:</span><span class="val">${supplier.address}</span></div>` : ''}
                ${supplier.balance ? `<div class="detail-item"><span class="lbl">الرصيد الافتتاحي:</span><span class="val" style="color:#f59e0b;">${formatNumber(supplier.balance)} ج.م</span></div>` : ''}
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
                        <span class="summary-value">${stats.purchasesCount}</span>
                    </div>
                </div>
                <button class="btn-add" onclick="openPaymentModal(${supplier.id})" style="width:100%;margin-top:10px;">
                    💵 إضافة دفعة
                </button>
            </div>
        </div>
        
        <!-- فواتير المورد -->
        <div class="detail-card" style="margin-top:12px;">
            <h4>🧾 فواتير المشتريات <span style="font-size:12px;color:#94a3b8;">(${supplierPurchases.length})</span></h4>
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
                    <tbody>${purchasesHtml}</tbody>
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
            <h4>💳 سجل المدفوعات والاستردادات <span style="font-size:12px;color:#94a3b8;">(${supplierPayments.length + supplierRefunds.length})</span></h4>
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
    
    openModal('supplierDetailsModal');
}

// ============================================
// 🗑️ حذف الموردين
// ============================================

// تأكيد حذف المورد
function confirmDeleteSupplier(id) {
    const supplier = allSuppliers.find(s => s.id === id);
    if (!supplier) return;
    
    const stats = getSupplierStats(id);
    if (stats.totalPurchases > 0) {
        showToast(`⚠️ لا يمكن حذف المورد "${supplier.name}" لديه فواتير مسجلة`, 'error');
        return;
    }
    
    pendingDeleteId = id;
    const msgEl = document.getElementById('confirmMessage');
    if (msgEl) {
        msgEl.textContent = `⚠️ هل أنت متأكد من حذف "${supplier.name}"؟`;
    }
    openModal('confirmModal');
}

// حذف المورد
async function deleteSupplier() {
    if (!pendingDeleteId) return;
    
    try {
        const result = await remove('suppliers', pendingDeleteId);
        if (result.success) {
            closeModal('confirmModal');
            pendingDeleteId = null;
            showToast('✅ تم حذف المورد', 'success');
            await loadSuppliers();
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

window.loadSuppliers = loadSuppliers;
window.filterSuppliers = filterSuppliers;
window.openSupplierModal = openSupplierModal;
window.editSupplier = editSupplier;
window.saveSupplier = saveSupplier;
window.confirmDeleteSupplier = confirmDeleteSupplier;
window.deleteSupplier = deleteSupplier;
window.viewSupplierDetails = viewSupplierDetails;
window.openPaymentModal = openPaymentModal;
window.addPayment = addPayment;
window.getSupplierStats = getSupplierStats;

// ✅ تحميل الموردين عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('suppliersList')) {
        loadSuppliers();
    }
});

console.log('✅ Suppliers module loaded');