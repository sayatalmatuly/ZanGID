(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.supabaseClient) return;

    var sessionData = await window.supabaseClient.auth.getSession();
    var session = sessionData && sessionData.data ? sessionData.data.session : null;
    if (!session) return;

    var user = session.user;

    var toggleThemeEl = document.getElementById('toggleTheme');
    var toggleNotifications = document.getElementById('toggleNotifications');
    var settingName = document.getElementById('settingName');
    var saveNameBtn = document.getElementById('saveNameBtn');
    var settingCity = document.getElementById('settingCity');
    var settingLanguage = document.getElementById('settingLanguage');
    var presetCityKeys = ['almaty', 'astana', 'shymkent', 'karaganda', 'atyrau', 'aktobe', 'pavlodar'];
    var customCityValue = '';
    var currentName = '';

    var profileName = document.getElementById('profileName');
    var profileAvatar = document.getElementById('profileAvatar');
    var profileCity = document.getElementById('profileCity');
    var statQueries = document.getElementById('statQueries');
    var statTopics = document.getElementById('statTopics');

    function t(key) {
      return window.ZanGid.t(key);
    }

    function isPresetCityKey(value) {
      return presetCityKeys.indexOf(String(value || '')) !== -1;
    }

    function getNameValue() {
      return String(settingName.value || '').trim();
    }

    function syncNameDisplay(value) {
      var name = String(value || '').trim() || user.email.split('@')[0];
      currentName = name;

      profileName.textContent = name;
      profileName.classList.remove('user-identity-pending');

      profileAvatar.textContent = window.ZanGid.getInitials(name);
      profileAvatar.classList.remove('user-identity-pending');

      if (settingName && document.activeElement !== settingName) {
        settingName.value = name;
      }

      document.querySelectorAll('.dropdown-name').forEach(function (node) {
        node.textContent = name;
        node.classList.remove('user-identity-pending');
      });
      document.querySelectorAll('.user-avatar').forEach(function (node) {
        node.textContent = window.ZanGid.getInitials(name);
        node.classList.remove('user-identity-pending');
      });
    }

    function renderCityOptions() {
      if (settingCity.options[0]) {
        settingCity.options[0].textContent = t('profile.citySelectPlaceholder');
      }
      ['almaty', 'astana', 'shymkent', 'karaganda', 'atyrau', 'aktobe', 'pavlodar', 'other'].forEach(function (cityKey, index) {
        if (settingCity.options[index + 1]) {
          settingCity.options[index + 1].textContent = t('common.cities.' + cityKey);
        }
      });
      settingLanguage.options[0].textContent = 'Русский';
      settingLanguage.options[1].textContent = 'Қазақша';
    }

    function syncProfileCityDisplay(value) {
      var cityValue = String(value || '').trim();
      delete profileCity.dataset.cityKey;
      delete profileCity.dataset.cityCustom;

      if (!cityValue) {
        profileCity.textContent = t('profile.cityPlaceholder');
        return;
      }

      if (isPresetCityKey(cityValue) || cityValue === 'other') {
        profileCity.dataset.cityKey = cityValue;
        profileCity.textContent = t('common.cities.' + cityValue);
        return;
      }

      profileCity.dataset.cityCustom = cityValue;
      profileCity.textContent = cityValue;
    }

    function getPersistedCityValue() {
      var selectedValue = String(settingCity.value || '').trim();
      if (!selectedValue) return null;
      if (selectedValue === 'other') {
        return customCityValue || null;
      }
      return selectedValue;
    }

    async function saveProfile(options) {
      var settings = options || {};
      try {
        var nextName = getNameValue() || currentName;
        if (!nextName) {
          window.ZanGid.showToast(t('profile.nameRequired'), 'info');
          return false;
        }

        if (saveNameBtn && settings.lockNameButton) {
          saveNameBtn.disabled = true;
          saveNameBtn.textContent = t('common.saving');
        }

        var storedCity = getPersistedCityValue();
        var response = await window.supabaseClient.from('users').upsert({
          id: user.id,
          name: nextName,
          city: storedCity,
          language: settingLanguage.value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        if (response.error) throw response.error;

        syncNameDisplay(nextName);
        syncProfileCityDisplay(storedCity || '');
        if (settings.showToast !== false) {
          window.ZanGid.showToast(t('profile.saveSuccess'), 'success');
        }
        return true;
      } catch (error) {
        console.error('Ошибка сохранения профиля:', error);
        window.ZanGid.showToast(t('profile.saveError'), 'error');
        return false;
      } finally {
        if (saveNameBtn) {
          saveNameBtn.disabled = false;
          saveNameBtn.textContent = t('profile.saveName');
        }
      }
    }

    document.addEventListener('zangid:languagechange', function () {
      renderCityOptions();
      if (!settingLanguage.matches(':focus')) {
        settingLanguage.value = window.ZanGid.getLanguage();
      }
      if (saveNameBtn) {
        saveNameBtn.textContent = t('profile.saveName');
      }
      syncProfileCityDisplay(profileCity.dataset.cityKey || profileCity.dataset.cityCustom || '');
      syncNameDisplay(currentName);
    });

    renderCityOptions();
    settingLanguage.value = window.ZanGid.getLanguage();

    try {
      var profileResponse = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      var profile = profileResponse.data || null;
      var fullName = (profile && profile.name) || user.user_metadata?.fullname || user.email.split('@')[0];
      syncNameDisplay(fullName);

      if (profile && profile.city) {
        if (isPresetCityKey(profile.city)) {
          settingCity.value = profile.city;
        } else {
          customCityValue = profile.city;
          settingCity.value = 'other';
        }
        syncProfileCityDisplay(profile.city);
      } else {
        settingCity.value = '';
        syncProfileCityDisplay('');
      }
      profileCity.classList.remove('user-identity-pending');

      if (profile && profile.language) {
        settingLanguage.value = profile.language;
      }

      var chatsCountResponse = await window.supabaseClient
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      statQueries.textContent = chatsCountResponse.count || 0;
      statQueries.classList.remove('user-identity-pending');

      var messagesCountResponse = await window.supabaseClient
        .from('messages')
        .select('chats!inner(*)', { count: 'exact', head: true })
        .eq('chats.user_id', user.id);
      statTopics.textContent = messagesCountResponse.count || 0;
      statTopics.classList.remove('user-identity-pending');
    } catch (error) {
      console.error('Ошибка профиля:', error);
      syncNameDisplay(user.email.split('@')[0]);
      profileCity.textContent = t('profile.cityPlaceholder');
      profileCity.classList.remove('user-identity-pending');
      statQueries.textContent = '—';
      statTopics.textContent = '—';
      statQueries.classList.remove('user-identity-pending');
      statTopics.classList.remove('user-identity-pending');
      window.ZanGid.showToast(t('profile.loadError'), 'error');
    }

    settingCity.addEventListener('change', function () {
      if (settingCity.value !== 'other') {
        customCityValue = '';
      }
      syncProfileCityDisplay(getPersistedCityValue() || '');
      saveProfile();
    });

    if (saveNameBtn) {
      saveNameBtn.addEventListener('click', function () {
        saveProfile({ lockNameButton: true });
      });
    }

    if (settingName) {
      settingName.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          saveProfile({ lockNameButton: true });
        }
      });
    }

    settingLanguage.addEventListener('change', function () {
      window.ZanGid.setLanguage(settingLanguage.value);
      saveProfile();
    });

    if (toggleThemeEl) {
      if (window.ZanGid.isDarkTheme()) toggleThemeEl.classList.add('active');
      toggleThemeEl.addEventListener('click', function () {
        window.ZanGid.toggleTheme();
      });
    }

    if (toggleNotifications) {
      var saved = localStorage.getItem('zangid-notifications');
      if (saved === 'true') toggleNotifications.classList.add('active');
      toggleNotifications.addEventListener('click', function () {
        toggleNotifications.classList.toggle('active');
        localStorage.setItem('zangid-notifications', String(toggleNotifications.classList.contains('active')));
      });
    }
  });
})();
