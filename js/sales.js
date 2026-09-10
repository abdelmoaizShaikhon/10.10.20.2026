// ============================================
// 🛒 دوال المبيعات - شركة العبادي
// ============================================

let cart = [];
let products = [];
let customers = [];
let selectedCustomer = null;
let storeSettings = {};
let lastSaleData = null;
let heldInvoicesList = [];
let confirmCallback = null;
let unitSelectProduct = null;
let unitSelectUnits = [];
let lastInvoiceNumber = 10000;
let sales = [];
let editingInvoiceId = null;
let editingInvoiceData = null;
let isProcessingSale = false;
let isRefreshing = false;
let isRestoring = false;
let isPageLoading = true;

// ============================================
// 📢 دالة التنبيهات (إذا لم تكن موجودة)
// ============================================

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `notification notification-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// 📦 دوال المودال
// ============================================

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
}

document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('show');
    });
});

// ============================================
// ⚠️ مودال التأكيد
// ============================================

function showConfirmModal(message, onConfirm) {
    const msgEl = document.getElementById('confirmModalMessage');
    if (msgEl) msgEl.textContent = message;
    confirmCallback = onConfirm;
    openModal('confirmModal');
}

function closeConfirmModal() {
    closeModal('confirmModal');
    confirmCallback = null;
}

const confirmBtn = document.getElementById('confirmModalOkBtn');
if (confirmBtn) {
    confirmBtn.onclick = function() {
        if (confirmCallback) {
            confirmCallback();
        }
        closeConfirmModal();
    };
}

// ============================================
// 🕐 تحديث الوقت
// ============================================

function updateTimes() {
    const now = new Date();
    const dateInput = document.getElementById('invoiceDate');
    const timeInput = document.getElementById('invoiceTime');
    const bottomDateTime = document.getElementById('bottomDateTime');
    
    if (dateInput) dateInput.value = now.toISOString().split('T')[0];
    if (timeInput) timeInput.value = now.toTimeString().split(' ')[0].substring(0, 5);
    if (bottomDateTime) {
        bottomDateTime.textContent = '🕐 ' + now.toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit'
        });
    }
}
setInterval(updateTimes, 30000);
updateTimes();

// ============================================
// 🔢 توليد رقم فاتورة
// ============================================

async function generateInvoiceNumber() {
    try {
        const salesData = await query('sales') || [];
        let maxNumber = 0;
        for (const sale of salesData) {
            if (sale.invoice_number) {
                const parts = sale.invoice_number.split('-');
                if (parts.length === 2) {
                    const num = parseInt(parts[1]);
                    if (!isNaN(num) && num > maxNumber) {
                        maxNumber = num;
                    }
                }
            }
        }
        const newNumber = maxNumber + 1;
        lastInvoiceNumber = newNumber;
        const invNum = 'INV-' + String(newNumber).padStart(5, '0');
        const invoiceInput = document.getElementById('invoiceNumber');
        if (invoiceInput) invoiceInput.value = invNum;
        return invNum;
    } catch (error) {
        console.error('خطأ في توليد رقم الفاتورة:', error);
        lastInvoiceNumber++;
        const invNum = 'INV-' + String(lastInvoiceNumber).padStart(5, '0');
        const invoiceInput = document.getElementById('invoiceNumber');
        if (invoiceInput) invoiceInput.value = invNum;
        return invNum;
    }
}

// ============================================
// 📥 تحميل البيانات
// ============================================

async function loadData() {
    try {
        isPageLoading = true;
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}');
        const userNameDisplay = document.getElementById('userNameDisplay');
        if (userNameDisplay && currentUser) {
            userNameDisplay.innerHTML = '👤 ' + (currentUser.fullName || currentUser.username || 'موظف');
        }

        products = await query('products') || [];
        window.availableProducts = products.filter(p => (p.quantity || 0) > 0);
        window.allProducts = products;

        customers = await query('customers') || [];
        sales = await query('sales') || [];

        // تحديث فلتر الفئات
        const catFilter = document.getElementById('categoryFilter');
        if (catFilter) {
            catFilter.innerHTML = '<option value="all" selected>📂 الكل</option>';
            const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = '📁 ' + cat;
                catFilter.appendChild(option);
            });
        }

        await generateInvoiceNumber();
        isPageLoading = false;
        
        console.log('✅ تم تحميل البيانات بنجاح');
        console.log('📦 المنتجات:', products.length);
        console.log('👤 العملاء:', customers.length);
        
    } catch (error) { 
        console.error('خطأ في تحميل البيانات:', error);
        isPageLoading = false;
    }
}

// ============================================
// 👤 دوال العملاء
// ============================================

function selectDefaultCustomer() {
    clearSelectedCustomer();
    const btn1 = document.getElementById('customerBtn1');
    if (btn1) btn1.classList.add('active-customer');
    const btn4 = document.getElementById('customerBtn4');
    if (btn4) btn4.style.display = 'none';
}

function openCustomerModal() {
    const searchInput = document.getElementById('modalCustomerSearch');
    if (searchInput) searchInput.value = '';
    filterCustomersModal();
    openModal('customerModal');
    if (searchInput) setTimeout(() => searchInput.focus(), 300);
}

function filterCustomersModal() {
    const term = document.getElementById('modalCustomerSearch');
    const list = document.getElementById('modalCustomerList');
    if (!term || !list) return;
    
    const searchTerm = term.value.toLowerCase();
    const filtered = customers.filter(c => 
        (c.code && c.code.toLowerCase().includes(searchTerm)) || 
        (c.name && c.name.toLowerCase().includes(searchTerm)) || 
        (c.phone && c.phone.includes(searchTerm))
    );
    
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">لا يوجد عملاء</p>';
    } else {
        list.innerHTML = filtered.map(c => `
            <div class="cust-list-item" onclick="selectCustomerFromModal('${c.id || c._id}')">
                <div><strong>👤 ${c.name}</strong><br>
                <small>${c.code || ''} ${c.phone ? '| 📞 ' + c.phone : ''} ${c.type || ''}</small></div>
                <button class="select-btn">اختيار</button>
            </div>
        `).join('');
    }
}

function selectCustomerFromModal(customerId) {
    const customer = customers.find(c => (c.id == customerId || c._id == customerId));
    if (customer) selectCustomer(customer);
    closeModal('customerModal');
}

function selectCustomer(customer) {
    selectedCustomer = customer;
    
    const btn1 = document.getElementById('customerBtn1');
    const btn2 = document.getElementById('customerBtn2');
    const btn4 = document.getElementById('customerBtn4');
    const infoBox = document.getElementById('customerInfoBox');
    const custName = document.getElementById('custName');
    const custPhone = document.getElementById('custPhone');
    const custType = document.getElementById('custType');
    const custDiscount = document.getElementById('custDiscount');
    const discountInput = document.getElementById('discountPercent');
    const debtInput = document.getElementById('customerDebt');
    
    if (btn1) btn1.classList.remove('active-customer');
    if (btn2) {
        btn2.textContent = '👤 ' + customer.name;
        btn2.classList.add('active-customer');
    }
    if (custName) custName.textContent = customer.name;
    if (custPhone) custPhone.textContent = customer.phone || '-';
    if (custType) custType.textContent = customer.type || 'عادي';
    if (custDiscount) custDiscount.textContent = customer.discount_percent || 0;
    if (infoBox) infoBox.style.display = 'block';
    if (btn4) btn4.style.display = 'block';
    
    if (discountInput) discountInput.value = customer.discount_percent || 0;
    
    const previousDebt = getCustomerTotalDebt(customer.id);
    if (debtInput) debtInput.value = previousDebt.toFixed(2) + ' ج.م';
    
    updateTotals();
    showNotification(`✅ ${customer.name}`, 'success');
}

function clearSelectedCustomer() {
    selectedCustomer = null;
    
    const btn1 = document.getElementById('customerBtn1');
    const btn2 = document.getElementById('customerBtn2');
    const infoBox = document.getElementById('customerInfoBox');
    const btn4 = document.getElementById('customerBtn4');
    const discountInput = document.getElementById('discountPercent');
    const debtInput = document.getElementById('customerDebt');
    const balanceInput = document.getElementById('currentBalance');
    
    if (btn1) btn1.classList.add('active-customer');
    if (btn2) {
        btn2.textContent = '🔍 بحث';
        btn2.classList.remove('active-customer');
    }
    if (infoBox) infoBox.style.display = 'none';
    if (btn4) btn4.style.display = 'none';
    if (discountInput) discountInput.value = 0;
    if (debtInput) debtInput.value = '0 ج.م';
    if (balanceInput) balanceInput.value = '0 ج.م';
    
    updateTotals();
}

// ============================================
// 💰 دوال حساب الرصيد
// ============================================

function getCustomerTotalDebt(customerId) {
    if (!sales || !Array.isArray(sales)) return 0;
    let totalDebt = 0;
    const customerSales = sales.filter(s => s.customer_id == customerId);
    for (const s of customerSales) {
        const remaining = Number(s.remaining_amount) || 0;
        if (remaining > 0) {
            totalDebt += remaining;
        }
    }
    return Math.max(0, totalDebt);
}

// ============================================
// 🔢 دوال التنسيق
// ============================================

function formatNum(num) {
    if (num === undefined || num === null) return '0';
    const n = Number(num);
    return isNaN(n) ? '0' : n.toLocaleString('en-EG');
}

// ============================================
// 🔄 تحديث الإجماليات
// ============================================

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        return sum + (price * quantity);
    }, 0);
    
    const totalQty = cart.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    let discountPct = parseFloat(document.getElementById('discountPercent')?.value) || 0;

    if (selectedCustomer && selectedCustomer.discount_percent) {
        const custDisc = parseFloat(selectedCustomer.discount_percent);
        if (custDisc > discountPct) { 
            discountPct = custDisc; 
            const dp = document.getElementById('discountPercent');
            if (dp) dp.value = custDisc;
        }
    }

    const discountAmt = subtotal * (discountPct / 100);
    const total = subtotal - discountAmt;
    const paid = parseFloat(document.getElementById('paidAmount')?.value) || 0;
    const remaining = total - paid;

    const itemsCount = document.getElementById('totalItemsCount');
    const totalQtyEl = document.getElementById('totalQuantity');
    const totalAmount = document.getElementById('totalAmount');
    const remainingAmount = document.getElementById('remainingAmount');
    
    if (itemsCount) itemsCount.textContent = cart.length;
    if (totalQtyEl) totalQtyEl.textContent = totalQty.toFixed(2);
    if (totalAmount) totalAmount.value = total.toFixed(2);
    if (remainingAmount) remainingAmount.value = remaining.toFixed(2);

    let previousDebt = 0;
    if (selectedCustomer && selectedCustomer.id) {
        previousDebt = getCustomerTotalDebt(selectedCustomer.id);
        const debtInput = document.getElementById('customerDebt');
        if (debtInput) debtInput.value = previousDebt.toFixed(2) + ' ج.م';
    } else {
        const debtInput = document.getElementById('customerDebt');
        if (debtInput) debtInput.value = '0 ج.م';
    }

    const currentBalance = previousDebt + total - paid;
    const balanceInput = document.getElementById('currentBalance');
    if (balanceInput) balanceInput.value = currentBalance.toFixed(2) + ' ج.م';
}

// ============================================
// 🛒 دوال السلة
// ============================================

async function addToCart(productId, unit, price) {
    const product = window.allProducts.find(p => (p.id == productId || p._id == productId));
    if (!product) { 
        showNotification('❌ المنتج غير موجود', 'error'); 
        return; 
    }
    
    const costPrice = parseFloat(product.buy_price || product.purchase_price || product.cost_price || 0);
    const sellingPrice = parseFloat(price) || parseFloat(product.sell_price) || 0;
    
    if (sellingPrice < costPrice) {
        showNotification(`⚠️ سعر البيع (${sellingPrice.toFixed(2)}) أقل من سعر الشراء (${costPrice.toFixed(2)})`, 'error');
        return;
    }
    
    if (sellingPrice <= 0) {
        showNotification('⚠️ السعر يجب أن يكون أكبر من صفر', 'error');
        return;
    }
    
    const selectedPrice = sellingPrice;
    const selectedUnit = unit || product.unit || 'قطعة';

    if ((product.quantity || 0) <= 0) {
        showNotification('⚠️ المنتج غير متوفر', 'error');
        return;
    }

    const qtyToAdd = 1;
    
    const exist = cart.find(item => item.productId == productId && item.unit == selectedUnit);
    if (exist) {
        if (exist.quantity + qtyToAdd > product.quantity) {
            showNotification(`⚠️ الكمية المتاحة: ${product.quantity}`, 'error');
            return;
        }
        exist.quantity = parseFloat((exist.quantity + qtyToAdd).toFixed(2));
    } else {
        cart.push({
            productId: productId, 
            name: product.name, 
            price: selectedPrice,
            quantity: qtyToAdd, 
            barcode: product.barcode || '', 
            unit: selectedUnit,
            maxQuantity: product.quantity || 0, 
            cost_price: costPrice,
            isDeducted: false
        });
    }
    
    updateInvoiceTable();
    showNotification(`✅ تم إضافة ${product.name} (${selectedUnit})`, 'success');
}

function updateInvoiceTable() {
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) return;
    
    if (cart.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6"><span class="empty-icon">🛒</span>السلة فارغة</td></tr>';
        updateTotals(); 
        return;
    }
    
    tbody.innerHTML = cart.map((item, index) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const itemTotal = price * quantity;
        
        const product = window.allProducts.find(p => (p.id == item.productId || p._id == item.productId));
        const isOutOfStock = product && (product.quantity || 0) <= 0;
        const remainingQty = product ? product.quantity : 0;
        
        return `<tr class="${index === cart.length - 1 ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}">
            <td>${index + 1}</td>
            <td class="item-name">
                ${item.name || 'منتج غير معروف'}
                ${isOutOfStock ? ' <span class="out-of-stock-badge">منتهي</span>' : ''}
                <span class="remaining-qty">المتبقي: ${remainingQty}</span>
            </td>
            <td>
                <input type="number" class="price-edit" 
                       value="${price}" step="0.01" min="0"
                       onchange="updateItemPrice(${index}, this.value)">
            </td>
            <td>
                <input type="number" class="qty-input" value="${quantity}" step="0.25" min="0.25" max="${item.maxQuantity || 9999}" 
                       onchange="updateQuantityInput(${index}, this.value)">
            </td>
            <td class="item-total">${itemTotal.toFixed(2)}</td>
            <td><button class="delete-btn" onclick="removeFromCart(${index})">✕</button></td>
        </tr>`;
    }).join('');
    
    updateTotals();
}

function updateItemPrice(index, value) {
    const price = parseFloat(value);
    if (price <= 0) {
        showNotification('⚠️ السعر يجب أن يكون أكبر من صفر', 'error');
        updateInvoiceTable();
        return;
    }
    
    const item = cart[index];
    const costPrice = parseFloat(item.cost_price) || 0;
    
    if (price < costPrice) {
        showNotification(`⚠️ لا يمكن أن يقل السعر (${price.toFixed(2)}) عن سعر الشراء (${costPrice.toFixed(2)})`, 'error');
        updateInvoiceTable();
        return;
    }
    
    cart[index].price = price;
    updateInvoiceTable();
    showNotification(`✅ تم تحديث السعر إلى ${price.toFixed(2)}`, 'info');
}

async function updateQuantityInput(index, value) {
    const item = cart[index];
    const newQty = parseFloat(value) || 0;
    
    if (newQty > 0) {
        if (newQty > item.maxQuantity) {
            showNotification(`⚠️ الكمية المتاحة: ${item.maxQuantity}`, 'error');
            updateInvoiceTable();
            return;
        }
        item.quantity = newQty;
        updateInvoiceTable();
    } else if (newQty <= 0) {
        await removeFromCart(index);
    }
}

async function removeFromCart(index) {
    const removed = cart[index];
    if (!removed) return;
    
    cart.splice(index, 1);
    updateInvoiceTable();
    showNotification(`🗑️ تم إزالة ${removed.name}`, 'info');
}

// ============================================
// 🔍 دوال البحث
// ============================================

function selectProduct(productId) {
    const product = window.allProducts.find(p => (p.id == productId || p._id == productId));
    if (product) {
        if ((product.quantity || 0) <= 0) {
            showNotification('⚠️ المنتج منتهي الكمية', 'error');
            return;
        }
        showUnitSelection(product);
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) barcodeInput.value = '';
        const results = document.getElementById('searchResults');
        if (results) results.style.display = 'none';
    }
}

function showUnitSelection(product) {
    const costPrice = parseFloat(product.buy_price || product.purchase_price || product.cost_price || 0);
    const sellPrice = parseFloat(product.sell_price) || 0;
    
    if (sellPrice < costPrice) {
        showNotification(`⚠️ سعر البيع (${sellPrice.toFixed(2)}) أقل من سعر الشراء (${costPrice.toFixed(2)})`, 'error');
        return;
    }
    
    const content = document.getElementById('unitSelectContent');
    if (!content) return;
    
    let html = `
        <div style="padding:10px;">
            <h4 style="margin-bottom:15px;text-align:center;">${product.name}</h4>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button onclick="addToCart('${product.id}', 'قطعة', ${sellPrice})" 
                    style="padding:12px;border:2px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:14px;text-align:right;transition:0.2s;width:100%;">
                    <strong>🛒 قطعة</strong> - ${sellPrice} ج.م
                </button>`;
                
    if (product.price_per_piece > 0) {
        html += `
            <button onclick="addToCart('${product.id}', 'لوح', ${product.price_per_piece})" 
                style="padding:12px;border:2px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:14px;text-align:right;transition:0.2s;width:100%;">
                <strong>📋 لوح</strong> - ${product.price_per_piece} ج.م
            </button>`;
    }
    
    if (product.price_per_meter > 0 && product.length > 0) {
        const volume = (product.length * product.width * product.thickness) / 1000000;
        const meterPrice = product.price_per_meter * volume;
        html += `
            <button onclick="addToCart('${product.id}', 'م³', ${meterPrice})" 
                style="padding:12px;border:2px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:14px;text-align:right;transition:0.2s;width:100%;">
                <strong>📊 متر مكعب</strong> - ${meterPrice.toFixed(2)} ج.م
            </button>`;
    }
    
    html += `
                <button onclick="closeModal('unitSelectModal')" 
                    style="padding:12px;border:2px solid #e2e8f0;border-radius:8px;background:#fee2e2;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:14px;color:#dc2626;text-align:center;width:100%;">
                    ✕ إلغاء
                </button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    openModal('unitSelectModal');
}

