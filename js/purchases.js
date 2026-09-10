// ============================================
// 🚚 دوال المشتريات - شركة العبادي
// ============================================

let allPurchases = [];
let allSuppliers = [];
let allProducts = [];
let purchaseItems = [];
let editingPurchaseId = null;
let pendingDeleteId = null;

// ============================================
// 📥 تحميل البيانات
// ============================================

// تحميل المشتريات
async function loadPurchases() {
    try {
        allPurchases = await query('purchases');
        allSuppliers = await query('suppliers');
        allProducts = await query('products');
        displayPurchases(allPurchases);
        updatePurchaseStats();
        updateSupplierList();
        updateProductList();
    } catch (error) {
        console.error('❌ خطأ في تحميل المشتريات:', error);
        showToast('❌ فشل تحميل المشتريات', 'error');
    }
}

// تحديث قائمة الموردين في الفلتر
function updateSupplierList() {
    const filter = document.getElementById('supplierFilter');
    const select = document.getElementById('modalSupplierSelect');
    
    if (filter) {
        filter.innerHTML = '<option value="">جميع الموردين</option>' + 
            allSuppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    
    if (select) {
        select.innerHTML = '<option value="">اختر مورد...</option>' + 
            allSuppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
}

// تحديث قائمة المنتجات
function updateProductList() {
    const datalist = document.getElementById('productList');
    if (datalist) {
        datalist.innerHTML = allProducts.map(p => 
            `<option value="${p.name}" data-id="${p.id}" data-price="${p.buy_price || 0}"></option>`
        ).join('');
    }
}

// ============================================
// 📊 عرض المشتريات
// ============================================

// عرض المشتريات
function displayPurchases(purchases) {
    const tbody = document.getElementById('purchasesTable');
    if (!tbody) {
        console.warn('⚠️ عنصر purchasesTable غير موجود');
        return;
    }
    
    if (!purchases || purchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;">لا توجد فواتير شراء</td></tr>';
        return;
    }
    
    tbody.innerHTML = purchases.map((p, i) => {
        const status = (p.remaining_amount || 0) <= 0 ? 'مدفوع' : 'معلق';
        const statusClass = (p.remaining_amount || 0) <= 0 ? 'badge-paid' : 'badge-pending';
        const supplier = allSuppliers.find(s => s.id === p.supplier_id);
        const supplierName = supplier ? supplier.name : p.supplier_name || '-';
        
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${p.invoice_number || '#' + p.id}</strong></td>
                <td>${formatDate(p.created_at)}</td>
                <td>${supplierName}</td>
                <td style="color:#3b82f6;">${formatNumber(p.total_amount)} ج.م</td>
                <td style="color:#10b981;">${formatNumber(p.paid_amount)} ج.م</td>
                <td style="color:${(p.remaining_amount || 0) > 0 ? '#ef4444' : '#10b981'};">${formatNumber(p.remaining_amount)} ج.م</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td>
                    <button class="btn-action btn-view" onclick="viewPurchase(${p.id})">👁️</button>
                    <button class="btn-action btn-edit" onclick="editPurchase(${p.id})">✏️</button>
                    <button class="btn-action btn-delete" onclick="confirmDeletePurchase(${p.id})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// تحديث إحصائيات المشتريات
function updatePurchaseStats() {
    const totalEl = document.getElementById('totalPurchases');
    const amountEl = document.getElementById('totalAmount');
    const remainingEl = document.getElementById('totalRemaining');
    
    if (totalEl) totalEl.textContent = allPurchases.length;
    
    if (amountEl) {
        const total = allPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        amountEl.textContent = formatNumber(total) + ' ج.م';
    }
    
    if (remainingEl) {
        const remaining = allPurchases.reduce((sum, p) => sum + (p.remaining_amount || 0), 0);
        remainingEl.textContent = formatNumber(remaining) + ' ج.م';
    }
}

// فلترة المشتريات
function filterPurchases() {
    const from = document.getElementById('dateFrom')?.value;
    const to = document.getElementById('dateTo')?.value;
    const supplierId = document.getElementById('supplierFilter')?.value;
    const status = document.getElementById('statusFilter')?.value || 'all';
    
    let filtered = [...allPurchases];
    
    if (from) {
        filtered = filtered.filter(p => (p.created_at || '').split('T')[0] >= from);
    }
    if (to) {
        filtered = filtered.filter(p => (p.created_at || '').split('T')[0] <= to);
    }
    if (supplierId) {
        filtered = filtered.filter(p => p.supplier_id == supplierId);
    }
    if (status === 'paid') {
        filtered = filtered.filter(p => (p.remaining_amount || 0) <= 0);
    } else if (status === 'pending') {
        filtered = filtered.filter(p => (p.remaining_amount || 0) > 0);
    }
    
    displayPurchases(filtered);
}

// ============================================
// ➕ إضافة وتعديل المشتريات
// ============================================

// فتح نافذة الشراء
function openPurchaseModal(data = null) {
    const isEdit = !!data;
    
    // ✅ الحصول على العناصر مع التحقق
    const titleEl = document.getElementById('purchaseModalTitle');
    const editIdEl = document.getElementById('editPurchaseId');
    const invoiceEl = document.getElementById('modalInvoiceNumber');
    const supplierSelect = document.getElementById('modalSupplierSelect');
    const paidEl = document.getElementById('modalPaidAmount');
    const notesEl = document.getElementById('modalNotes');
    const productInput = document.getElementById('modalProductInput');
    const qtyEl = document.getElementById('modalQuantity');
    const priceEl = document.getElementById('modalUnitPrice');
    
    // ✅ التحقق من وجود العناصر
    if (!titleEl || !editIdEl || !invoiceEl || !supplierSelect || !paidEl || !notesEl) {
        console.error('❌ بعض عناصر نافذة المشتريات غير موجودة');
        showToast('خطأ في تحميل النافذة', 'error');
        return;
    }
    
    // ✅ تعيين القيم
    titleEl.textContent = isEdit ? '✏️ تعديل فاتورة شراء' : '🧾 فاتورة شراء جديدة';
    editIdEl.value = data?.id || '';
    invoiceEl.value = data?.invoice_number || 'PO-' + Date.now().toString().slice(-6);
    supplierSelect.value = data?.supplier_id || '';
    paidEl.value = data?.paid_amount || '0';
    notesEl.value = data?.notes || '';
    
    // ✅ تفريغ الأصناف
    purchaseItems = [];
    if (isEdit && data) {
        try {
            const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items || [];
            purchaseItems = items.map(item => ({
                product_id: item.product_id || item.id || null,
                product_name: item.product_name || item.name || 'منتج غير معروف',
                quantity: item.quantity || 0,
                unit_price: item.unit_price || item.price || 0,
                total: (item.quantity || 0) * (item.unit_price || item.price || 0)
            }));
        } catch(e) {
            purchaseItems = [];
        }
    }
    
    if (productInput) productInput.value = '';
    if (qtyEl) qtyEl.value = '';
    if (priceEl) priceEl.value = '';
    
    updatePurchaseItemsDisplay();
    openModal('purchaseModal');
    
    // ✅ التركيز على حقل المورد
    setTimeout(() => {
        if (supplierSelect) supplierSelect.focus();
    }, 300);
}

// فتح نافذة التعديل
function editPurchase(id) {
    const purchase = allPurchases.find(p => p.id === id);
    if (!purchase) {
        showToast('الفاتورة غير موجودة', 'error');
        return;
    }
    openPurchaseModal(purchase);
}

// ✅ اختيار منتج من القائمة
function selectProduct(selected) {
    const productInput = document.getElementById('modalProductInput');
    const priceEl = document.getElementById('modalUnitPrice');
    
    if (!productInput || !priceEl) return;
    
    // البحث عن المنتج المحدد
    const product = allProducts.find(p => p.id == selected);
    if (product) {
        productInput.value = product.name;
        priceEl.value = product.buy_price || 0;
        // تخزين ID المنتج
        productInput.dataset.productId = product.id;
    }
}

// ✅ إضافة صنف للشراء
function addPurchaseItem() {
    const productInput = document.getElementById('modalProductInput');
    const quantity = parseFloat(document.getElementById('modalQuantity')?.value);
    const unitPrice = parseFloat(document.getElementById('modalUnitPrice')?.value);
    
    if (!productInput) return;
    
    const productName = productInput.value.trim();
    const productId = productInput.dataset.productId || null;
    
    if (!productName) {
        showToast('يرجى اختيار منتج من القائمة', 'error');
        return;
    }
    if (!quantity || quantity <= 0) {
        showToast('يرجى إدخال كمية صحيحة', 'error');
        return;
    }
    if (!unitPrice || unitPrice <= 0) {
        showToast('يرجى إدخال سعر صحيح', 'error');
        return;
    }
    
    // ✅ البحث عن منتج موجود
    const existing = purchaseItems.find(item => item.product_name === productName);
    if (existing) {
        existing.quantity += quantity;
        existing.total = existing.quantity * existing.unit_price;
    } else {
        purchaseItems.push({
            product_id: productId,
            product_name: productName,
            quantity: quantity,
            unit_price: unitPrice,
            total: quantity * unitPrice
        });
    }
    
    // ✅ تفريغ الحقول
    productInput.value = '';
    productInput.dataset.productId = '';
    const qtyEl = document.getElementById('modalQuantity');
    const priceEl = document.getElementById('modalUnitPrice');
    if (qtyEl) qtyEl.value = '';
    if (priceEl) priceEl.value = '';
    
    updatePurchaseItemsDisplay();
    if (productInput) productInput.focus();
}

// ✅ إزالة صنف
function removePurchaseItem(index) {
    if (index < 0 || index >= purchaseItems.length) return;
    purchaseItems.splice(index, 1);
    updatePurchaseItemsDisplay();
}

// ✅ تحديث عرض الأصناف
function updatePurchaseItemsDisplay() {
    const container = document.getElementById('purchaseItemsList');
    const totalEl = document.getElementById('purchaseTotal');
    
    if (!container) {
        console.warn('⚠️ عنصر purchaseItemsList غير موجود');
        return;
    }
    
    if (purchaseItems.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">لا توجد أصناف</td></tr>';
        if (totalEl) totalEl.textContent = '0 ج.م';
        return;
    }
    
    let total = 0;
    container.innerHTML = purchaseItems.map((item, index) => {
        total += item.total;
        return `
            <tr>
                <td style="text-align:right;font-weight:600;">${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>${formatNumber(item.unit_price)} ج.م</td>
                <td style="color:#3b82f6;font-weight:700;">${formatNumber(item.total)} ج.م</td>
                <td>
                    <button class="btn-action btn-delete" onclick="removePurchaseItem(${index})" style="background:#fee2e2;color:#dc2626;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    if (totalEl) totalEl.textContent = formatNumber(total) + ' ج.م';
}

// ✅ حفظ فاتورة الشراء
async function savePurchase() {
    // ✅ الحصول على العناصر مع التحقق
    const id = document.getElementById('editPurchaseId')?.value;
    const supplierId = document.getElementById('modalSupplierSelect')?.value;
    const invoiceNumber = document.getElementById('modalInvoiceNumber')?.value;
    const paidAmount = parseFloat(document.getElementById('modalPaidAmount')?.value) || 0;
    const notes = document.getElementById('modalNotes')?.value?.trim() || '';
    
    if (!supplierId) {
        showToast('يرجى اختيار المورد', 'error');
        document.getElementById('modalSupplierSelect')?.focus();
        return;
    }
    if (purchaseItems.length === 0) {
        showToast('يرجى إضافة أصناف للفاتورة', 'error');
        return;
    }
    
    // ✅ الحصول على اسم المورد
    const supplier = allSuppliers.find(s => s.id == supplierId);
    if (!supplier) {
        showToast('المورد غير موجود', 'error');
        return;
    }
    
    const total = purchaseItems.reduce((sum, item) => sum + item.total, 0);
    const remaining = Math.max(0, total - paidAmount);
    
    const purchaseData = {
        invoice_number: invoiceNumber || 'PO-' + Date.now().toString().slice(-6),
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        items: JSON.stringify(purchaseItems.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
        }))),
        total_amount: total,
        paid_amount: paidAmount,
        remaining_amount: remaining,
        notes: notes || null,
        user_id: getCurrentUser()?.id || null,
        created_at: new Date().toISOString()
    };
    
    try {
        let result;
        
        if (id) {
            // ✅ تعديل فاتورة موجودة
            const oldPurchase = allPurchases.find(p => p.id === id);
            let oldItems = [];
            try {
                oldItems = typeof oldPurchase.items === 'string' ? JSON.parse(oldPurchase.items) : oldPurchase.items || [];
            } catch(e) { oldItems = []; }
            
            // ✅ تحديث المخزون: استرجاع الكميات القديمة
            for (const item of oldItems) {
                const product = await query('products', { name: item.product_name });
                if (product && product.length > 0) {
                    const currentQty = product[0].quantity || 0;
                    await update('products', product[0].id, { 
                        quantity: currentQty - (item.quantity || 0)
                    });
                }
            }
            
            // ✅ إضافة الكميات الجديدة
            for (const item of purchaseItems) {
                let product = await query('products', { name: item.product_name });
                if (product && product.length > 0) {
                    const currentQty = product[0].quantity || 0;
                    await update('products', product[0].id, { 
                        quantity: currentQty + item.quantity,
                        buy_price: item.unit_price
                    });
                } else {
                    await add('products', {
                        name: item.product_name,
                        quantity: item.quantity,
                        buy_price: item.unit_price,
                        sell_price: item.unit_price * 1.2,
                        unit: 'قطعة'
                    });
                }
            }
            
            result = await update('purchases', id, purchaseData);
        } else {
            // ✅ إضافة فاتورة جديدة
            for (const item of purchaseItems) {
                let product = await query('products', { name: item.product_name });
                if (product && product.length > 0) {
                    const currentQty = product[0].quantity || 0;
                    await update('products', product[0].id, { 
                        quantity: currentQty + item.quantity,
                        buy_price: item.unit_price
                    });
                } else {
                    await add('products', {
                        name: item.product_name,
                        quantity: item.quantity,
                        buy_price: item.unit_price,
                        sell_price: item.unit_price * 1.2,
                        unit: 'قطعة'
                    });
                }
            }
            
            result = await add('purchases', purchaseData);
        }
        
        if (result.success) {
            closeModal('purchaseModal');
            showToast(id ? '✅ تم تحديث فاتورة الشراء' : '✅ تم حفظ فاتورة الشراء', 'success');
            await loadPurchases();
            purchaseItems = [];
            updatePurchaseItemsDisplay();
        } else {
            showToast('❌ ' + (result.error || 'فشل حفظ الفاتورة'), 'error');
        }
    } catch (error) {
        console.error('❌ خطأ في حفظ الفاتورة:', error);
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// ============================================
// 👁️ عرض فاتورة الشراء
// ============================================

function viewPurchase(id) {
    const purchase = allPurchases.find(p => p.id === id);
    if (!purchase) {
        showToast('الفاتورة غير موجودة', 'error');
        return;
    }
    
    let items = [];
    try {
        items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : purchase.items || [];
    } catch(e) { items = []; }
    
    const content = document.getElementById('purchaseDetails');
    if (!content) {
        console.warn('⚠️ عنصر purchaseDetails غير موجود');
        return;
    }
    
    const supplier = allSuppliers.find(s => s.id === purchase.supplier_id);
    const supplierName = supplier ? supplier.name : purchase.supplier_name || '-';
    
    content.innerHTML = `
        <div class="detail-row">
            <div class="detail-card">
                <p><strong>رقم الفاتورة:</strong> ${purchase.invoice_number}</p>
                <p><strong>المورد:</strong> ${supplierName}</p>
                <p><strong>التاريخ:</strong> ${formatDate(purchase.created_at)}</p>
                ${purchase.notes ? `<p><strong>ملاحظات:</strong> ${purchase.notes}</p>` : ''}
            </div>
            <div class="detail-card">
                <p><strong>الإجمالي:</strong> <span style="color:#3b82f6;">${formatNumber(purchase.total_amount)} ج.م</span></p>
                <p><strong>المدفوع:</strong> <span style="color:#10b981;">${formatNumber(purchase.paid_amount)} ج.م</span></p>
                <p><strong>المتبقي:</strong> <span style="color:${(purchase.remaining_amount || 0) > 0 ? '#ef4444' : '#10b981'};">${formatNumber(purchase.remaining_amount)} ج.م</span></p>
            </div>
        </div>
        <h4 style="margin:10px 0;font-size:14px;">📦 المنتجات</h4>
        <div class="table-responsive">
            <table style="font-size:13px;">
                <thead>
                    <tr>
                        <th style="text-align:right;">المنتج</th>
                        <th>الكمية</th>
                        <th>سعر الوحدة</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td style="text-align:right;font-weight:600;">${item.product_name || 'منتج غير معروف'}</td>
                            <td>${item.quantity}</td>
                            <td>${formatNumber(item.unit_price || item.price)} ج.م</td>
                            <td style="color:#3b82f6;font-weight:700;">${formatNumber(item.total || (item.quantity * (item.unit_price || item.price)))} ج.م</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background:#f8fafc;font-weight:700;">
                        <td colspan="3" style="text-align:left;">الإجمالي</td>
                        <td style="color:#3b82f6;">${formatNumber(purchase.total_amount)} ج.م</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    openModal('detailsModal');
}

// ============================================
// 🗑️ حذف المشتريات
// ============================================

// تأكيد حذف الفاتورة
function confirmDeletePurchase(id) {
    const purchase = allPurchases.find(p => p.id === id);
    if (!purchase) return;
    
    pendingDeleteId = id;
    const msgEl = document.getElementById('confirmMessage');
    if (msgEl) {
        msgEl.textContent = `⚠️ هل أنت متأكد من حذف فاتورة "${purchase.invoice_number}"؟`;
    }
    openModal('confirmModal');
}

// حذف الفاتورة
async function deletePurchase() {
    if (!pendingDeleteId) return;
    
    try {
        // ✅ استرجاع الكميات من المخزون قبل الحذف
        const purchase = allPurchases.find(p => p.id === pendingDeleteId);
        if (purchase) {
            let items = [];
            try {
                items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : purchase.items || [];
            } catch(e) { items = []; }
            
            for (const item of items) {
                const product = await query('products', { name: item.product_name });
                if (product && product.length > 0) {
                    const currentQty = product[0].quantity || 0;
                    await update('products', product[0].id, { 
                        quantity: currentQty - (item.quantity || 0)
                    });
                }
            }
        }
        
        const result = await remove('purchases', pendingDeleteId);
        if (result.success) {
            closeModal('confirmModal');
            pendingDeleteId = null;
            showToast('✅ تم حذف فاتورة الشراء', 'success');
            await loadPurchases();
        } else {
            showToast('❌ ' + (result.error || 'فشل الحذف'), 'error');
        }
    } catch (error) {
        console.error('❌ خطأ في حذف الفاتورة:', error);
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// ============================================
// 📤 تصدير الدوال
// ============================================

window.loadPurchases = loadPurchases;
window.filterPurchases = filterPurchases;
window.openPurchaseModal = openPurchaseModal;
window.editPurchase = editPurchase;
window.selectProduct = selectProduct;
window.addPurchaseItem = addPurchaseItem;
window.removePurchaseItem = removePurchaseItem;
window.savePurchase = savePurchase;
window.viewPurchase = viewPurchase;
window.confirmDeletePurchase = confirmDeletePurchase;
window.deletePurchase = deletePurchase;

// ✅ تحميل المشتريات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('purchasesTable')) {
        loadPurchases();
    }
});

console.log('✅ Purchases module loaded');