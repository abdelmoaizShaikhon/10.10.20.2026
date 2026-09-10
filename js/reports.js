// ============================================
// 📈 دوال التقارير - شركة العبادي
// ============================================

let currentReportTab = 'sales';
let reportData = null;

// تحويل بين علامات التبويب
function switchTab(tab) {
    currentReportTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    generateReport();
}

// إنشاء التقرير
async function generateReport() {
    const from = document.getElementById('reportFrom')?.value;
    const to = document.getElementById('reportTo')?.value;
    
    if (!from || !to) {
        showToast('⚠️ يرجى اختيار الفترة', 'error');
        return;
    }
    
    try {
        let data = [];
        let stats = {};
        
        switch (currentReportTab) {
            case 'sales':
                data = await generateSalesReport(from, to);
                stats = calculateSalesStats(data);
                displaySalesReport(data, stats);
                break;
            case 'products':
                data = await generateProductsReport(from, to);
                stats = calculateProductsStats(data);
                displayProductsReport(data, stats);
                break;
            case 'financial':
                data = await generateFinancialReport(from, to);
                stats = calculateFinancialStats(data);
                displayFinancialReport(data, stats);
                break;
        }
    } catch (error) {
        console.error('❌ خطأ في إنشاء التقرير:', error);
        showToast('❌ فشل إنشاء التقرير', 'error');
    }
}

// تقرير المبيعات
async function generateSalesReport(from, to) {
    const allSales = await query('sales');
    return allSales.filter(s => {
        const date = (s.created_at || '').split('T')[0];
        return date >= from && date <= to;
    });
}

// حساب إحصائيات المبيعات
function calculateSalesStats(sales) {
    const total = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const paid = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
    const remaining = sales.reduce((sum, s) => sum + (s.remaining_amount || 0), 0);
    const count = sales.length;
    
    return { total, paid, remaining, count };
}

// عرض تقرير المبيعات
function displaySalesReport(sales, stats) {
    const container = document.getElementById('reportContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="report-summary">
            <div class="report-stats">
                <div class="stat-item">
                    <span class="stat-label">عدد الفواتير</span>
                    <span class="stat-value">${stats.count}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">إجمالي المبيعات</span>
                    <span class="stat-value" style="color:#3b82f6;">${formatNumber(stats.total)} ج.م</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">المدفوع</span>
                    <span class="stat-value" style="color:#10b981;">${formatNumber(stats.paid)} ج.م</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">المتبقي</span>
                    <span class="stat-value" style="color:#ef4444;">${formatNumber(stats.remaining)} ج.م</span>
                </div>
            </div>
        </div>
        <div class="report-table">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th>العميل</th>
                        <th>الإجمالي</th>
                        <th>المدفوع</th>
                        <th>المتبقي</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map((s, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${s.invoice_number || '#' + s.id}</td>
                            <td>${formatDate(s.created_at)}</td>
                            <td>${s.customer_name || 'نقدي'}</td>
                            <td>${formatNumber(s.total_amount)} ج.م</td>
                            <td>${formatNumber(s.paid_amount)} ج.م</td>
                            <td style="color:${(s.remaining_amount || 0) > 0 ? '#ef4444' : '#10b981'};">${formatNumber(s.remaining_amount)} ج.م</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// تقرير المنتجات
async function generateProductsReport(from, to) {
    const sales = await query('sales');
    const filtered = sales.filter(s => {
        const date = (s.created_at || '').split('T')[0];
        return date >= from && date <= to;
    });
    
    const productMap = new Map();
    
    filtered.forEach(sale => {
        let items = [];
        try {
            items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items || [];
        } catch(e) { items = []; }
        
        items.forEach(item => {
            const name = item.product_name || 'منتج غير معروف';
            const qty = item.quantity || 0;
            const price = item.price || 0;
            
            if (productMap.has(name)) {
                const existing = productMap.get(name);
                existing.quantity += qty;
                existing.total += qty * price;
            } else {
                productMap.set(name, {
                    product_name: name,
                    quantity: qty,
                    total: qty * price,
                    unit: item.unit || 'قطعة'
                });
            }
        });
    });
    
    return Array.from(productMap.values());
}

// عرض تقرير المنتجات
function displayProductsReport(products, stats) {
    const container = document.getElementById('reportContent');
    if (!container) return;
    
    const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalAmount = products.reduce((sum, p) => sum + p.total, 0);
    
    container.innerHTML = `
        <div class="report-summary">
            <div class="report-stats">
                <div class="stat-item">
                    <span class="stat-label">عدد المنتجات</span>
                    <span class="stat-value">${products.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">إجمالي الكميات</span>
                    <span class="stat-value">${formatNumber(totalQty)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">إجمالي المبيعات</span>
                    <span class="stat-value" style="color:#3b82f6;">${formatNumber(totalAmount)} ج.م</span>
                </div>
            </div>
        </div>
        <div class="report-table">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>المنتج</th>
                        <th>الوحدة</th>
                        <th>الكمية</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map((p, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${p.product_name}</td>
                            <td>${p.unit}</td>
                            <td>${formatNumber(p.quantity)}</td>
                            <td>${formatNumber(p.total)} ج.م</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// تقرير مالي
async function generateFinancialReport(from, to) {
    const sales = await query('sales');
    const purchases = await query('purchases');
    const expenses = await query('expenses');
    
    const filteredSales = sales.filter(s => {
        const date = (s.created_at || '').split('T')[0];
        return date >= from && date <= to;
    });
    
    const filteredPurchases = purchases.filter(p => {
        const date = (p.created_at || '').split('T')[0];
        return date >= from && date <= to;
    });
    
    const filteredExpenses = expenses.filter(e => {
        const date = (e.date || e.created_at || '').split('T')[0];
        return date >= from && date <= to;
    });
    
    return {
        sales: filteredSales,
        purchases: filteredPurchases,
        expenses: filteredExpenses
    };
}

// عرض تقرير مالي
function displayFinancialReport(data, stats) {
    const container = document.getElementById('reportContent');
    if (!container) return;
    
    const totalSales = data.sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalPurchases = data.purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const totalExpenses = data.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const profit = totalSales - totalPurchases - totalExpenses;
    
    container.innerHTML = `
        <div class="report-summary">
            <div class="report-stats">
                <div class="stat-item">
                    <span class="stat-label">إجمالي المبيعات</span>
                    <span class="stat-value" style="color:#3b82f6;">${formatNumber(totalSales)} ج.م</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">إجمالي المشتريات</span>
                    <span class="stat-value" style="color:#f59e0b;">${formatNumber(totalPurchases)} ج.م</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">إجمالي المصروفات</span>
                    <span class="stat-value" style="color:#ef4444;">${formatNumber(totalExpenses)} ج.م</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">صافي الربح</span>
                    <span class="stat-value" style="color:${profit >= 0 ? '#10b981' : '#ef4444'};">${formatNumber(profit)} ج.م</span>
                </div>
            </div>
        </div>
    `;
}

// طباعة التقرير
function printReport() {
    window.print();
}

// تصدير الدوال
window.switchTab = switchTab;
window.generateReport = generateReport;
window.printReport = printReport;