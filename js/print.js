// ============================================
// 🖨️ دوال الطباعة - شركة العبادي
// ============================================

// إعدادات الطباعة
const printSettings = {
    paperWidth: '80mm',
    fontSize: '18px',
    margins: '3px'
};

// طباعة الفاتورة
function printInvoice(saleData) {
    if (!saleData) {
        showToast('⚠️ لا توجد بيانات للطباعة', 'error');
        return;
    }
    
    let items = [];
    try {
        items = typeof saleData.items === 'string' ? JSON.parse(saleData.items) : saleData.items || [];
    } catch(e) { items = []; }
    
    const total = Number(saleData.total_amount) || 0;
    const discount = Number(saleData.discount) || 0;
    const finalTotal = Number(saleData.final_total) || total;
    const paid = Number(saleData.paid_amount) || 0;
    const remaining = Number(saleData.remaining_amount) || (finalTotal - paid);
    const customerName = saleData.customer_name || 'نقدي';
    const invoiceNumber = saleData.invoice_number || 'INV-' + Date.now();
    const cashierName = getCurrentUser()?.fullName || 'موظف';
    
    // بناء HTML للطباعة
    const html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة ${invoiceNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                @page { size: ${printSettings.paperWidth} auto; margin: 0; }
                body { 
                    font-family: 'Times New Roman', Times, serif; 
                    padding: ${printSettings.margins}; 
                    background: white; 
                    direction: rtl; 
                    width: ${printSettings.paperWidth}; 
                    margin: 0 auto;
                }
                .header { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 5px; }
                .header h1 { font-size: 20px; margin: 0; }
                .header p { font-size: ${printSettings.fontSize}; margin: 2px 0; }
                .info { width: 100%; font-size: ${printSettings.fontSize}; margin-bottom: 5px; border-collapse: collapse; }
                .info td { padding: 2px 4px; border: 1px solid #000; }
                .items { width: 100%; border-collapse: collapse; font-size: ${printSettings.fontSize}; }
                .items th, .items td { padding: 3px 4px; border: 1px solid #000; text-align: center; }
                .items th { background: #f0f0f0; }
                .items .product-name { text-align: right !important; }
                .summary { width: 100%; margin-top: 5px; border-collapse: collapse; }
                .summary td { padding: 3px 4px; border: 1px solid #000; font-size: ${printSettings.fontSize}; }
                .total-row { font-size: 18px; font-weight: bold; }
                .footer { text-align: center; margin-top: 8px; border-top: 1px solid #000; padding-top: 5px; font-size: ${printSettings.fontSize}; }
                .footer p { margin: 2px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🧾 فاتورة مبيعات</h1>
                <p>${storeSettings?.name || 'شركة العبادي'}</p>
                <p>${storeSettings?.address || ''}</p>
            </div>
            
            <table class="info">
                <tr><td><b>رقم الفاتورة:</b> ${invoiceNumber}</td></tr>
                <tr><td><b>التاريخ:</b> ${new Date().toLocaleDateString('ar-EG')}</td></tr>
                <tr><td><b>العميل:</b> ${customerName}</td></tr>
                <tr><td><b>الكاشير:</b> ${cashierName}</td></tr>
            </table>
            
            <table class="items">
                <thead>
                    <tr>
                        <th style="text-align:right;">المنتج</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td class="product-name">${item.product_name || 'منتج غير معروف'}</td>
                            <td>${item.quantity}</td>
                            <td>${Number(item.price).toFixed(2)}</td>
                            <td>${(Number(item.quantity) * Number(item.price)).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <table class="summary">
                <tr><td>إجمالي الفاتورة</td><td>${total.toFixed(2)} ج.م</td></tr>
                ${discount > 0 ? `<tr><td>الخصم (${discount}%)</td><td>-${(total - finalTotal).toFixed(2)} ج.م</td></tr>` : ''}
                <tr class="total-row"><td>المطلوب</td><td>${finalTotal.toFixed(2)} ج.م</td></tr>
                <tr><td>المدفوع</td><td>${paid.toFixed(2)} ج.م</td></tr>
                <tr><td>المتبقي</td><td style="color:${remaining > 0 ? '#dc2626' : '#10b981'};">${remaining.toFixed(2)} ج.م</td></tr>
            </table>
            
            <div class="footer">
                <p>شكراً لزيارتكم 🌟</p>
                <p style="font-size:14px;">${storeSettings?.phone || '01069913709'}</p>
            </div>
            
            <script>
                window.print();
                setTimeout(function(){ window.close(); }, 1000);
            <\/script>
        </body>
        </html>
    `;
    
    // طباعة
    if (window.electronAPI?.silentPrint) {
        // طباعة صامتة (في تطبيق Electron)
        const printerName = localStorage.getItem('silent_printer');
        if (printerName) {
            try {
                const printer = JSON.parse(printerName);
                window.electronAPI.silentPrint(html, printer.printer_name);
                showToast('🖨️ تم إرسال الفاتورة للطباعة', 'success');
                return;
            } catch(e) {}
        }
    }
    
    // طباعة عادية
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    }
}

// طباعة تقرير
function printReport(title, data, columns) {
    if (!data || data.length === 0) {
        showToast('⚠️ لا توجد بيانات للطباعة', 'error');
        return;
    }
    
    const html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Times New Roman', Times, serif; padding: 15px; background: white; direction: rtl; }
                .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .header h1 { font-size: 22px; }
                .header p { font-size: 14px; margin: 2px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
                th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; }
                th { background: #f0f0f0; font-weight: bold; }
                .footer { text-align: center; margin-top: 15px; border-top: 1px solid #000; padding-top: 10px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 ${title}</h1>
                <p>${storeSettings?.name || 'شركة العبادي'}</p>
                <p>${new Date().toLocaleString('ar-EG')}</p>
            </div>
            
            <table>
                <thead>
                    <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>${columns.map(col => `<td>${row[col] || '-'}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>نظام إدارة المخازن والمبيعات - شركة العبادي</p>
                <p>م/ عبدالمعز شيخون | 01069913709</p>
            </div>
            
            <script>
                window.print();
                setTimeout(function(){ window.close(); }, 1000);
            <\/script>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    }
}

// طباعة قائمة المنتجات
function printProductsReport(products) {
    const columns = ['#', 'المنتج', 'الكمية', 'السعر', 'الإجمالي'];
    const data = products.map((p, i) => ({
        '#': i + 1,
        'المنتج': p.name,
        'الكمية': p.quantity,
        'السعر': p.sell_price,
        'الإجمالي': (p.quantity * p.sell_price).toFixed(2)
    }));
    printReport('تقرير المنتجات', data, columns);
}

// تصدير الدوال
window.printInvoice = printInvoice;
window.printReport = printReport;
window.printProductsReport = printProductsReport;