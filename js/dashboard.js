(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.supabaseClient) return;

    var sessionData = await window.supabaseClient.auth.getSession();
    var session = sessionData && sessionData.data ? sessionData.data.session : null;
    if (!session) return;

    var user = session.user;
    var recentChatsCache = [];
    var selectedCity = '';
    var currentGreetingName = '';

    var dashboardGreeting = document.getElementById('dashboardGreeting');
    var statQuestions = document.getElementById('statQuestions');
    var statChats = document.getElementById('statChats');
    var statDays = document.getElementById('statDays');
    var recentRequestsList = document.getElementById('recentRequestsList');
    var suggestionsList = document.getElementById('suggestionsList');

    var onboardingPopup = document.getElementById('onboardingPopup');
    var onboardingName = document.getElementById('onboardingName');
    var cityChips = document.querySelectorAll('.city-chip');
    var otherCityBtn = document.getElementById('otherCityBtn');
    var onboardingOtherCity = document.getElementById('onboardingOtherCity');
    var onboardingSubmit = document.getElementById('onboardingSubmit');

    function t(key, vars) {
      return window.ZanGid.t(key, vars);
    }

    function getData(key) {
      return window.ZanGidI18n.get(key, window.ZanGid.getLanguage());
    }

    function renderSuggestions() {
      if (!suggestionsList) return;
      suggestionsList.innerHTML = '';
      (getData('dashboard.suggestions') || []).forEach(function (item) {
        var link = document.createElement('a');
        link.className = 'suggestion-chip';
        link.href = 'chat.html?q=' + encodeURIComponent(item.query);
        link.textContent = item.label;
        suggestionsList.appendChild(link);
      });
    }

    function renderCityChips() {
      cityChips.forEach(function (button) {
        var cityKey = button.dataset.city;
        button.textContent = t('common.cities.' + cityKey);
      });
    }

    function renderRecentLoading() {
      recentRequestsList.innerHTML = window.ZanGid.createSkeletonMarkup(3, 'row');
    }

    function renderRecentList() {
      if (!recentChatsCache.length) {
        recentRequestsList.innerHTML = window.ZanGid.createStateMarkup({
          type: 'empty',
          title: t('dashboard.recentEmptyTitle'),
          text: t('dashboard.recentEmptyText'),
          actionHref: 'chat.html',
          actionLabel: t('dashboard.firstQuestion')
        });
        return;
      }

      recentRequestsList.innerHTML = '';
      recentChatsCache.forEach(function (chat) {
        var card = document.createElement('a');
        card.href = 'chat.html?chat_id=' + encodeURIComponent(chat.id);
        card.className = 'recent-item';
        card.innerHTML =
          '<div class="recent-item-main">' +
            '<div class="recent-icon">ZG</div>' +
            '<div class="recent-copy">' +
              '<div class="recent-title"></div>' +
              '<div class="recent-meta"></div>' +
            '</div>' +
          '</div>' +
          '<div class="recent-action">→</div>';
        card.querySelector('.recent-title').textContent = chat.title || t('common.untitledChat');
        card.querySelector('.recent-meta').textContent = window.ZanGid.formatDate(chat.created_at, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        recentRequestsList.appendChild(card);
      });
    }

    function setGreeting(name) {
      if (!dashboardGreeting) return;
      currentGreetingName = String(name || '').trim();
      dashboardGreeting.textContent = t('dashboard.greetingFallback', { name: name });
      dashboardGreeting.classList.remove('user-identity-pending');
    }

    function bindCityChips() {
      cityChips.forEach(function (button) {
        if (button.dataset.bound === 'true') return;
        button.dataset.bound = 'true';
        button.addEventListener('click', function () {
          cityChips.forEach(function (chip) {
            chip.classList.remove('active');
          });
          button.classList.add('active');
          if (button === otherCityBtn) {
            onboardingOtherCity.style.display = 'block';
            selectedCity = onboardingOtherCity.value.trim();
          } else {
            onboardingOtherCity.style.display = 'none';
            selectedCity = button.dataset.city;
          }
        });
      });
    }

    onboardingOtherCity.addEventListener('input', function () {
      if (otherCityBtn.classList.contains('active')) {
        selectedCity = onboardingOtherCity.value.trim();
      }
    });

    onboardingSubmit.addEventListener('click', async function () {
      var name = String(onboardingName.value || '').trim();
      if (!name) {
        window.ZanGid.showToast(t('dashboard.onboardingNameRequired'), 'info');
        return;
      }

      onboardingSubmit.disabled = true;
      onboardingSubmit.textContent = t('dashboard.onboardingSaving');

      try {
        var response = await window.supabaseClient.from('users').upsert({
          id: user.id,
          name: name,
          city: selectedCity || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        if (response.error) throw response.error;

        onboardingPopup.classList.remove('show');
        setGreeting(name);
        document.querySelectorAll('.dropdown-name').forEach(function (node) {
          node.textContent = name;
          node.classList.remove('user-identity-pending');
        });
        document.querySelectorAll('.user-avatar').forEach(function (node) {
          node.textContent = window.ZanGid.getInitials(name);
          node.classList.remove('user-identity-pending');
        });
        window.ZanGid.showToast(t('dashboard.onboardingSaved'), 'success');
      } catch (error) {
        console.error('Ошибка сохранения профиля:', error);
        window.ZanGid.showToast(t('profile.saveError'), 'error');
      } finally {
        onboardingSubmit.disabled = false;
        onboardingSubmit.textContent = t('dashboard.onboardingSubmit');
      }
    });

    document.addEventListener('zangid:languagechange', function () {
      renderSuggestions();
      renderCityChips();
      renderRecentList();
      if (currentGreetingName) {
        setGreeting(currentGreetingName);
      }
      if (!onboardingSubmit.disabled) {
        onboardingSubmit.textContent = t('dashboard.onboardingSubmit');
      }
      if (!selectedCity && otherCityBtn && otherCityBtn.classList.contains('active')) {
        selectedCity = onboardingOtherCity.value.trim();
      }
    });

    bindCityChips();
    renderCityChips();
    renderSuggestions();
    renderRecentLoading();

    try {
      var profileResponse = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      var profile = profileResponse.data || null;
      var userFullName = (profile && profile.name) || user.user_metadata?.fullname || user.user_metadata?.full_name || user.email.split('@')[0];
      setGreeting(userFullName);

      if (!profile || !profile.name) {
        if (onboardingName) {
          onboardingName.value = userFullName !== user.email.split('@')[0] ? userFullName : '';
        }
        onboardingPopup.classList.add('show');
      }

      var messagesCountResponse = await window.supabaseClient
        .from('messages')
        .select('chats!inner(user_id)', { count: 'exact', head: true })
        .eq('role', 'user')
        .eq('chats.user_id', user.id);
      statQuestions.textContent = messagesCountResponse.count || 0;

      var chatsCountResponse = await window.supabaseClient
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      statChats.textContent = chatsCountResponse.count || 0;

      var diffTime = Math.abs(new Date() - new Date(user.created_at));
      statDays.textContent = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      var recentResponse = await window.supabaseClient
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      recentChatsCache = recentResponse.data || [];
      renderRecentList();
    } catch (error) {
      console.error('Ошибка дашборда:', error);
      setGreeting(user.email.split('@')[0]);
      recentRequestsList.innerHTML = window.ZanGid.createStateMarkup({
        type: 'error',
        title: t('dashboard.recentErrorTitle'),
        text: t('dashboard.recentErrorText'),
        actionHref: 'chat.html',
        actionLabel: t('nav.newChat')
      });
    }
  });
})();
