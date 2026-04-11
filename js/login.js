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
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var email = emailInput.value.trim();
        var password = passwordInput.value.trim();

        if (!email || !password) return;

        if (mode === 'login') {
          // TODO: Supabase auth - signIn()
          console.log('Вход:', email);
          localStorage.setItem('isLoggedIn', 'true');
          window.location.href = 'dashboard.html';
        } else {
          var name = nameInput.value.trim();
          // TODO: Supabase auth - signUp()
          console.log('Регистрация:', name, email);
          localStorage.setItem('isLoggedIn', 'true');
          window.location.href = 'dashboard.html';
        }
      });
    }

    // --- Google OAuth ---
    if (googleBtn) {
      googleBtn.addEventListener('click', function () {
        // TODO: Supabase auth - signInWithOAuth Google
        console.log('Google OAuth');
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
      });
    }

  });

})();
