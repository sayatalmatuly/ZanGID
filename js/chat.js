/**
 * ZanGID — Логика чата
 * Интеграция с Supabase и Backend API
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {

    if (!window.supabaseClient) {
      console.warn('Supabase не инициализирован');
      return;
    }

    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return; // app.js handles redirect

    const user = session.user;
    let currentChatId = null;

    const backendUrl = ''; // тот же бэкенд, что и для /api/chat
    const CHAT_TITLE_PATH = '/api/chat-title';

    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const chatTitle = document.getElementById('chatTitle');
    const newChatBtn = document.getElementById('newChatBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const chatSidebar = document.getElementById('chatSidebar');
    const sidebarList = document.getElementById('sidebarList');

    function buildTitlePrompt(userQuestion) {
      return (
        'Придумай краткое название для чата из 3-5 слов на основе этого вопроса: ' +
        userQuestion +
        '. Только название, без кавычек и точек.'
      );
    }

    function sanitizeChatTitle(raw) {
      if (raw == null) return '';
      let s = String(raw).trim();
      const firstLine = s.split(/\r?\n/)[0] || '';
      s = firstLine.trim();
      s = s.replace(/^["«»]|["«»]$/g, '').trim();
      s = s.replace(/\.+$/g, '').trim();
      return s.slice(0, 120);
    }

    async function requestChatTitle(userQuestion) {
      const safeQ = typeof userQuestion === 'string' ? userQuestion.trim() : '';
      if (!safeQ) return null;

      const prompt = buildTitlePrompt(safeQ);
      const payload = { question: safeQ, prompt };

      const apiBase =
        (typeof window !== 'undefined' && window.ZANGID_API_BASE) || backendUrl;

      if (apiBase) {
        try {
          const base = String(apiBase).replace(/\/$/, '');
          const res = await fetch(base + CHAT_TITLE_PATH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const data = await res.json().catch(function () { return {}; });
            const t = data.title != null ? String(data.title) : '';
            const sanitized = sanitizeChatTitle(t);
            if (sanitized) return sanitized;
          }
        } catch (e) {
          console.debug('chat-title HTTP:', e);
        }
      }

      const fnName =
        (typeof window !== 'undefined' && window.ZANGID_SUPABASE_TITLE_FUNCTION) ||
        'generate-chat-title';
      try {
        const { data, error } = await window.supabaseClient.functions.invoke(fnName, {
          body: payload
        });
        if (error) return null;
        if (data == null) return null;
        const t =
          typeof data === 'string'
            ? data
            : data.title != null
              ? String(data.title)
              : '';
        return sanitizeChatTitle(t) || null;
      } catch (e) {
        console.debug('chat-title Edge Function:', e);
        return null;
      }
    }

    async function applyGeneratedChatTitle(chatId, userQuestion) {
      const title = await requestChatTitle(userQuestion);
      if (!title) return;
      try {
        const { error } = await window.supabaseClient
          .from('chats')
          .update({ title })
          .eq('id', chatId)
          .eq('user_id', user.id);
        if (error) throw error;
        if (currentChatId === chatId && chatTitle) {
          chatTitle.textContent = title;
        }
        const row = sidebarList.querySelector('[data-chat-id="' + chatId + '"] .sidebar-item-text');
        if (row) row.textContent = title;
      } catch (e) {
        console.error('Ошибка обновления названия чата:', e);
      }
    }

    // --- Загрузка истории чатов в сайдбар ---
    async function loadChats() {
      try {
        const { data: chats, error } = await window.supabaseClient
          .from('chats')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        sidebarList.innerHTML = '<div class="sidebar-label">История запросов</div>';

        if (chats && chats.length > 0) {
          chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'sidebar-item ' + (currentChatId === chat.id ? 'active' : '');
            item.dataset.chatId = chat.id;
            item.innerHTML = `
              <span class="sidebar-item-icon">💬</span>
              <span class="sidebar-item-text">${chat.title || 'Новый чат'}</span>
            `;
            
            item.addEventListener('click', () => loadChatMessages(chat.id, chat.title));
            sidebarList.appendChild(item);
          });
        } else {
          const emptyItem = document.createElement('div');
          emptyItem.style.padding = '12px 16px';
          emptyItem.style.color = 'var(--text-muted)';
          emptyItem.style.fontSize = '0.875rem';
          emptyItem.textContent = 'Здесь будет ваша история запросов';
          sidebarList.appendChild(emptyItem);
        }
      } catch (err) {
        console.error('Ошибка загрузки истории чатов:', err);
      }
    }

    // --- Загрузка сообщений конкретного чата ---
    async function loadChatMessages(chatId, title) {
      currentChatId = chatId;
      if (chatTitle) chatTitle.textContent = title || 'Новый чат';
      chatMessages.innerHTML = ''; // очистка
      
      document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.toggle('active', el.dataset.chatId === chatId);
      });

      if (window.innerWidth <= 768) {
        chatSidebar.classList.remove('open');
      }

      const typingEl = showTypingIndicator(); 

      try {
        const { data: messages, error } = await window.supabaseClient
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        removeTypingIndicator(typingEl);
        if (error) throw error;

        messages.forEach(msg => {
          if (msg.role === 'user') {
            appendUserMessage(msg.content);
          } else {
            appendAssistantMessage(msg.content);
          }
        });
        scrollToBottom();
      } catch (err) {
        removeTypingIndicator(typingEl);
        console.error('Ошибка загрузки сообщений:', err);
      }
    }

    // --- Отправка сообщения ---
    async function sendMessage() {
      const text = chatInput.value.trim();
      if (!text) return;

      appendUserMessage(text);
      chatInput.value = '';
      scrollToBottom();

      const typingEl = showTypingIndicator();

      let chatIdForTitleJob = null;

      try {
        // 1. Создаем чат, если это первое сообщение
        if (!currentChatId) {
          const { data: newChat, error: chatError } = await window.supabaseClient
            .from('chats')
            .insert([{ user_id: user.id, title: 'Новый чат' }])
            .select()
            .single();

          if (chatError) throw chatError;
          currentChatId = newChat.id;
          if (chatTitle) chatTitle.textContent = 'Новый чат';
          await loadChats();
          chatIdForTitleJob = newChat.id;
        }

        // 2. Сохраняем сообщение пользователя
        const { error: msgError } = await window.supabaseClient
          .from('messages')
          .insert([{ chat_id: currentChatId, role: 'user', content: text }]);
        
        if (msgError) throw msgError;

        if (chatIdForTitleJob) {
          const id = chatIdForTitleJob;
          const q = text;
          queueMicrotask(function () {
            applyGeneratedChatTitle(id, q);
          });
        }

        // 3. Запрос к бекэнду
        let assistantReply = "";
        
        console.log(`[API REQUEST] POST ${backendUrl}/api/chat`);
        console.log(`Request Body:`, { chat_id: currentChatId, user_id: user.id, message: text });
        
        if (backendUrl) {
           const response = await fetch(`${backendUrl}/api/chat`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ chat_id: currentChatId, user_id: user.id, message: text })
           });
           
           if (response.ok) {
             const result = await response.json();
             assistantReply = result.reply || result.message || assistantReply;
           } else {
             console.error('Ошибка бэкенда', await response.text());
             assistantReply = "Произошла ошибка при обращении к серверу ИИ.";
           }
        } else {
           // Эмуляция ответа сервера если бэкенд пустой
           await new Promise(r => setTimeout(r, 1000));
           assistantReply = "Заглушка: Бэкенд пока не подключен. Мы сохранили ваш запрос в базу данных.";
        }

        // 4. Сохранение ответа в БД
        const { error: botMsgError } = await window.supabaseClient
          .from('messages')
          .insert([{ chat_id: currentChatId, role: 'assistant', content: assistantReply }]);
          
        if (botMsgError) console.error('Ошибка сохранения ответа в БД', botMsgError);

        removeTypingIndicator(typingEl);
        appendAssistantMessage(assistantReply);
        scrollToBottom();

      } catch (err) {
        removeTypingIndicator(typingEl);
        console.error('Ошибка отправки сообщения:', err);
        appendAssistantMessage('Произошла системная ошибка. Пожалуйста, попробуйте позже.');
        scrollToBottom();
      }
    }

    if (chatSendBtn) chatSendBtn.addEventListener('click', sendMessage);

    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    // --- Новый чат ---
    if (newChatBtn) {
      newChatBtn.addEventListener('click', function () {
        currentChatId = null;
        chatMessages.innerHTML = `
          <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-muted);">
            Напишите ваш вопрос, чтобы начать новый чат
          </div>
        `;
        if (chatTitle) chatTitle.textContent = 'Новый чат';
        document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
        if (window.innerWidth <= 768) chatSidebar.classList.remove('open');
      });
    }

    // Сайдбар мобайл
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        chatSidebar.classList.toggle('open');
      });
    }

    // --- Отображение сообщений ---
    function appendUserMessage(text) {
      const msg = document.createElement('div');
      msg.className = 'message user';
      
      const avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.textContent = user.user_metadata?.fullname?.substring(0, 2).toUpperCase() || user.email.substring(0, 1).toUpperCase();

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = text;

      msg.appendChild(avatar);
      msg.appendChild(bubble);
      chatMessages.appendChild(msg);
    }

    function appendAssistantMessage(text) {
      const msg = document.createElement('div');
      msg.className = 'message bot';
      
      const avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.textContent = 'ZG';

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      
      text.split('\n').forEach(line => {
        if (line.trim()) {
           const p = document.createElement('p');
           p.style.marginBottom = '8px';
           p.textContent = line;
           bubble.appendChild(p);
        }
      });

      msg.appendChild(avatar);
      msg.appendChild(bubble);
      chatMessages.appendChild(msg);
    }

    // --- Индикатор набора ---
    function showTypingIndicator() {
      const msg = document.createElement('div');
      msg.className = 'message bot';
      msg.id = 'typingIndicator';

      const avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.textContent = 'ZG';

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      const dots = document.createElement('div');
      dots.className = 'typing-dots';
      dots.innerHTML = '<span></span><span></span><span></span>';

      bubble.appendChild(dots);
      msg.appendChild(avatar);
      msg.appendChild(bubble);
      chatMessages.appendChild(msg);

      scrollToBottom();
      return msg;
    }

    function removeTypingIndicator(el) {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }

    function scrollToBottom() {
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }

    // Инициализация
    await loadChats();
    if (!currentChatId && chatTitle) {
      chatTitle.textContent = 'Новый чат';
    }

    // Параметры URL: открыть чат из истории или вопрос с главной
    const urlParams = new URLSearchParams(window.location.search);
    const openChatId = urlParams.get('id') || urlParams.get('chat_id');
    const queryParam = urlParams.get('q');

    if (openChatId) {
      try {
        const { data: chatRow, error: openErr } = await window.supabaseClient
          .from('chats')
          .select('title')
          .eq('id', openChatId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!openErr && chatRow) {
          await loadChatMessages(openChatId, chatRow.title);
        }
      } catch (e) {
        console.error('Ошибка открытия чата по ссылке:', e);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (queryParam) {
      chatInput.value = queryParam;
      setTimeout(() => sendMessage(), 300);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (!currentChatId) {
      chatMessages.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-muted);">
          Напишите ваш вопрос, чтобы начать новый чат
        </div>
      `;
    }

  });

})();
