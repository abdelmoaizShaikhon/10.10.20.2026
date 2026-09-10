// ============================================
// 🗄️ دوال قاعدة البيانات - شركة العبادي
// ============================================

// ✅ الحصول على عميل Supabase
function getSupabase() {
    // محاولة جلب العميل من عدة مصادر
    if (window._supabase) {
        return window._supabase;
    }
    if (window.supabase) {
        return window.supabase;
    }
    console.error('❌ Supabase غير متوفر');
    return null;
}

// ✅ دالة عامة للاستعلام
async function query(table, filter = {}) {
    const supabase = getSupabase();
    if (!supabase) {
        console.error('❌ Supabase غير متوفر للاستعلام');
        return [];
    }
    
    try {
        let queryBuilder = supabase.from(table).select('*');
        
        Object.keys(filter).forEach(key => {
            if (filter[key] !== undefined && filter[key] !== null && filter[key] !== '') {
                queryBuilder = queryBuilder.eq(key, filter[key]);
            }
        });
        
        const { data, error } = await queryBuilder.order('id', { ascending: false });
        if (error) {
            console.error(`❌ خطأ في استعلام ${table}:`, error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error(`❌ خطأ في استعلام ${table}:`, error);
        return [];
    }
}

// ✅ دالة لإضافة سجل
async function add(table, data) {
    const supabase = getSupabase();
    if (!supabase) {
        return { success: false, error: 'Supabase غير متوفر' };
    }
    
    try {
        if (!data.created_at) data.created_at = new Date().toISOString();
        if (!data.updated_at) data.updated_at = new Date().toISOString();
        
        const { data: result, error } = await supabase.from(table).insert(data).select();
        if (error) throw error;
        return { success: true, data: result?.[0] || null };
    } catch (error) {
        console.error(`❌ خطأ في إضافة ${table}:`, error);
        return { success: false, error: error.message };
    }
}

// ✅ دالة لتحديث سجل
async function update(table, id, data) {
    const supabase = getSupabase();
    if (!supabase) {
        return { success: false, error: 'Supabase غير متوفر' };
    }
    
    try {
        data.updated_at = new Date().toISOString();
        const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select();
        if (error) throw error;
        return { success: true, data: result?.[0] || null };
    } catch (error) {
        console.error(`❌ خطأ في تحديث ${table}:`, error);
        return { success: false, error: error.message };
    }
}

// ✅ دالة لحذف سجل
async function remove(table, id) {
    const supabase = getSupabase();
    if (!supabase) {
        return { success: false, error: 'Supabase غير متوفر' };
    }
    
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error(`❌ خطأ في حذف ${table}:`, error);
        return { success: false, error: error.message };
    }
}

// ✅ دالة للحصول على سجل واحد
async function getById(table, id) {
    const supabase = getSupabase();
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (error) throw error;
        return data || null;
    } catch (error) {
        console.error(`❌ خطأ في جلب ${table}:`, error);
        return null;
    }
}

// ✅ دالة للبحث
async function search(table, field, term) {
    const supabase = getSupabase();
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase.from(table).select('*').ilike(field, `%${term}%`);
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error(`❌ خطأ في البحث في ${table}:`, error);
        return [];
    }
}

// ✅ تصدير الدوال
window.query = query;
window.add = add;
window.update = update;
window.remove = remove;
window.getById = getById;
window.search = search;

console.log('✅ Database functions ready');