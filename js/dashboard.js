/**
 * ZanGID — Логика дашборда
 * Загрузка статистики, недавних чатов и Onboarding Popup
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.supabaseClient) return;

    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return; // app.js handles redirect

    const user = session.user;

    // Элементы
    const dashboardGreeting = document.getElementById('dashboardGreeting');
    const statQuestions = document.getElementById('statQuestions');
    const statChats = document.getElementById('statChats');
    const statDays = document.getElementById('statDays');
    const recentRequestsList = document.getElementById('recentRequestsList');

    // Onboarding Elements
    const onboardingPopup = document.getElementById('onboardingPopup');
    const onboardingName = document.getElementById('onboardingName');
    const cityChips = document.querySelectorAll('.city-chip');
    const otherCityBtn = document.getElementById('otherCityBtn');
    const onboardingOtherCity = document.getElementById('onboardingOtherCity');
    const onboardingSubmit = document.getElementById('onboardingSubmit');

    let selectedCity = '';

    try {
      // 1. Проверяем профиль пользователя (Onboarding)
      let { data: profile, error } = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const userFullName = profile?.name || session.user.user_metadata?.fullname || session.user.user_metadata?.full_name || session.user.email.split('@')[0];

      if (dashboardGreeting) {
        dashboardGreeting.textContent = `С возвращением, ${userFullName}! 👋`;
      }

      if (!profile || !profile.name) {
        // Показать онбординг, так как имя отсутствует
        if (onboardingName) {
           onboardingName.value = userFullName !== session.user.email.split('@')[0] ? userFullName : '';
        }
        onboardingPopup.classList.add('show');
      }

      // 2. Статистика
      // Задано вопросов (сообщения от пользователя)
      let { count: msgsCount, error: msgErr } = await window.supabaseClient
        .from('messages')
        .select('chats!inner(user_id)', { count: 'exact', head: true })
        .eq('role', 'user')
        .eq('chats.user_id', user.id);
      
      if (!msgErr && statQuestions) statQuestions.textContent = msgsCount || 0;

      // Активных чатов
      let { count: chatsCount, error: chatsCountErr } = await window.supabaseClient
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!chatsCountErr && statChats) statChats.textContent = chatsCount || 0;

      // Дней с нами (разница между created_at и сегодня)
      if (statDays) {
        const userCreatedAt = new Date(user.created_at);
        const diffTime = Math.abs(new Date() - userCreatedAt);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        statDays.textContent = diffDays;
      }

      // 3. Недавние запросы
      let { data: recentChats, error: chatsErr } = await window.supabaseClient
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!chatsErr && recentRequestsList) {
        recentRequestsList.innerHTML = '';
        if (recentChats && recentChats.length > 0) {
          recentChats.forEach(chat => {
            const date = new Date(chat.created_at);
            const dateString = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            
            const a = document.createElement('a');
            a.href = `chat.html?chat_id=${chat.id}`;
            a.className = 'recent-item';
            a.innerHTML = `
              <div class="recent-item-main">
                <div class="recent-icon">💬</div>
                <div>
                  <div class="recent-title">${chat.title || 'Новый чат'}</div>
                  <div class="recent-meta">
                    <span>${dateString}</span>
                  </div>
                </div>
              </div>
              <div class="recent-action">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            `;
            // Для совместимости мы просто отправляем в chat.html, по ТЗ `chat.html?q=` работает, 
            // но мы можем и без параметра, чат в сайдбаре загрузится.
            recentRequestsList.appendChild(a);
          });
        } else {
          recentRequestsList.innerHTML = `
            <div style="padding: 32px 20px; text-align: center;">
              <div style="font-size: 2rem; margin-bottom: 12px; color: var(--text-muted);">🔍</div>
              <h4 style="margin-bottom: 4px; font-weight: 500;">Вы ещё ничем не интересовались</h4>
              <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 16px;">Вся история ваших запросов будет сохранена здесь</p>
              <a href="chat.html" class="btn btn-primary" style="padding: 10px 20px; font-size: 0.875rem;">Задать первый вопрос</a>
            </div>
          `;
        }
      }

    } catch (err) {
      console.error('Ошибка дашборда:', err);
    }

    // --- Onboarding Logic ---
    cityChips.forEach(btn => {
      btn.addEventListener('click', () => {
        // Убираем активный класс со всех
        cityChips.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        
        if (btn.id === 'otherCityBtn') {
          onboardingOtherCity.style.display = 'block';
          selectedCity = onboardingOtherCity.value;
        } else {
          onboardingOtherCity.style.display = 'none';
          selectedCity = btn.textContent;
        }
      });
    });

    onboardingOtherCity.addEventListener('input', (e) => {
      if (otherCityBtn.classList.contains('active')) {
        selectedCity = e.target.value.trim();
      }
    });

    onboardingSubmit.addEventListener('click', async () => {
      const name = onboardingName.value.trim();
      if (!name) {
        alert('Пожалуйста, введите ваше имя');
        return;
      }

      onboardingSubmit.textContent = 'Сохранение...';
      onboardingSubmit.disabled = true;

      try {
        const { error } = await window.supabaseClient.from('users').upsert({
          id: user.id,
          name: name,
          city: selectedCity || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
        if (error) throw error;

        // Успешно сохранено
        onboardingPopup.classList.remove('show');
        if (dashboardGreeting) {
          dashboardGreeting.textContent = `С возвращением, ${name}! 👋`;
        }
        document.querySelectorAll('.dropdown-name').forEach(el => el.textContent = name);
        document.querySelectorAll('.user-avatar').forEach(el => el.textContent = name.substring(0, 2).toUpperCase());
        
      } catch (err) {
        console.error('Ошибка сохранения профиля:', err);
        alert('Произошла ошибка при сохранении данных');
      } finally {
        onboardingSubmit.textContent = 'Продолжить';
        onboardingSubmit.disabled = false;
      }
    });

  });
})();
