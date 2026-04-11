/**
 * ZanGID — Общая логика приложения
 * Бургер-меню, тёмная тема, утилиты
 */

(function () {
  'use strict';

  // --- Тёмная тема ---
  // Загружаем сохранённую тему из localStorage
  function loadTheme() {
    const saved = localStorage.getItem('zangid-theme');
    if (saved === 'dark') {
      document.body.classList.add('dark');
    }
  }

  // Переключение тёмной темы
  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('zangid-theme', isDark ? 'dark' : 'light');

    // Обновляем тоггл на странице профиля, если есть
    const themeToggle = document.getElementById('toggleTheme');
    if (themeToggle) {
      themeToggle.classList.toggle('active', isDark);
    }
  }

  // Проверяем текущую тему (для тоггла)
  function isDarkTheme() {
    return document.body.classList.contains('dark');
  }

  // Инициализация темы при загрузке
  loadTheme();

  // --- Бургер-меню ---
  function initBurgerMenu() {
    const burgerBtn = document.getElementById('burgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (!burgerBtn || !mobileMenu) return;

    burgerBtn.addEventListener('click', function () {
      burgerBtn.classList.toggle('open');
      mobileMenu.classList.toggle('open');

      // Блокируем скролл при открытом меню
      if (mobileMenu.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // Закрываем меню при клике на ссылку
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        burgerBtn.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // --- Пользовательское меню (Dropdown) ---
  function initUserMenu() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = userMenuBtn ? userMenuBtn.closest('.user-menu') : null;

    if (!userMenuBtn || !userMenu) return;

    userMenuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      userMenu.classList.toggle('open');
    });

    // Закрытие при клике вне меню
    document.addEventListener('click', function (e) {
      if (!userMenu.contains(e.target)) {
        userMenu.classList.remove('open');
      }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        userMenu.classList.remove('open');
      }
    });
  }

  // --- Имитация авторизации (Frontend Mock) ---
  function initAuthState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      document.body.classList.add('logged-in');
    } else {
      document.body.classList.remove('logged-in');
    }

    // Обработчик кнопки Выйти
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.setItem('isLoggedIn', 'false');
        window.location.href = 'index.html';
      });
    });
  }

  // --- Инициализация ---
  document.addEventListener('DOMContentLoaded', function () {
    initAuthState();
    initBurgerMenu();
    initUserMenu();
  });

  // Экспортируем функции для использования на других страницах
  window.ZanGid = {
    toggleTheme: toggleTheme,
    isDarkTheme: isDarkTheme,
    loadTheme: loadTheme
  };

})();
