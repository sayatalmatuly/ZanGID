/**
 * ZanGID — Логика профиля
 * Тоггл темы, уведомления, настройки
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    var toggleThemeEl = document.getElementById('toggleTheme');
    var toggleNotifications = document.getElementById('toggleNotifications');
    var settingCity = document.getElementById('settingCity');
    var settingLanguage = document.getElementById('settingLanguage');
    var logoutBtn = document.getElementById('logoutBtn');

    // --- Инициализация тоггла темы ---
    if (toggleThemeEl) {
      // Устанавливаем начальное состояние
      if (window.ZanGid && window.ZanGid.isDarkTheme()) {
        toggleThemeEl.classList.add('active');
      }

      toggleThemeEl.addEventListener('click', function () {
        if (window.ZanGid) {
          window.ZanGid.toggleTheme();
        }
      });
    }

    // --- Тоггл уведомлений ---
    if (toggleNotifications) {
      // Загружаем сохранённое состояние
      var notifSaved = localStorage.getItem('zangid-notifications');
      if (notifSaved === 'true') {
        toggleNotifications.classList.add('active');
      }

      toggleNotifications.addEventListener('click', function () {
        toggleNotifications.classList.toggle('active');
        var isActive = toggleNotifications.classList.contains('active');
        localStorage.setItem('zangid-notifications', isActive);
        // TODO: Supabase - сохранить настройки профиля
      });
    }

    // --- Выбор города ---
    if (settingCity) {
      // Загружаем сохранённый город
      var savedCity = localStorage.getItem('zangid-city');
      if (savedCity) {
        settingCity.value = savedCity;
      }

      settingCity.addEventListener('change', function () {
        localStorage.setItem('zangid-city', settingCity.value);
        // TODO: Supabase - сохранить настройки профиля
        console.log('Город изменён:', settingCity.value);
      });
    }

    // --- Выбор языка ---
    if (settingLanguage) {
      // Загружаем сохранённый язык
      var savedLang = localStorage.getItem('zangid-language');
      if (savedLang) {
        settingLanguage.value = savedLang;
      }

      settingLanguage.addEventListener('change', function () {
        localStorage.setItem('zangid-language', settingLanguage.value);
        // TODO: Supabase - сохранить настройки профиля
        console.log('Язык изменён:', settingLanguage.value);
      });
    }

    // --- Выход из аккаунта ---
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        // TODO: Supabase auth - signOut()
        console.log('Выход из аккаунта');
        window.location.href = 'index.html';
      });
    }

  });

})();
