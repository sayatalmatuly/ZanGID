/**
 * ZanGID — общий frontend runtime
 * Тема, локализация, хедер, состояния и авторизация
 */

(function () {
  'use strict';

  var THEME_KEY = 'zangid-theme';
  var LANG_KEY = 'zangid-language';

  function i18n() {
    return window.ZanGidI18n || {
      defaultLanguage: 'ru',
      t: function (key) { return key; },
      get: function () { return undefined; }
    };
  }

  function getLanguage() {
    var saved = localStorage.getItem(LANG_KEY);
    return saved === 'kz' ? 'kz' : 'ru';
  }

  function getLocale() {
    return i18n().get('common.locale', getLanguage()) || 'ru-RU';
  }

  function translate(key, vars, lang) {
    return i18n().t(key, vars, lang || getLanguage());
  }

  function getInitials(value) {
    return String(value || 'ZG')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0); })
      .join('')
      .toUpperCase() || 'ZG';
  }

  function setTheme(nextTheme, persist) {
    var isDark = nextTheme === 'dark';
    document.body.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    if (persist !== false) {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    }
    document.dispatchEvent(new CustomEvent('zangid:themechange', {
      detail: { theme: isDark ? 'dark' : 'light' }
    }));
    syncThemeControls();
  }

  function loadTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    setTheme(saved === 'dark' ? 'dark' : 'light', false);
  }

  function toggleTheme() {
    setTheme(document.body.classList.contains('dark') ? 'light' : 'dark', true);
  }

  function isDarkTheme() {
    return document.body.classList.contains('dark');
  }

  function setLanguage(lang, options) {
    var nextLang = lang === 'kz' ? 'kz' : 'ru';
    var shouldPersist = !options || options.persist !== false;
    if (shouldPersist) {
      localStorage.setItem(LANG_KEY, nextLang);
    }
    document.documentElement.lang = nextLang === 'kz' ? 'kk' : 'ru';
    document.documentElement.dataset.lang = nextLang;
    applyTranslations(document);
    syncLanguageControls();
    document.dispatchEvent(new CustomEvent('zangid:languagechange', {
      detail: { language: nextLang, locale: getLocale() }
    }));
  }

  function formatDate(value, options) {
    try {
      return new Intl.DateTimeFormat(getLocale(), options || {}).format(new Date(value));
    } catch (error) {
      return '';
    }
  }

  function applyTranslations(root) {
    var scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(function (node) {
      var key = node.getAttribute('data-i18n');
      if (!key) return;
      node.textContent = translate(key);
    });

    scope.querySelectorAll('[data-i18n-html]').forEach(function (node) {
      var key = node.getAttribute('data-i18n-html');
      if (!key) return;
      node.innerHTML = translate(key);
    });

    scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (node) {
      var key = node.getAttribute('data-i18n-placeholder');
      if (!key) return;
      node.setAttribute('placeholder', translate(key));
    });

    scope.querySelectorAll('[data-i18n-title]').forEach(function (node) {
      var key = node.getAttribute('data-i18n-title');
      if (!key) return;
      node.setAttribute('title', translate(key));
    });

    scope.querySelectorAll('[data-i18n-aria-label]').forEach(function (node) {
      var key = node.getAttribute('data-i18n-aria-label');
      if (!key) return;
      node.setAttribute('aria-label', translate(key));
    });

    scope.querySelectorAll('[data-i18n-content]').forEach(function (node) {
      var key = node.getAttribute('data-i18n-content');
      if (!key) return;
      node.setAttribute('content', translate(key));
    });
  }

  function closeMobileMenu() {
    var burgerBtn = document.getElementById('burgerBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    if (!burgerBtn || !mobileMenu) return;
    burgerBtn.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  function initBurgerMenu() {
    var burgerBtn = document.getElementById('burgerBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    if (!burgerBtn || !mobileMenu || burgerBtn.dataset.bound === 'true') return;

    burgerBtn.dataset.bound = 'true';
    burgerBtn.addEventListener('click', function () {
      burgerBtn.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a, button').forEach(function (node) {
      node.addEventListener('click', function () {
        closeMobileMenu();
      });
    });
  }

  function initUserMenu() {
    var userMenuBtn = document.getElementById('userMenuBtn');
    var userMenu = userMenuBtn ? userMenuBtn.closest('.user-menu') : null;
    if (!userMenuBtn || !userMenu || userMenuBtn.dataset.bound === 'true') return;

    userMenuBtn.dataset.bound = 'true';
    userMenuBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      userMenu.classList.toggle('open');
    });

    document.addEventListener('click', function (event) {
      if (!userMenu.contains(event.target)) {
        userMenu.classList.remove('open');
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        userMenu.classList.remove('open');
      }
    });
  }

  function themeIconSvg(isDark) {
    if (isDark) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"></circle><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"></path></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 15.6A8.5 8.5 0 0 1 8.4 3.8a9.3 9.3 0 1 0 11.8 11.8z"></path></svg>';
  }

  function createLanguageSwitcher(isMobile) {
    var wrapper = document.createElement('div');
    wrapper.className = isMobile ? 'lang-switcher lang-switcher-mobile' : 'lang-switcher';
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', translate('common.switchLanguage'));

    ['ru', 'kz'].forEach(function (lang) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'lang-switcher-btn';
      button.dataset.lang = lang;
      button.textContent = translate(lang === 'ru' ? 'common.languageRu' : 'common.languageKz');
      button.addEventListener('click', function () {
        setLanguage(lang);
      });
      wrapper.appendChild(button);
    });

    return wrapper;
  }

  function createThemeToggle(isMobile) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = isMobile ? 'theme-toggle-btn theme-toggle-btn-mobile' : 'theme-toggle-btn';
    button.dataset.themeControl = 'true';
    button.setAttribute('aria-label', translate('common.switchTheme'));
    button.setAttribute('title', translate('common.switchTheme'));
    button.innerHTML = '<span class="theme-toggle-icon">' + themeIconSvg(isDarkTheme()) + '</span>';
    button.addEventListener('click', function () {
      toggleTheme();
    });
    return button;
  }

  function initHeaderControls() {
    var navbarActions = document.querySelector('.navbar-actions');
    if (navbarActions && !navbarActions.querySelector('[data-zangid-header-controls]')) {
      var controls = document.createElement('div');
      controls.className = 'header-controls';
      controls.dataset.zangidHeaderControls = 'true';
      controls.appendChild(createLanguageSwitcher(false));
      controls.appendChild(createThemeToggle(false));
      navbarActions.insertBefore(controls, navbarActions.firstChild || null);
    }

    var mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu && !mobileMenu.querySelector('[data-zangid-mobile-controls]')) {
      var mobileControls = document.createElement('div');
      mobileControls.className = 'mobile-menu-controls';
      mobileControls.dataset.zangidMobileControls = 'true';
      mobileControls.appendChild(createLanguageSwitcher(true));
      mobileControls.appendChild(createThemeToggle(true));
      mobileMenu.insertBefore(mobileControls, mobileMenu.firstChild || null);
    }

    var loginCard = document.querySelector('.login-card');
    if (loginCard && !loginCard.querySelector('[data-zangid-login-toolbar]')) {
      var loginToolbar = document.createElement('div');
      loginToolbar.className = 'login-toolbar';
      loginToolbar.dataset.zangidLoginToolbar = 'true';
      loginToolbar.appendChild(createLanguageSwitcher(false));
      loginToolbar.appendChild(createThemeToggle(false));
      loginCard.insertBefore(loginToolbar, loginCard.firstChild || null);
    }

    syncLanguageControls();
    syncThemeControls();
  }

  function syncLanguageControls() {
    var activeLanguage = getLanguage();
    document.querySelectorAll('.lang-switcher').forEach(function (wrapper) {
      wrapper.setAttribute('aria-label', translate('common.switchLanguage'));
    });
    document.querySelectorAll('.lang-switcher-btn').forEach(function (button) {
      var current = button.dataset.lang === activeLanguage;
      button.classList.toggle('active', current);
      button.setAttribute('aria-pressed', current ? 'true' : 'false');
    });
  }

  function syncThemeControls() {
    var dark = isDarkTheme();
    document.querySelectorAll('[data-theme-control="true"]').forEach(function (button) {
      button.setAttribute('aria-label', translate('common.switchTheme'));
      button.setAttribute('title', translate('common.switchTheme'));
      button.classList.toggle('active', dark);
      button.innerHTML = '<span class="theme-toggle-icon">' + themeIconSvg(dark) + '</span>';
    });

    var toggleThemeEl = document.getElementById('toggleTheme');
    if (toggleThemeEl) {
      toggleThemeEl.classList.toggle('active', dark);
    }
  }

  function showToast(message, type) {
    var toastType = type || 'info';
    var icons = { success: '✓', error: '×', info: 'i' };
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
      '<button class="toast-close" aria-label="' + translate('common.close') + '">×</button>';
    toast.querySelector('.toast-message').textContent = message || '';
    container.appendChild(toast);

    function removeToast() {
      if (!toast.parentNode) return;
      toast.classList.add('toast-hide');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 240);
    }

    var timer = setTimeout(removeToast, 3200);
    toast.querySelector('.toast-close').addEventListener('click', function () {
      clearTimeout(timer);
      removeToast();
    });
  }

  function confirmModal(options) {
    return new Promise(function (resolve) {
      var settings = options || {};
      var title = settings.title || translate('common.confirm');
      var message = settings.text || '';
      var confirmLabel = settings.confirmLabel || translate('common.ok');
      var cancelLabel = settings.cancelLabel || translate('common.cancel');

      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal-card">' +
          '<div class="modal-title">' + title + '</div>' +
          '<div class="modal-text">' + message + '</div>' +
          '<div class="modal-actions">' +
            '<button type="button" class="modal-btn modal-btn-cancel">' + cancelLabel + '</button>' +
            '<button type="button" class="modal-btn modal-btn-confirm">' + confirmLabel + '</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      function close(result) {
        overlay.classList.add('hiding');
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(result);
        }, 240);
        document.removeEventListener('keydown', handleKey);
      }

      function handleKey(e) {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') close(true);
      }

      overlay.querySelector('.modal-btn-cancel').addEventListener('click', function () { close(false); });
      overlay.querySelector('.modal-btn-confirm').addEventListener('click', function () { close(true); });
      document.addEventListener('keydown', handleKey);
    });
  }

  function createStateMarkup(options) {
    var settings = options || {};
    var classes = ['state-card'];
    if (settings.type) classes.push('state-card-' + settings.type);
    if (settings.compact) classes.push('state-card-compact');
    var action = settings.actionHref
      ? '<a href="' + settings.actionHref + '" class="btn btn-primary">' + (settings.actionLabel || '') + '</a>'
      : settings.actionLabel
        ? '<button type="button" class="btn btn-primary" data-state-action="true">' + settings.actionLabel + '</button>'
        : '';

    return (
      '<div class="' + classes.join(' ') + '">' +
        '<div class="state-card-badge"></div>' +
        '<div class="state-card-content">' +
          '<h3 class="state-card-title">' + (settings.title || '') + '</h3>' +
          '<p class="state-card-text">' + (settings.text || '') + '</p>' +
          (action ? '<div class="state-card-actions">' + action + '</div>' : '') +
        '</div>' +
      '</div>'
    );
  }

  function renderState(target, options) {
    if (!target) return null;
    target.innerHTML = createStateMarkup(options);
    return target.querySelector('[data-state-action="true"]');
  }

  function createSkeletonMarkup(count, variant) {
    var blocks = [];
    for (var i = 0; i < (count || 3); i += 1) {
      blocks.push(
        '<div class="skeleton skeleton-' + (variant || 'row') + '">' +
          '<span class="skeleton-line skeleton-line-long"></span>' +
          '<span class="skeleton-line skeleton-line-short"></span>' +
        '</div>'
      );
    }
    return '<div class="skeleton-stack">' + blocks.join('') + '</div>';
  }

  async function initAuthState() {
    if (!window.supabaseClient) return;

    var sessionData = await window.supabaseClient.auth.getSession();
    var session = sessionData && sessionData.data ? sessionData.data.session : null;
    var isLoggedIn = !!session;
    var profileLanguage = null;

    if (isLoggedIn) {
      document.body.classList.add('logged-in');

      var email = session.user.email;
      var userFullname = '';

      try {
        var profileResponse = await window.supabaseClient
          .from('users')
          .select('name, language')
          .eq('id', session.user.id)
          .single();

        if (!profileResponse.error && profileResponse.data) {
          if (profileResponse.data.name) userFullname = profileResponse.data.name;
          if (profileResponse.data.language) profileLanguage = profileResponse.data.language;
        }
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
      }

      if (profileLanguage && !localStorage.getItem(LANG_KEY)) {
        setLanguage(profileLanguage, { persist: true });
      }

      if (!userFullname) {
        userFullname = session.user.user_metadata?.fullname || session.user.user_metadata?.full_name || email.split('@')[0];
      }

      document.querySelectorAll('.dropdown-name').forEach(function (node) {
        node.textContent = userFullname;
        node.classList.remove('user-identity-pending');
      });
      document.querySelectorAll('.dropdown-email').forEach(function (node) {
        node.textContent = email;
        node.classList.remove('user-identity-pending');
      });
      document.querySelectorAll('.user-avatar').forEach(function (node) {
        node.textContent = getInitials(userFullname);
        node.classList.remove('user-identity-pending');
      });
    } else {
      document.body.classList.remove('logged-in');
    }

    var pathname = window.location.pathname;
    var isAuthPage = pathname.endsWith('login.html');
    var isPrivateRoute = pathname.endsWith('chat.html') ||
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

    document.querySelectorAll('.logout-btn').forEach(function (button) {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', async function (event) {
        event.preventDefault();
        await window.supabaseClient.auth.signOut();
        window.location.href = 'index.html';
      });
    });

    window.supabaseClient.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') {
        window.location.replace('index.html');
      } else if (event === 'SIGNED_IN' && pathname.endsWith('login.html')) {
        window.location.replace('dashboard.html');
      }
    });
  }

  loadTheme();
  document.documentElement.lang = getLanguage() === 'kz' ? 'kk' : 'ru';
  document.documentElement.dataset.lang = getLanguage();

  document.addEventListener('DOMContentLoaded', async function () {
    initHeaderControls();
    applyTranslations(document);
    initBurgerMenu();
    initUserMenu();
    syncLanguageControls();
    syncThemeControls();
    await initAuthState();
  });

  window.ZanGid = {
    toggleTheme: toggleTheme,
    setTheme: setTheme,
    isDarkTheme: isDarkTheme,
    loadTheme: loadTheme,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    t: translate,
    getLocale: getLocale,
    formatDate: formatDate,
    getInitials: getInitials,
    showToast: showToast,
    createStateMarkup: createStateMarkup,
    renderState: renderState,
    createSkeletonMarkup: createSkeletonMarkup,
    confirm: confirmModal,
    closeMobileMenu: closeMobileMenu
  };
  window.showToast = showToast;
})();