// ============================================
// ➕ دوال إضافة عميل
// ============================================

function openAddCustomerModal() {
    const nameInput = document.getElementById('newCustomerName');
    const phoneInput = document.getElementById('newCustomerPhone');
    const addressInput = document.getElementById('newCustomerAddress');
    
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (addressInput) addressInput.value = '';
    
    openModal('addCustomerModal');
}

async function saveNewCustomer() {
    const nameInput = document.getElementById('newCustomerName');
    const phoneInput = document.getElementById('newCustomerPhone');
    const addressInput = document.getElementById('newCustomerAddress');
    
    if (!nameInput) return;
    
    const name = nameInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';

    if (!name) {
        showNotification('⚠️ يرجى إدخال اسم العميل', 'error');
        return;
    }

    const data = {
        code: 'C' + Date.now().toString().slice(-6),
        name: name,
        phone: phone || null,
        address: address || null,
        type: 'عادي',
        discount_percent: 0
    };

    try {
        const result = await add('customers', data);
        if (result && result.success !== false) {
            showNotification('✅ تم إضافة العميل بنجاح', 'success');
            closeModal('addCustomerModal');
            customers = await query('customers') || [];
            const newCustomer = customers.find(c => c.name === name);
            if (newCustomer) selectCustomer(newCustomer);
        } else {
            showNotification('❌ حدث خطأ في إضافة العميل', 'error');
        }
    } catch (error) {
        showNotification('❌ خطأ: ' + error.message, 'error');
    }
}

