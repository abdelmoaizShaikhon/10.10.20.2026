// ============================================
// 💰 دوال الحسابات - شركة العبادي
// ============================================

let allTransactions = [];

// تحميل المعاملات
async function loadTransactions() {
    try {
        // جلب جميع المعاملات من مصادر مختلفة
        const sales = await query('sales');
        const purchases = await query('purchases');
        const expenses = await query('expenses');
        
        // تجميع المعاملات
        allTransactions = [
            ...sales.map(s => ({
                id: s.id,
                type: 'sale',
                date: s.created_at,
                description: `فاتورة ${s.invoice_number} - ${s.customer_name || 'نقدي'}`,
                amount: s.total_amount || 0,
                status: (s.remaining_amount || 0) <= 0 ? 'paid' : 'pending'
            })),
            ...purchases.map(p => ({
                id: p.id,
                type: 'purchase',
                date: p.created_at,
                description: `فاتورة شراء ${p.invoice_number} - ${p.supplier_name}`,
                amount: -(p.total_amount || 0),
                status: (p.remaining_amount || 0) <= 0 ? 'paid' : 'pending'
            })),
            ...expenses.map(e => ({
                id: e.id,
                type: 'expense',
                date: e.date || e.created_at,
                description: e.description || e.type,
                amount: -(e.amount || 0),
                status: 'paid'
            }))
        ];
        
        // ترتيب حسب التاريخ
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        displayTransactions(allTransactions);
        updateAccountsSummary();
    } catch (error) {
        console.error('❌ خطأ في تحميل المعاملات:', error);
        showToast('❌ فشل تحميل المعاملات', 'error');
    }
}

// عرض المعاملات
function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsTable');
    if (!tbody) return;
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">لا توجد معاملات</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map((t, i) => {
        const typeLabels = {
            sale: { label: 'مبيعات', class: 'badge-success' },
            purchase: { label: 'مشتريات', class: 'badge-warning' },
            expense: { label: 'مصروفات', class: 'badge-danger' }
        };
        const info = typeLabels[t.type] || { label: t.type, class: '' };
        const isPositive = t.amount > 0;
        
        return `
            <tr>
                <td>${i + 1}</td>
                <td>${formatDate(t.date)}</td>
                <td><span class="badge ${info.class}">${info.label}</span></td>
                <td>${t.description}</td>
                <td style="color:${isPositive ? '#10b981' : '#ef4444'};font-weight:700;">
                    ${isPositive ? '+' : ''}${formatNumber(t.amount)} ج.م
                </td>
                <td><span class="badge ${t.status === 'paid' ? 'badge-paid' : 'badge-pending'}">${t.status === 'paid' ? 'مدفوع' : 'معلق'}</span></td>
            </tr>
        `;
    }).join('');
}

// فلترة المعاملات
function filterTransactions() {
    const from = document.getElementById('dateFrom')?.value;
    const to = document.getElementById('dateTo')?.value;
    const type = document.getElementById('typeFilter')?.value || 'all';
    
    let filtered = [...allTransactions];
    
    if (from) {
        filtered = filtered.filter(t => (t.date || '').split('T')[0] >= from);
    }
    if (to) {
        filtered = filtered.filter(t => (t.date || '').split('T')[0] <= to);
    }
    if (type !== 'all') {
        filtered = filtered.filter(t => t.type === type);
    }
    
    displayTransactions(filtered);
}

// تحديث ملخص الحسابات
function updateAccountsSummary() {
    const totalSales = allTransactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalPurchases = allTransactions
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalExpenses = allTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalCash = totalSales - totalPurchases - totalExpenses;
    const totalProfit = totalSales - totalPurchases;
    
    document.getElementById('totalCash').textContent = formatNumber(totalCash) + ' ج.م';
    document.getElementById('totalBank').textContent = formatNumber(totalCash) + ' ج.م';
    document.getElementById('totalProfit').textContent = formatNumber(totalProfit) + ' ج.م';
}

// تصدير الدوال
window.loadTransactions = loadTransactions;
window.filterTransactions = filterTransactions;