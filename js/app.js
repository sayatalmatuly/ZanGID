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

  function showToast(message, type) {
    var toastType = type || 'info';
    var icons = { success: '✓', error: '✕', info: 'ℹ' };
    var container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + toastType;
    toast.innerHTML =
      '<div class="toast-icon">' + (icons[toastType] || icons.info) + '</div>' +
      '<div class="toast-message"></div>' +
      '<button class="toast-close" aria-label="Закрыть уведомление">×</button>';
    toast.querySelector('.toast-message').textContent = message || '';
    container.appendChild(toast);

    var removeToast = function () {
      if (!toast.parentNode) return;
      toast.classList.add('toast-hide');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 240);
    };

    var timer = setTimeout(removeToast, 3000);
    toast.querySelector('.toast-close').addEventListener('click', function () {
      clearTimeout(timer);
      removeToast();
    });
  }

  // --- Интеграция Supabase Auth ---
  async function initAuthState() {
    if (!window.supabaseClient) return;

    // Получаем текущую сессию
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    const isLoggedIn = !!session;

    if (isLoggedIn) {
      document.body.classList.add('logged-in');
      
      const email = session.user.email;
      let userFullname = '';
      
      try {
        const { data: profile, error } = await window.supabaseClient
          .from('users')
          .select('name')
          .eq('id', session.user.id)
          .single();
          
        if (!error && profile && profile.name) {
          userFullname = profile.name;
        }
      } catch (e) {
        console.error('Ошибка загрузки имени', e);
      }
      
      if (!userFullname) {
        userFullname = session.user.user_metadata?.fullname || session.user.user_metadata?.full_name || email.split('@')[0];
      }
      
      document.querySelectorAll('.dropdown-name').forEach(function (el) {
        el.textContent = userFullname;
        el.classList.remove('user-identity-pending');
      });
      document.querySelectorAll('.dropdown-email').forEach(function (el) {
        el.textContent = email;
        el.classList.remove('user-identity-pending');
      });
      document.querySelectorAll('.user-avatar').forEach(function (el) {
        el.textContent = userFullname.substring(0, 2).toUpperCase();
        el.classList.remove('user-identity-pending');
      });
    } else {
      document.body.classList.remove('logged-in');
    }

    // Защита маршрутов
    const pathname = window.location.pathname;
    const isAuthPage = pathname.endsWith('login.html');
    const isPrivateRoute = pathname.endsWith('chat.html') || 
                           pathname.endsWith('dashboard.html') || 
                           pathname.endsWith('profile.html') || 
                           pathname.endsWith('history.html');

    if (isPrivateRoute && !isLoggedIn) {
      window.location.replace('login.html');
      return;
    }
    
    if (isAuthPage && isLoggedIn) {
      window.location.replace('dashboard.html');
      return;
    }

    // Обработчик кнопки Выйти
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        await window.supabaseClient.auth.signOut();
        window.location.href = 'index.html';
      });
    });

    // Реакция на изменение сессии (например в другой вкладке)
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.replace('index.html');
      } else if (event === 'SIGNED_IN' && pathname.endsWith('login.html')) {
        window.location.replace('dashboard.html');
      }
    });
  }

  // --- Инициализация ---
  document.addEventListener('DOMContentLoaded', async function () {
    await initAuthState();
    initBurgerMenu();
    initUserMenu();
  });

  // Экспортируем функции для использования на других страницах
  window.ZanGid = {
    toggleTheme: toggleTheme,
    isDarkTheme: isDarkTheme,
    loadTheme: loadTheme,
    showToast: showToast
  };
  window.showToast = showToast;

})();