// ============================================
// 📋 عرض تفاصيل العميل
// ============================================

function showCustomerDetails() {
    if (!selectedCustomer) {
        showNotification('⚠️ يرجى اختيار عميل أولاً', 'error');
        return;
    }

    const customerId = selectedCustomer.id || selectedCustomer._id;
    const customer = customers.find(c => c.id == customerId || c._id == customerId);
    if (!customer) {
        showNotification('❌ العميل غير موجود', 'error');
        return;
    }

    const nameDisplay = document.getElementById('detailsCustomerName');
    if (nameDisplay) nameDisplay.textContent = customer.name;

    const allCustomerRows = sales.filter(s => s.customer_id == customerId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const totalPurchases = allCustomerRows.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalPaid = allCustomerRows.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
    const totalRemaining = totalPurchases - totalPaid;

    const content = document.getElementById('customerDetailsContent');
    if (!content) return;
    
    content.innerHTML = `
        <div style="display:flex;gap:15px;flex-wrap:wrap;margin-bottom:15px;">
            <div style="flex:1;min-width:200px;background:#f8fafc;padding:15px;border-radius:8px;border:1px solid #e2e8f0;">
                <h4 style="margin-bottom:10px;font-size:14px;border-right:4px solid #3b82f6;padding-right:10px;">👤 معلومات العميل</h4>
                <div style="display:flex;margin-bottom:4px;font-size:12px;"><span style="width:100px;font-weight:600;color:#64748b;">الكود:</span><span>${customer.code || '-'}</span></div>
                <div style="display:flex;margin-bottom:4px;font-size:12px;"><span style="width:100px;font-weight:600;color:#64748b;">الاسم:</span><span><strong>${customer.name}</strong></span></div>
                <div style="display:flex;margin-bottom:4px;font-size:12px;"><span style="width:100px;font-weight:600;color:#64748b;">النوع:</span><span>${customer.type || 'عادي'}</span></div>
                <div style="display:flex;margin-bottom:4px;font-size:12px;"><span style="width:100px;font-weight:600;color:#64748b;">الخصم:</span><span>${customer.discount_percent || 0}%</span></div>
                <div style="display:flex;margin-bottom:4px;font-size:12px;"><span style="width:100px;font-weight:600;color:#64748b;">الهاتف:</span><span>${customer.phone || '-'}</span></div>
                <div style="display:flex;margin-bottom:4px;font-size:12px;"><span style="width:100px;font-weight:600;color:#64748b;">العنوان:</span><span>${customer.address || '-'}</span></div>
            </div>
            <div style="flex:1;min-width:200px;background:#f8fafc;padding:15px;border-radius:8px;border:1px solid #e2e8f0;">
                <h4 style="margin-bottom:10px;font-size:14px;border-right:4px solid #3b82f6;padding-right:10px;">📊 ملخص مالي</h4>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                    <div style="background:white;padding:10px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                        <div style="font-size:18px;font-weight:800;color:#3b82f6;">${formatNum(totalPurchases)} ج.م</div>
                        <div style="font-size:10px;color:#666;">إجمالي المستحق</div>
                    </div>
                    <div style="background:white;padding:10px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                        <div style="font-size:18px;font-weight:800;color:#10b981;">${formatNum(totalPaid)} ج.م</div>
                        <div style="font-size:10px;color:#666;">صافي المدفوع</div>
                    </div>
                    <div style="background:white;padding:10px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                        <div style="font-size:18px;font-weight:800;color:${totalRemaining > 0 ? '#ef4444' : '#10b981'};">${formatNum(totalRemaining)} ج.م</div>
                        <div style="font-size:10px;color:#666;">المتبقي</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    openModal('customerDetailsModal');
}

function printCustomerDetails() {
    showNotification('🖨️ جاري الطباعة...', 'info');
    window.print();
}

// ============================================
// 💾 معالجة البيع
// ============================================

async function processSale() {
    if (cart.length === 0) { 
        showNotification('⚠️ الفاتورة فارغة', 'error'); 
        return; 
    }

    if (isProcessingSale) {
        showNotification('⏳ جاري معالجة عملية أخرى، انتظر قليلاً...', 'info');
        return;
    }

    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const discPct = parseFloat(document.getElementById('discountPercent')?.value) || 0;
    const finalTotal = subtotal - (subtotal * discPct / 100);
    const paidAmt = parseFloat(document.getElementById('paidAmount')?.value) || 0;
    const remaining = finalTotal - paidAmt;

    if (remaining > 0 && !selectedCustomer) {
        showNotification('⚠️ لا يمكن إنشاء فاتورة أجل بدون اختيار عميل', 'error');
        document.getElementById('paidAmount')?.focus();
        return;
    }

    if (remaining > 0 && selectedCustomer) {
        let previousDebt = getCustomerTotalDebt(selectedCustomer.id);
        const currentBalance = previousDebt + finalTotal - paidAmt;

        showConfirmModal(
            `⚠️ العميل ${selectedCustomer.name} سيكون عليه مستحقات بقيمة ${remaining.toFixed(2)} ج.م.\nالرصيد الحالي: ${currentBalance.toFixed(2)} ج.م\nهل تريد المتابعة؟`,
            async () => {
                await completeSale();
            }
        );
        return;
    }

    await completeSale();
}

async function completeSale() {
    isProcessingSale = true;
    const btnSave = document.getElementById('btnSaveSale');
    const indicator = document.getElementById('processingIndicator');
    
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = '⏳ جاري...';
    }
    if (indicator) indicator.style.display = 'block';

    try {
        const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        const discPct = parseFloat(document.getElementById('discountPercent')?.value) || 0;
        const finalTotal = subtotal - (subtotal * discPct / 100);
        const paidAmt = parseFloat(document.getElementById('paidAmount')?.value) || 0;
        const remaining = finalTotal - paidAmt;
        
        const invNum = await generateInvoiceNumber();

        // خصم الكميات من المخزون
        for (const item of cart) {
            const product = window.allProducts.find(p => (p.id == item.productId || p._id == item.productId));
            if (product) {
                const newQty = Math.max(0, product.quantity - item.quantity);
                await update('products', product.id, { quantity: newQty });
                product.quantity = newQty;
                item.isDeducted = true;
            }
        }

        // حفظ الفاتورة
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const saleData = {
            invoice_number: invNum,
            items: JSON.stringify(cart.map(i => ({ 
                product_id: i.productId, 
                product_name: i.name, 
                quantity: parseFloat(i.quantity), 
                price: i.price, 
                total: i.price * i.quantity, 
                unit: i.unit, 
                cost_price: i.cost_price 
            }))),
            customer_id: selectedCustomer ? (selectedCustomer.id || selectedCustomer._id) : null,
            customer_name: selectedCustomer ? selectedCustomer.name : 'نقدي',
            total_amount: subtotal, 
            discount: discPct, 
            final_total: finalTotal,
            paid_amount: paidAmt, 
            remaining_amount: remaining,
            payment_method: 'نقدي',
            user_id: currentUser?.id || null,
            created_at: new Date().toISOString()
        };

        const result = await add('sales', saleData);

        if (result && result.success !== false) {
            showNotification(`✅ تم حفظ الفاتورة ${invNum}`, 'success');
            
            // تحديث رصيد العميل
            if (selectedCustomer && remaining > 0) {
                const newBalance = (selectedCustomer.balance || 0) + remaining;
                await update('customers', selectedCustomer.id, { balance: newBalance });
                selectedCustomer.balance = newBalance;
            }
            
            // طباعة الفاتورة
            printInvoice(saleData);
            
            cart = []; 
            updateInvoiceTable();
            const dp = document.getElementById('discountPercent');
            const paid = document.getElementById('paidAmount');
            const debt = document.getElementById('customerDebt');
            const balance = document.getElementById('currentBalance');
            
            if (dp) dp.value = 0;
            if (paid) paid.value = 0;
            if (debt) debt.value = '0 ج.م';
            if (balance) balance.value = '0 ج.م';
            
            clearSelectedCustomer();
            await generateInvoiceNumber();
            
            // تحديث المنتجات والعملاء
            window.allProducts = await query('products') || [];
            window.availableProducts = window.allProducts.filter(p => (p.quantity || 0) > 0);
            customers = await query('customers') || [];
            sales = await query('sales') || [];
            
        } else {
            // استرجاع الكميات في حالة الفشل
            for (const item of cart) {
                if (item.isDeducted) {
                    const product = window.allProducts.find(p => (p.id == item.productId || p._id == item.productId));
                    if (product) {
                        product.quantity += item.quantity;
                        await update('products', product.id, { quantity: product.quantity });
                    }
                    item.isDeducted = false;
                }
            }
            showNotification('❌ حدث خطأ في حفظ الفاتورة', 'error'); 
        }
    } catch (error) { 
        console.error('❌ خطأ في عملية البيع:', error);
        for (const item of cart) {
            if (item.isDeducted) {
                const product = window.allProducts.find(p => (p.id == item.productId || p._id == item.productId));
                if (product) {
                    product.quantity += item.quantity;
                    await update('products', product.id, { quantity: product.quantity });
                }
                item.isDeducted = false;
            }
        }
        showNotification('❌ خطأ: ' + error.message, 'error'); 
    } finally {
        isProcessingSale = false;
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.textContent = '✅ حفظ';
        }
        if (indicator) indicator.style.display = 'none';
    }
}

// ============================================
// 🖨️ طباعة الفاتورة
// ============================================

function printInvoice(saleData) {
    if (!saleData) {
        showNotification('⚠️ لا توجد بيانات للطباعة', 'error');
        return;
    }
    
    let items = [];
    try {
        items = typeof saleData.items === 'string' ? JSON.parse(saleData.items) : saleData.items || [];
    } catch(e) { items = []; }
    
    const totalItems = items.length;
    const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const total = Number(saleData.total_amount) || 0;
    const discount = Number(saleData.discount) || 0;
    const finalTotal = Number(saleData.final_total) || total;
    const paid = Number(saleData.paid_amount) || 0;
    const previousDebt = parseFloat(document.getElementById('customerDebt')?.value?.replace(/[^\d.]/g, '')) || 0;
    const currentBalance = parseFloat(document.getElementById('currentBalance')?.value?.replace(/[^\d.]/g, '')) || 0;
    const customerName = saleData.customer_name || 'نقدي';
    const invoiceNumber = saleData.invoice_number || 'INV-' + Date.now();
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const cashierName = currentUser?.fullName || currentUser?.username || 'موظف';
    const formattedDate = new Date(saleData.created_at).toLocaleDateString('en-GB');

    const itemsRows = items.map(i => {
        const price = Number(i.price) || 0;
        const quantity = Number(i.quantity) || 0;
        const total = Number(i.total) || (price * quantity);
        return `
            <tr>
                <td style="text-align:right;padding:4px;border:1px solid #000;font-weight:bold;color:#000;white-space:nowrap;">${i.product_name || 'منتج غير معروف'}</td>
                <td style="text-align:center;padding:4px;border:1px solid #000;font-weight:bold;color:#000;white-space:nowrap;">${price.toFixed(0)}</td>
                <td style="text-align:center;padding:4px;border:1px solid #000;font-weight:bold;color:#000;white-space:nowrap;">${quantity}</td>
                <td style="text-align:center;padding:4px;border:1px solid #000;font-weight:bold;color:#000;white-space:nowrap;">${total.toFixed(0)}</td>
            </tr>`;
    }).join('');

    const invoiceHTML = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة ${invoiceNumber}</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        @page { size: 80mm auto; }
        body{font-family:'Times New Roman', Times, serif;padding:5px;background:white;direction:rtl;}
        .invoice{margin:0 auto;width:80mm auto;}
        .store-name{text-align:center;font-size:28px;font-weight:bold;color:#000;margin-bottom:5px;}
        .store-info{text-align:center;font-size:14px;font-weight:bold;color:#000;margin-bottom:8px;}
        .title{text-align:center;font-size:18px;font-weight:bold;color:#000;margin:8px 0;}
        .info{width:100%;font-size:14px;margin-bottom:5px;border-collapse:collapse;}
        .info td{border:1px solid #000;font-weight:bold;color:#000;padding:4px;white-space:nowrap;}
        table.items{width:100%;border-collapse:collapse;font-size:14px;}
        table.items th,table.items td{border:1px solid #000;padding:4px;text-align:center;color:#000;white-space:nowrap;}
        table.items th{font-weight:bold;background:#f0f0f0;color:#000;}
        .summary{width:100%;margin-top:5px;border-collapse:collapse;}
        .summary td{border:1px solid #000;padding:4px;font-size:14px;font-weight:bold;color:#000;white-space:nowrap;}
        .grand-total{font-size:16px;font-weight:bold;color:#000;}
        .footer{text-align:center;margin-top:10px;font-size:12px;font-weight:bold;color:#000;border-top:1px solid #000;padding-top:8px;}
    </style></head><body><div class="invoice">
        <div class="store-name">${storeSettings.name || 'شركة العبادي'}</div>
        <div class="store-info">${storeSettings.address || ''} ${storeSettings.phone ? '📞 ' + storeSettings.phone : ''}</div>
        <div class="title">🧾 فاتورة مبيعات</div>
        <table class="info"><tr><td colspan="2"><b>رقم الفاتورة:</b> ${invoiceNumber}</td></tr>
        <tr><td><b>التاريخ:</b> ${formattedDate}</td><td><b>الوقت:</b> ${new Date(saleData.created_at).toLocaleTimeString('en-US')}</td></tr>
        <tr><td><b>العميل:</b> ${customerName}</td><td><b>الكاشير:</b> ${cashierName}</td></tr></table>
        
        <table class="items"><thead><tr><th style="text-align:right;">الصنف</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th></tr></thead><tbody>${itemsRows}</tbody></table>
        
        <table class="summary">
            <tr><td>عدد الأصناف ${totalItems}</td><td colspan="3">إجمالي الكميات ${totalQty}</td></tr>
            <tr class="grand-total"><td>اجمالي الفاتورة</td><td colspan="3">${finalTotal.toFixed(0)}</td></tr>
            <tr><td>الرصيد السابق</td><td colspan="3">${previousDebt.toFixed(0)}</td></tr>
            <tr><td>المدفوع</td><td colspan="3">${paid.toFixed(0)}</td></tr>
            <tr><td>باقي حساب</td><td colspan="3" style="font-weight:bold;color:#000;">${currentBalance.toFixed(0)}</td></tr>
        </table>
        
        <div class="footer">شكراً لزيارتكم 🌟</div>
    </div></body></html>`;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    }
}

