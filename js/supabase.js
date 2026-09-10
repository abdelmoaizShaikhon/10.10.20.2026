// ============================================
// 🏢 شركة العبادي - إعدادات Supabase
// ============================================

// ⚠️ استبدل هذه القيم بقيم مشروعك من Supabase
const SUPABASE_URL = 'https://xkljnlhrnbturgpgyfxo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gUt4tjFjyiuStl4cdekX0Q_7xYRrqNG';

// ✅ منع إعادة تحميل الملف
if (window._supabase_loaded) {
    console.log('ℹ️ Supabase already loaded, skipping...');
} else {
    window._supabase_loaded = true;
    
    // ✅ التحقق من تحميل مكتبة Supabase
    if (typeof window.supabase === 'undefined') {
        console.error('❌ مكتبة Supabase غير محملة! تأكد من تحميلها في HTML');
        console.log('📝 تأكد من وجود: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    }
    
    // ✅ إنشاء عميل Supabase
    let supabaseClient = null;
    
    try {
        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ تم تهيئة عميل Supabase بنجاح');
        } else {
            console.error('❌ window.supabase.createClient غير متوفرة');
        }
    } catch (error) {
        console.error('❌ فشل تهيئة Supabase:', error);
    }
    
    // ✅ تخزين العميل في window
    window._supabase = supabaseClient;
    window.supabase = supabaseClient;
    
    // ✅ دالة اختبار الاتصال
    window.testConnection = async function() {
        if (!window.supabase) {
            console.error('❌ عميل Supabase غير مهيأ');
            return false;
        }
        
        try {
            console.log('🔄 جاري اختبار الاتصال بـ Supabase...');
            const { data, error } = await window.supabase.from('users').select('count', { count: 'exact', head: true });
            if (error) {
                console.error('❌ فشل الاتصال:', error.message);
                return false;
            }
            console.log('✅ تم الاتصال بـ Supabase بنجاح');
            console.log('📊 عدد المستخدمين:', data?.count || 0);
            return true;
        } catch (error) {
            console.error('❌ خطأ في الاتصال:', error.message);
            return false;
        }
    };
    
    console.log('📦 Supabase ready - شركة العبادي');
}

// ✅ تصدير للاستخدام
console.log('✅ Supabase module loaded');