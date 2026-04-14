/**
 * ZanGID — Логика входа / регистрации
 * Переключение между формами, показ пароля
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    var loginForm = document.getElementById('loginForm');
    var loginBtn = document.getElementById('loginBtn');
    var loginTitle = document.getElementById('loginTitle');
    var loginSubtitle = document.getElementById('loginSubtitle');
    var nameGroup = document.getElementById('nameGroup');
    var nameInput = document.getElementById('nameInput');
    var emailInput = document.getElementById('emailInput');
    var passwordInput = document.getElementById('passwordInput');
    var switchLink = document.getElementById('switchLink');
    var switchText = document.getElementById('switchText');
    var togglePassword = document.getElementById('togglePassword');
    var googleBtn = document.getElementById('googleBtn');

    // Текущий режим: 'login' или 'register'
    var mode = 'login';

    // --- Переключение между входом и регистрацией ---
    if (switchLink) {
      switchLink.addEventListener('click', function (e) {
        e.preventDefault();

        if (mode === 'login') {
          mode = 'register';
          loginTitle.textContent = 'Создать аккаунт';
          loginSubtitle.textContent = 'Бесплатная регистрация за 30 секунд';
          loginBtn.textContent = 'Зарегистрироваться';
          nameGroup.classList.remove('hidden');
          switchText.textContent = 'Уже есть аккаунт?';
          switchLink.textContent = 'Войти';
        } else {
          mode = 'login';
          loginTitle.textContent = 'Войти в ZanGID';
          loginSubtitle.textContent = 'Получите доступ к AI-навигатору по законам';
          loginBtn.textContent = 'Войти';
          nameGroup.classList.add('hidden');
          switchText.textContent = 'Нет аккаунта?';
          switchLink.textContent = 'Зарегистрироваться';
        }
      });
    }

    // --- Показать / скрыть пароль ---
    if (togglePassword) {
      togglePassword.addEventListener('click', function () {
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          togglePassword.title = 'Скрыть пароль';
        } else {
          passwordInput.type = 'password';
          togglePassword.title = 'Показать пароль';
        }
      });
    }

    // --- Отправка формы ---
    if (loginForm) {
      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        var email = emailInput.value.trim();
        var password = passwordInput.value.trim();

        if (!email || !password) return;
        
        if (!window.supabaseClient) {
          if (window.ZanGid && typeof window.ZanGid.showToast === 'function') {
            window.ZanGid.showToast('Ошибка конфигурации Supabase. Клиент не инициализирован.', 'error');
          }
          return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Загрузка...';
        submitBtn.disabled = true;

        try {
          if (mode === 'login') {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            console.log('Вход успешен:', data);
            window.location.href = 'dashboard.html';
          } else {
            var name = nameInput.value.trim();
            const { data, error } = await window.supabaseClient.auth.signUp({
              email,
              password,
              options: {
                data: { fullname: name }
              }
            });
            if (error) throw error;
            console.log('Регистрация успешна:', data);
            window.location.href = 'dashboard.html';
          }
        } catch (error) {
          console.error('Ошибка авторизации:', error);
          if (window.ZanGid && typeof window.ZanGid.showToast === 'function') {
            window.ZanGid.showToast(
              error.message === 'Invalid login credentials' ? 'Неверный email или пароль' : (error.message || 'Ошибка'),
              'error'
            );
          }
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });
    }

    // --- Google OAuth ---
    if (googleBtn) {
      googleBtn.addEventListener('click', async function () {
        if (!window.supabaseClient) return;
        try {
          await window.supabaseClient.auth.signInWithOAuth({ 
            provider: 'google',
            options: {
              redirectTo: window.location.origin + '/dashboard.html'
            }
          });
        } catch(e) {
          console.error('Ошибка Google Auth', e);
        }
      });
    }

  });

})();