// ============================================
// 🔄 التحديث
// ============================================

async function handleRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    window.location.reload();
    setTimeout(() => {
        isRefreshing = false;
    }, 1000);
}

// ============================================
// ⏸️ الفواتير المؤجلة
// ============================================

function showHoldInvoiceModal() {
    if (cart.length === 0) { 
        showNotification('⚠️ الفاتورة فارغة', 'error'); 
        return; 
    }

    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const discPct = parseFloat(document.getElementById('discountPercent')?.value) || 0;
    const finalTotal = subtotal - (subtotal * discPct / 100);

    showConfirmModal(
        `⏸️ هل تريد تأجيل الفاتورة بقيمة ${finalTotal.toFixed(2)} ج.م؟`,
        async () => {
            // استرجاع الكميات المخصومة
            for (const item of cart) {
                if (item.isDeducted) {
                    const product = window.allProducts.find(p => (p.id == item.productId || p._id == item.productId));
                    if (product) {
                        product.quantity += item.quantity;
                        await update('products', product.id, { quantity: product.quantity });
                    }
                    item.isDeducted = false;
                }
            }
            
            const invNum = 'HOLD-' + Date.now().toString().slice(-6);
            const holdData = {
                invoice_number: invNum,
                items: JSON.stringify(cart.map(i => ({ 
                    product_id: i.productId, 
                    product_name: i.name, 
                    quantity: i.quantity, 
                    price: i.price, 
                    total: i.price * i.quantity, 
                    unit: i.unit, 
                    cost_price: i.cost_price 
                }))),
                customer_id: selectedCustomer ? (selectedCustomer.id || selectedCustomer._id) : null,
                customer_name: selectedCustomer ? selectedCustomer.name : 'نقدي',
                total_amount: subtotal,
                discount: discPct,
                final_total: finalTotal,
                status: 'hold',
                created_at: new Date().toISOString()
            };

            try {
                const result = await add('hold_invoices', holdData);
                if (result && result.success !== false) {
                    showNotification(`✅ تم تأجيل الفاتورة`, 'success');
                    cart = []; 
                    updateInvoiceTable();
                    const dp = document.getElementById('discountPercent');
                    const paid = document.getElementById('paidAmount');
                    if (dp) dp.value = 0;
                    if (paid) paid.value = 0;
                    await generateInvoiceNumber();
                } else {
                    showNotification('❌ حدث خطأ في تأجيل الفاتورة', 'error');
                }
            } catch (error) {
                console.error('خطأ في تأجيل الفاتورة:', error);
                showNotification('❌ خطأ: ' + error.message, 'error');
            }
        }
    );
}

