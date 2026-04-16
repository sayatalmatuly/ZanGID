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
    var settingCity = document.getElementById('settingCity');
    var settingLanguage = document.getElementById('settingLanguage');
    var presetCityKeys = ['almaty', 'astana', 'shymkent', 'karaganda', 'atyrau', 'aktobe', 'pavlodar'];
    var customCityValue = '';

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

    async function saveProfile() {
      try {
        var storedCity = getPersistedCityValue();
        var response = await window.supabaseClient.from('users').upsert({
          id: user.id,
          name: profileName.textContent,
          city: storedCity,
          language: settingLanguage.value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        if (response.error) throw response.error;

        syncProfileCityDisplay(storedCity || '');
        window.ZanGid.showToast(t('profile.saveSuccess'), 'success');
      } catch (error) {
        console.error('Ошибка сохранения профиля:', error);
        window.ZanGid.showToast(t('profile.saveError'), 'error');
      }
    }

    document.addEventListener('zangid:languagechange', function () {
      renderCityOptions();
      if (!settingLanguage.matches(':focus')) {
        settingLanguage.value = window.ZanGid.getLanguage();
      }
      syncProfileCityDisplay(profileCity.dataset.cityKey || profileCity.dataset.cityCustom || '');
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
      profileName.textContent = fullName;
      profileName.classList.remove('user-identity-pending');

      profileAvatar.textContent = window.ZanGid.getInitials(fullName);
      profileAvatar.classList.remove('user-identity-pending');

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
      profileName.textContent = user.email.split('@')[0];
      profileName.classList.remove('user-identity-pending');
      profileAvatar.textContent = window.ZanGid.getInitials(user.email.split('@')[0]);
      profileAvatar.classList.remove('user-identity-pending');
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
