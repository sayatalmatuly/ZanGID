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

    var mode = 'login';

    function t(key) {
      return window.ZanGid.t(key);
    }

    function renderMode() {
      if (mode === 'login') {
        loginTitle.textContent = t('login.title');
        loginSubtitle.textContent = t('login.subtitle');
        loginBtn.textContent = t('login.submitLogin');
        switchText.textContent = t('login.switchRegisterText');
        switchLink.textContent = t('login.switchRegisterLink');
        nameGroup.classList.add('hidden');
      } else {
        loginTitle.textContent = t('login.registerTitle');
        loginSubtitle.textContent = t('login.registerSubtitle');
        loginBtn.textContent = t('login.submitRegister');
        switchText.textContent = t('login.switchLoginText');
        switchLink.textContent = t('login.switchLoginLink');
        nameGroup.classList.remove('hidden');
      }
    }

    switchLink.addEventListener('click', function (event) {
      event.preventDefault();
      mode = mode === 'login' ? 'register' : 'login';
      renderMode();
    });

    togglePassword.addEventListener('click', function () {
      var isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePassword.title = isPassword ? t('login.hidePassword') : t('login.showPassword');
    });

    document.addEventListener('zangid:languagechange', function () {
      renderMode();
      togglePassword.title = passwordInput.type === 'password' ? t('login.showPassword') : t('login.hidePassword');
    });

    loginForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      var email = String(emailInput.value || '').trim();
      var password = String(passwordInput.value || '').trim();
      if (!email || !password) return;

      if (!window.supabaseClient) {
        window.ZanGid.showToast(t('login.supabaseMissing'), 'error');
        return;
      }

      var originalText = loginBtn.textContent;
      loginBtn.textContent = t('login.loading');
      loginBtn.disabled = true;

      try {
        if (mode === 'login') {
          var loginResponse = await window.supabaseClient.auth.signInWithPassword({ email: email, password: password });
          if (loginResponse.error) throw loginResponse.error;
          window.location.href = 'dashboard.html';
        } else {
          var name = String(nameInput.value || '').trim();
          var registerResponse = await window.supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
              data: { fullname: name }
            }
          });
          if (registerResponse.error) throw registerResponse.error;
          window.location.href = 'dashboard.html';
        }
      } catch (error) {
        console.error('Ошибка авторизации:', error);
        window.ZanGid.showToast(
          error.message === 'Invalid login credentials' ? t('login.invalidCredentials') : (error.message || t('common.unknownError')),
          'error'
        );
      } finally {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
      }
    });

    googleBtn.addEventListener('click', async function () {
      if (!window.supabaseClient) return;
      try {
        await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/dashboard.html'
          }
        });
      } catch (error) {
        console.error('Ошибка Google Auth:', error);
      }
    });

    renderMode();
    togglePassword.title = t('login.showPassword');
  });
})();
