// ============================================
// 📦 دوال المنتجات (الأخشاب) - شركة العبادي
// ============================================

let allProducts = [];
let pendingDeleteId = null;

// تحميل المنتجات
async function loadProducts() {
    try {
        allProducts = await query('products');
        displayProducts(allProducts);
        updateCategoriesFilter();
        updateStats();
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        showToast('❌ فشل تحميل المنتجات', 'error');
    }
}

// حساب حجم الخشب (متر مكعب)
function calculateVolume(length, width, thickness, quantity) {
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    const t = parseFloat(thickness) || 0;
    const q = parseFloat(quantity) || 0;
    
    // الحجم = (الطول × العرض × السمك × العدد) / 1,000,000 (لتحويل من سم³ إلى م³)
    return (l * w * t * q) / 1000000;
}

// عرض المنتجات
function displayProducts(products) {
    const container = document.getElementById('productsList');
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <p>لا توجد منتجات</p>
                <p style="font-size:12px;color:var(--text-light);">اضغط على "إضافة صنف جديد"</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(p => {
        const length = p.length || 0;
        const width = p.width || 0;
        const thickness = p.thickness || 0;
        const quantity = p.quantity || 0;
        const volume = calculateVolume(length, width, thickness, quantity);
        
        return `
            <div class="product-card">
                <div class="product-info">
                    <div class="product-header">
                        <span class="product-name">${p.name}</span>
                        <span class="product-barcode">${p.barcode ? '🔖 ' + p.barcode : ''}</span>
                    </div>
                    <div class="product-details">
                        <span class="product-dimensions">
                            📐 ${length}×${width}×${thickness} سم
                            ${p.category ? `| ${p.category}` : ''}
                        </span>
                        <span class="product-quantity">
                            🪵 العدد: <strong>${quantity}</strong> ${p.unit || 'قطعة'}
                            ${volume > 0 ? `| حجم: <strong>${volume.toFixed(3)}</strong> م³` : ''}
                        </span>
                    </div>
                    <div class="product-prices">
                        <span class="product-price">💰 ${formatNumber(p.sell_price)} ج.م</span>
                        ${p.price_per_meter ? `<span class="product-price-meter">📊 ${formatNumber(p.price_per_meter)} ج.م/م³</span>` : ''}
                        ${p.price_per_piece ? `<span class="product-price-piece">📋 ${formatNumber(p.price_per_piece)} ج.م/قطعة</span>` : ''}
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn-edit" onclick="editProduct(${p.id})">✏️</button>
                    <button class="btn-delete" onclick="confirmDeleteProduct(${p.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// تحديث الإحصائيات
function updateStats() {
    const total = allProducts.length;
    const totalPieces = allProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalVolume = allProducts.reduce((sum, p) => {
        return sum + calculateVolume(p.length, p.width, p.thickness, p.quantity);
    }, 0);
    
    document.getElementById('totalProducts').textContent = total;
    document.getElementById('totalPieces').textContent = totalPieces;
    document.getElementById('totalVolume').textContent = totalVolume.toFixed(2) + ' م³';
}

// فلترة المنتجات
function filterProducts() {
    const term = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const category = document.getElementById('categoryFilter')?.value || 'all';
    
    let filtered = [...allProducts];
    
    if (term) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(term) ||
            (p.barcode && p.barcode.includes(term)) ||
            (p.category && p.category.toLowerCase().includes(term))
        );
    }
    
    if (category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
    }
    
    displayProducts(filtered);
}

// تحديث فلتر الفئات
function updateCategoriesFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
    select.innerHTML = `
        <option value="all">جميع الفئات</option>
        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
    `;
}

// البحث عن الباركود
function searchBarcode() {
    const barcode = document.getElementById('productBarcode').value.trim();
    if (barcode.length < 3) return;
    
    const existing = allProducts.find(p => p.barcode === barcode);
    if (existing) {
        showToast(`⚠️ هذا الباركود مسجل للصنف: ${existing.name}`, 'warning');
        document.getElementById('productName').value = existing.name;
        document.getElementById('productCategory').value = existing.category || '';
        document.getElementById('productQuantity').value = existing.quantity || '';
        document.getElementById('productLength').value = existing.length || '';
        document.getElementById('productWidth').value = existing.width || '';
        document.getElementById('productThickness').value = existing.thickness || '';
        document.getElementById('productBuyPrice').value = existing.buy_price || '';
        document.getElementById('productPricePerMeter').value = existing.price_per_meter || '';
        document.getElementById('productPricePerPiece').value = existing.price_per_piece || '';
        document.getElementById('productSellPrice').value = existing.sell_price || '';
        document.getElementById('productUnit').value = existing.unit || 'قطعة';
        document.getElementById('productLocation').value = existing.location || '';
        document.getElementById('productNotes').value = existing.notes || '';
        calculateVolumeAndPrice();
    }
}

// حساب الحجم والسعر
function calculateVolumeAndPrice() {
    const length = parseFloat(document.getElementById('productLength').value) || 0;
    const width = parseFloat(document.getElementById('productWidth').value) || 0;
    const thickness = parseFloat(document.getElementById('productThickness').value) || 0;
    const quantity = parseFloat(document.getElementById('productQuantity').value) || 0;
    const pricePerMeter = parseFloat(document.getElementById('productPricePerMeter').value) || 0;
    const pricePerPiece = parseFloat(document.getElementById('productPricePerPiece').value) || 0;
    
    // حساب الحجم
    const volume = (length * width * thickness * quantity) / 1000000;
    document.getElementById('productVolume').value = volume > 0 ? volume.toFixed(4) + ' م³' : '0 م³';
    
    // حساب سعر البيع إذا لم يتم إدخاله يدوياً
    let sellPrice = 0;
    if (pricePerMeter > 0 && volume > 0) {
        sellPrice = pricePerMeter * volume;
    } else if (pricePerPiece > 0) {
        sellPrice = pricePerPiece * quantity;
    }
    
    if (sellPrice > 0) {
        const sellPriceInput = document.getElementById('productSellPrice');
        if (!sellPriceInput.value || parseFloat(sellPriceInput.value) === 0) {
            sellPriceInput.value = sellPrice.toFixed(2);
        }
    }
}

// حساب سعر البيع
function calculateSellPrice() {
    const length = parseFloat(document.getElementById('productLength').value) || 0;
    const width = parseFloat(document.getElementById('productWidth').value) || 0;
    const thickness = parseFloat(document.getElementById('productThickness').value) || 0;
    const quantity = parseFloat(document.getElementById('productQuantity').value) || 0;
    const pricePerMeter = parseFloat(document.getElementById('productPricePerMeter').value) || 0;
    const pricePerPiece = parseFloat(document.getElementById('productPricePerPiece').value) || 0;
    
    const volume = (length * width * thickness * quantity) / 1000000;
    let sellPrice = 0;
    
    if (pricePerMeter > 0 && volume > 0) {
        sellPrice = pricePerMeter * volume;
    } else if (pricePerPiece > 0) {
        sellPrice = pricePerPiece * quantity;
    }
    
    if (sellPrice > 0) {
        document.getElementById('productSellPrice').value = sellPrice.toFixed(2);
    }
}

// فتح نافذة الإضافة
function openAddModal() {
    document.getElementById('modalTitle').textContent = '➕ إضافة صنف جديد';
    document.getElementById('editProductId').value = '';
    document.getElementById('productBarcode').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productQuantity').value = '';
    document.getElementById('productLength').value = '';
    document.getElementById('productWidth').value = '';
    document.getElementById('productThickness').value = '';
    document.getElementById('productBuyPrice').value = '';
    document.getElementById('productPricePerMeter').value = '';
    document.getElementById('productPricePerPiece').value = '';
    document.getElementById('productSellPrice').value = '';
    document.getElementById('productUnit').value = 'قطعة';
    document.getElementById('productMinQty').value = '0';
    document.getElementById('productLocation').value = '';
    document.getElementById('productNotes').value = '';
    document.getElementById('productVolume').value = '0 م³';
    openModal('productModal');
}

// فتح نافذة التعديل
function editProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = '✏️ تعديل صنف';
    document.getElementById('editProductId').value = id;
    document.getElementById('productBarcode').value = product.barcode || '';
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productQuantity').value = product.quantity || '';
    document.getElementById('productLength').value = product.length || '';
    document.getElementById('productWidth').value = product.width || '';
    document.getElementById('productThickness').value = product.thickness || '';
    document.getElementById('productBuyPrice').value = product.buy_price || '';
    document.getElementById('productPricePerMeter').value = product.price_per_meter || '';
    document.getElementById('productPricePerPiece').value = product.price_per_piece || '';
    document.getElementById('productSellPrice').value = product.sell_price || '';
    document.getElementById('productUnit').value = product.unit || 'قطعة';
    document.getElementById('productMinQty').value = product.min_quantity || '0';
    document.getElementById('productLocation').value = product.location || '';
    document.getElementById('productNotes').value = product.notes || '';
    calculateVolumeAndPrice();
    openModal('productModal');
}

// حفظ المنتج
async function saveProduct() {
    const id = document.getElementById('editProductId').value;
    const barcode = document.getElementById('productBarcode').value.trim();
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const quantity = parseFloat(document.getElementById('productQuantity').value) || 0;
    const length = parseFloat(document.getElementById('productLength').value) || 0;
    const width = parseFloat(document.getElementById('productWidth').value) || 0;
    const thickness = parseFloat(document.getElementById('productThickness').value) || 0;
    const buyPrice = parseFloat(document.getElementById('productBuyPrice').value) || 0;
    const pricePerMeter = parseFloat(document.getElementById('productPricePerMeter').value) || 0;
    const pricePerPiece = parseFloat(document.getElementById('productPricePerPiece').value) || 0;
    const sellPrice = parseFloat(document.getElementById('productSellPrice').value) || 0;
    const unit = document.getElementById('productUnit').value;
    const minQty = parseFloat(document.getElementById('productMinQty').value) || 0;
    const location = document.getElementById('productLocation').value.trim();
    const notes = document.getElementById('productNotes').value.trim();
    
    if (!name) {
        showToast('يرجى إدخال اسم الصنف', 'error');
        return;
    }
    
    if (quantity <= 0) {
        showToast('يرجى إدخال عدد صحيح', 'error');
        return;
    }
    
    if (sellPrice <= 0) {
        showToast('يرجى إدخال سعر بيع صحيح', 'error');
        return;
    }
    
    // التحقق من الباركود المكرر
    if (barcode) {
        const existing = allProducts.find(p => p.barcode === barcode && p.id != id);
        if (existing) {
            showToast(`⚠️ الباركود مسجل للصنف: ${existing.name}`, 'warning');
            return;
        }
    }
    
    const data = {
        barcode: barcode || null,
        name,
        category: category || null,
        quantity,
        length,
        width,
        thickness,
        buy_price: buyPrice,
        price_per_meter: pricePerMeter,
        price_per_piece: pricePerPiece,
        sell_price: sellPrice,
        unit,
        min_quantity: minQty,
        location: location || null,
        notes: notes || null
    };
    
    try {
        let result;
        if (id) {
            result = await update('products', id, data);
        } else {
            result = await add('products', data);
        }
        
        if (result.success) {
            closeModal('productModal');
            showToast(id ? '✅ تم تحديث الصنف' : '✅ تم إضافة الصنف', 'success');
            await loadProducts();
        } else {
            showToast('❌ ' + (result.error || 'فشل الحفظ'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// تأكيد حذف المنتج
function confirmDeleteProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    pendingDeleteId = id;
    document.getElementById('confirmMessage').textContent = `⚠️ هل أنت متأكد من حذف "${product.name}"؟`;
    openModal('confirmModal');
}

// حذف المنتج
async function deleteProduct() {
    if (!pendingDeleteId) return;
    try {
        const result = await remove('products', pendingDeleteId);
        if (result.success) {
            closeModal('confirmModal');
            pendingDeleteId = null;
            showToast('✅ تم حذف الصنف', 'success');
            await loadProducts();
        } else {
            showToast('❌ ' + (result.error || 'فشل الحذف'), 'error');
        }
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// ✅ ربط الأحداث
document.addEventListener('DOMContentLoaded', function() {
    // حساب الحجم تلقائياً عند تغيير الأبعاد
    ['productLength', 'productWidth', 'productThickness', 'productQuantity'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateVolumeAndPrice);
    });
    
    // حساب سعر البيع عند تغيير سعر المتر أو سعر القطعة
    ['productPricePerMeter', 'productPricePerPiece'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateSellPrice);
    });
});

// تصدير الدوال
window.loadProducts = loadProducts;
window.filterProducts = filterProducts;
window.openAddModal = openAddModal;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.confirmDeleteProduct = confirmDeleteProduct;
window.deleteProduct = deleteProduct;
window.searchBarcode = searchBarcode;
window.calculateVolumeAndPrice = calculateVolumeAndPrice;
window.calculateSellPrice = calculateSellPrice;

console.log('✅ Products module loaded (Wood/Lumber)');