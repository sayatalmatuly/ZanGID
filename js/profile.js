/**
 * ZanGID — Логика профиля
 * Тоггл темы, уведомления, настройки
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.supabaseClient) return;

    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return; // app.js handle redirect

    const user = session.user;

    var toggleThemeEl = document.getElementById('toggleTheme');
    var toggleNotifications = document.getElementById('toggleNotifications');
    var settingCity = document.getElementById('settingCity');
    var settingLanguage = document.getElementById('settingLanguage');

    const profileName = document.getElementById('profileName');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileCity = document.getElementById('profileCity');
    const statQueries = document.getElementById('statQueries');
    const statTopics = document.getElementById('statTopics');

    try {
      // 1. Загрузка профиля из users
      let { data: profile, error } = await window.supabaseClient.from('users').select('*').eq('id', user.id).single();
      
      const fullName = profile?.name || user.user_metadata?.fullname || user.email.split('@')[0];
      if (profileName) {
        profileName.textContent = fullName;
        profileName.classList.remove('user-identity-pending');
      }
      if (profileAvatar) {
        profileAvatar.textContent = fullName.substring(0, 2).toUpperCase();
        profileAvatar.classList.remove('user-identity-pending');
      }
      if (profileCity) {
        profileCity.textContent = profile && profile.city ? '📍 ' + profile.city : 'Укажите город';
        profileCity.classList.remove('user-identity-pending');
      }

      if (!profile) {
        // Создаем профиль при первом входе, если его нет
        const { error: insertError } = await window.supabaseClient.from('users').upsert({
          id: user.id,
          name: fullName,
          created_at: new Date().toISOString()
        }, { onConflict: 'id' });
        if (insertError) console.error('Ошибка создания профиля', insertError);
      } else {
        if (settingCity && profile.city) settingCity.value = profile.city;
        if (settingLanguage && profile.language) settingLanguage.value = profile.language;
      }

      // 2. Статистика (чаты, сообщения)
      const { count: chatsCount } = await window.supabaseClient.from('chats').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      if (statQueries) {
        statQueries.textContent = chatsCount || 0;
        statQueries.classList.remove('user-identity-pending');
      }

      if (statTopics) {
        const { count: msgsCount } = await window.supabaseClient
          .from('messages')
          .select('chats!inner(*)', { count: 'exact', head: true })
          .eq('chats.user_id', user.id);
        statTopics.textContent = msgsCount || 0;
        statTopics.classList.remove('user-identity-pending');
      }

    } catch (err) {
      console.error('Ошибка профиля:', err);
      var fallbackName = user.email.split('@')[0];
      if (profileName) {
        profileName.textContent = fallbackName;
        profileName.classList.remove('user-identity-pending');
      }
      if (profileAvatar) {
        profileAvatar.textContent = fallbackName.substring(0, 2).toUpperCase();
        profileAvatar.classList.remove('user-identity-pending');
      }
      if (profileCity) {
        profileCity.textContent = 'Укажите город';
        profileCity.classList.remove('user-identity-pending');
      }
      if (statQueries) {
        statQueries.textContent = '—';
        statQueries.classList.remove('user-identity-pending');
      }
      if (statTopics) {
        statTopics.textContent = '—';
        statTopics.classList.remove('user-identity-pending');
      }
    }

    // Сохранение профиля
    async function saveProfile() {
      const city = settingCity ? settingCity.value : '';
      const language = settingLanguage ? settingLanguage.value : 'ru';
      const fullName = profileName ? profileName.textContent : user.email.split('@')[0];

      try {
        const { error } = await window.supabaseClient.from('users').upsert({
          id: user.id,
          name: fullName,
          city: city,
          language: language,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        if (error) throw error;
        
        if (profileCity) profileCity.textContent = city ? '📍 ' + city : 'Укажите город';
        if (window.ZanGid && typeof window.ZanGid.showToast === 'function') {
          window.ZanGid.showToast('Профиль сохранён', 'success');
        }
      } catch (err) {
        console.error('Ошибка сохранения профиля:', err);
        if (window.ZanGid && typeof window.ZanGid.showToast === 'function') {
          window.ZanGid.showToast('Ошибка сохранения профиля', 'error');
        }
      }
    }

    if (settingCity) settingCity.addEventListener('change', saveProfile);
    if (settingLanguage) settingLanguage.addEventListener('change', saveProfile);

    // --- Инициализация тоггла темы ---
    if (toggleThemeEl) {
      if (window.ZanGid && window.ZanGid.isDarkTheme()) toggleThemeEl.classList.add('active');
      toggleThemeEl.addEventListener('click', function () {
        if (window.ZanGid) window.ZanGid.toggleTheme();
      });
    }

    // --- Тоггл уведомлений (Локально) ---
    if (toggleNotifications) {
      var notifSaved = localStorage.getItem('zangid-notifications');
      if (notifSaved === 'true') toggleNotifications.classList.add('active');
      toggleNotifications.addEventListener('click', function () {
        toggleNotifications.classList.toggle('active');
        localStorage.setItem('zangid-notifications', toggleNotifications.classList.contains('active'));
      });
    }

  });

})();
