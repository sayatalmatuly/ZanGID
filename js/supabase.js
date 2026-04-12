// js/supabase.js
(function() {
  const SUPABASE_URL = 'https://tukxoubenmjsakroxzck.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_oA0BjFdpIcrlvW6sXPNKLg_ginnw1Y8';
  
  if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase клиент успешно инициализирован');
  } else {
    console.error('❌ Скрипт Supabase не найден. Проверьте подключение CDN.');
  }
})();
