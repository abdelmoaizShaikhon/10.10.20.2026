// ============================================
// ⚙️ دوال الإعدادات - شركة العبادي
// ============================================

// تحميل الإعدادات
async function loadSettings() {
    try {
        const settings = await query('settings');
        const storeInfo = settings.find(s => s.setting_key === 'store_info');
        
        if (storeInfo) {
            const data = storeInfo.setting_value;
            document.getElementById('companyName').value = data?.name || 'شركة العبادي';
            document.getElementById('companyAddress').value = data?.address || '';
            document.getElementById('companyPhone').value = data?.phone || '';
            document.getElementById('companyEmail').value = data?.email || '';
        }
        
        // تحميل إعدادات العملة
        const currency = settings.find(s => s.setting_key === 'currency');
        if (currency) {
            document.getElementById('currency').value = currency.setting_value?.symbol || 'ج.م';
        }
        
        // تحميل إعدادات الضريبة
        const tax = settings.find(s => s.setting_key === 'tax');
        if (tax) {
            document.getElementById('taxRate').value = tax.setting_value?.rate || 14;
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
        showToast('❌ فشل تحميل الإعدادات', 'error');
    }
}

// حفظ الإعدادات
async function saveSettings() {
    try {
        const storeData = {
            name: document.getElementById('companyName').value.trim(),
            address: document.getElementById('companyAddress').value.trim(),
            phone: document.getElementById('companyPhone').value.trim(),
            email: document.getElementById('companyEmail').value.trim()
        };
        
        // تحديث إعدادات الشركة
        const storeSettings = await query('settings', { setting_key: 'store_info' });
        if (storeSettings.length > 0) {
            await update('settings', storeSettings[0].id, { setting_value: storeData });
        } else {
            await add('settings', { setting_key: 'store_info', setting_value: storeData });
        }
        
        // تحديث إعدادات العملة
        const currency = document.getElementById('currency').value;
        const currencySettings = await query('settings', { setting_key: 'currency' });
        if (currencySettings.length > 0) {
            await update('settings', currencySettings[0].id, { setting_value: { symbol: currency } });
        } else {
            await add('settings', { setting_key: 'currency', setting_value: { symbol: currency } });
        }
        
        // تحديث إعدادات الضريبة
        const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
        const taxSettings = await query('settings', { setting_key: 'tax' });
        if (taxSettings.length > 0) {
            await update('settings', taxSettings[0].id, { setting_value: { rate: taxRate, enabled: taxRate > 0 } });
        } else {
            await add('settings', { setting_key: 'tax', setting_value: { rate: taxRate, enabled: taxRate > 0 } });
        }
        
        showToast('✅ تم حفظ الإعدادات بنجاح', 'success');
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات:', error);
        showToast('❌ فشل حفظ الإعدادات', 'error');
    }
}

// إنشاء نسخة احتياطية
async function backupData() {
    try {
        const tables = ['users', 'products', 'customers', 'suppliers', 'sales', 'purchases', 'expenses', 'settings'];
        const backup = {};
        
        for (const table of tables) {
            backup[table] = await query(table);
        }
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('✅ تم إنشاء النسخة الاحتياطية', 'success');
    } catch (error) {
        console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
        showToast('❌ فشل إنشاء النسخة الاحتياطية', 'error');
    }
}

// استعادة نسخة احتياطية
function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            
            // تأكيد الاستعادة
            showConfirmModal('⚠️ هل أنت متأكد من استعادة البيانات؟ سيتم استبدال جميع البيانات الحالية.', async () => {
                for (const [table, data] of Object.entries(backup)) {
                    // حذف البيانات الحالية
                    const existing = await query(table);
                    for (const row of existing) {
                        await remove(table, row.id);
                    }
                    // إضافة البيانات الجديدة
                    for (const row of data) {
                        await add(table, row);
                    }
                }
                showToast('✅ تم استعادة البيانات بنجاح', 'success');
                await loadSettings();
            });
        } catch (error) {
            console.error('❌ خطأ في استعادة البيانات:', error);
            showToast('❌ فشل استعادة البيانات', 'error');
        }
    };
    input.click();
}

// تصدير الدوال
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.backupData = backupData;
window.restoreData = restoreData;