function showHeldInvoices() {
    showNotification('📋 جاري تحميل الفواتير المؤجلة...', 'info');
}

// ============================================
// 🔍 أحداث البحث
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const barcodeInput = document.getElementById('barcodeInput');
    const searchResults = document.getElementById('searchResults');
    
    if (barcodeInput) {
        barcodeInput.addEventListener('input', function(e) {
            const term = this.value.trim();
            if (!searchResults) return;
            
            let filtered = window.availableProducts || [];
            
            if (term.length > 0) {
                filtered = filtered.filter(p => 
                    (p.name || '').toLowerCase().includes(term.toLowerCase()) || 
                    (p.barcode || '').includes(term)
                );
            }
            
            if (filtered.length > 0 && term.length > 0) {
                searchResults.innerHTML = filtered.map(p => {
                    const price = parseFloat(p.sell_price) || 0;
                    const stock = p.quantity || 0;
                    return `
                        <div class="result-item" onclick="selectProduct('${p.id || p._id}')">
                            <div>
                                <span class="name">${p.name}</span>
                                ${stock > 0 ? `<span class="stock">📦 ${stock}</span>` : `<span class="stock" style="color:#ef4444;">نفد</span>`}
                            </div>
                            <div class="price">${price.toFixed(2)} ج.م</div>
                        </div>
                    `;
                }).join('');
                searchResults.style.display = 'block';
            } else {
                if (term.length > 0) {
                    searchResults.innerHTML = '<div class="no-results">لا توجد منتجات</div>';
                    searchResults.style.display = 'block';
                } else {
                    searchResults.style.display = 'none';
                }
            }
        });

        barcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const term = this.value.trim();
                if (term) {
                    let product = window.availableProducts.find(p => p.barcode == term);
                    if (!product) {
                        const results = window.availableProducts.filter(p => (p.name || '').toLowerCase().includes(term.toLowerCase()));
                        if (results.length === 1) {
                            product = results[0];
                        } else if (results.length > 1 && searchResults) {
                            searchResults.style.display = 'block';
                            return;
                        }
                    }
                    if (product) {
                        if ((product.quantity || 0) <= 0) {
                            showNotification('⚠️ المنتج منتهي الكمية', 'error');
                            this.value = '';
                            return;
                        }
                        selectProduct(product.id);
                        this.value = '';
                        if (searchResults) searchResults.style.display = 'none';
                    } else {
                        showNotification('❌ المنتج غير موجود', 'error');
                    }
                }
            }
        });
    }

    // إغلاق نتائج البحث
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-results') && e.target.id !== 'barcodeInput') {
            const results = document.getElementById('searchResults');
            if (results) results.style.display = 'none';
        }
    });
    
    // تحديث الإجماليات
    const discountInput = document.getElementById('discountPercent');
    const paidInput = document.getElementById('paidAmount');
    if (discountInput) discountInput.addEventListener('input', updateTotals);
    if (paidInput) paidInput.addEventListener('input', updateTotals);
    
    // تحميل البيانات
    loadData();
});

// ============================================
// 📤 تصدير الدوال
// ============================================

window.addToCart = addToCart;
window.updateInvoiceTable = updateInvoiceTable;
window.updateItemPrice = updateItemPrice;
window.updateQuantityInput = updateQuantityInput;
window.removeFromCart = removeFromCart;
window.selectProduct = selectProduct;
window.showUnitSelection = showUnitSelection;
window.selectDefaultCustomer = selectDefaultCustomer;
window.openCustomerModal = openCustomerModal;
window.filterCustomersModal = filterCustomersModal;
window.selectCustomerFromModal = selectCustomerFromModal;
window.selectCustomer = selectCustomer;
window.clearSelectedCustomer = clearSelectedCustomer;
window.openAddCustomerModal = openAddCustomerModal;
window.saveNewCustomer = saveNewCustomer;
window.showCustomerDetails = showCustomerDetails;
window.printCustomerDetails = printCustomerDetails;
window.processSale = processSale;
window.showHoldInvoiceModal = showHoldInvoiceModal;
window.showHeldInvoices = showHeldInvoices;
window.handleRefresh = handleRefresh;
window.updateTotals = updateTotals;
window.generateInvoiceNumber = generateInvoiceNumber;
window.printInvoice = printInvoice;
window.loadData = loadData;
window.openModal = openModal;
window.closeModal = closeModal;
window.showConfirmModal = showConfirmModal;
window.showNotification = showNotification;

console.log('✅ Sales module loaded successfully');