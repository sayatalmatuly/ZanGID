(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.supabaseClient) {
      console.warn('Supabase не инициализирован');
      return;
    }

    var sessionData = await window.supabaseClient.auth.getSession();
    var session = sessionData && sessionData.data ? sessionData.data.session : null;
    if (!session) return;

    var user = session.user;
    var currentChatId = null;
    var chatsCache = [];
    var messagesCache = [];

    var backendUrl = typeof window.ZANGID_API_BASE === 'string' ? window.ZANGID_API_BASE : '';
    var CHAT_TITLE_PATH = '/api/chat-title';

    var chatInput = document.getElementById('chatInput');
    var chatSendBtn = document.getElementById('chatSendBtn');
    var chatMessages = document.getElementById('chatMessages');
    var chatTitle = document.getElementById('chatTitle');
    var newChatBtn = document.getElementById('newChatBtn');
    var sidebarToggle = document.getElementById('sidebarToggle');
    var chatSidebar = document.getElementById('chatSidebar');
    var sidebarList = document.getElementById('sidebarList');

    function t(key, vars) {
      return window.ZanGid.t(key, vars);
    }

    function getI18nValue(key) {
      return window.ZanGidI18n.get(key, window.ZanGid.getLanguage());
    }

    function getUntitledChatTitle() {
      return t('common.untitledChat');
    }

    function deserializeMessageContent(raw) {
      if (raw == null || typeof raw !== 'string') return raw;
      var trimmed = raw.trim();
      if (!trimmed) return '';
      if (trimmed.charAt(0) !== '{' && trimmed.charAt(0) !== '[') return raw;
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        return raw;
      }
    }

    function serializeMessageContent(content) {
      return typeof content === 'string' ? content : JSON.stringify(content);
    }

    function buildTitlePrompt(userQuestion) {
      return 'Придумай краткое название для чата из 3-5 слов на основе этого вопроса: ' + userQuestion + '. Только название, без кавычек и точек.';
    }

    function sanitizeChatTitle(raw) {
      if (raw == null) return '';
      var title = String(raw).trim();
      title = (title.split(/\r?\n/)[0] || '').trim();
      title = title.replace(/^["«»'“”„]+|["«»'“”„]+$/g, '').trim();
      title = title.replace(/[.?!]+$/g, '').trim();
      return title.slice(0, 80);
    }

    function deriveFallbackTitleFromQuestion(question) {
      var cleaned = String(question || '')
        .replace(/\s+/g, ' ')
        .replace(/[?!.]+$/g, '')
        .trim();
      if (!cleaned) return getUntitledChatTitle();
      var words = cleaned.split(' ').filter(Boolean).slice(0, 4).join(' ');
      return words ? words.charAt(0).toUpperCase() + words.slice(1) : getUntitledChatTitle();
    }

    async function requestChatTitle(userQuestion) {
      var safeQuestion = typeof userQuestion === 'string' ? userQuestion.trim() : '';
      if (!safeQuestion) return null;

      var payload = {
        question: safeQuestion,
        prompt: buildTitlePrompt(safeQuestion)
      };

      if (backendUrl) {
        try {
          var base = String(backendUrl).replace(/\/$/, '');
          var response = await fetch(base + CHAT_TITLE_PATH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            var data = await response.json().catch(function () { return {}; });
            var fetchedTitle = sanitizeChatTitle(data.title || data.message || '');
            if (fetchedTitle) return fetchedTitle;
          }
        } catch (error) {
          console.debug('chat-title HTTP:', error);
        }
      }

      var functionName = typeof window.ZANGID_SUPABASE_TITLE_FUNCTION === 'string'
        ? window.ZANGID_SUPABASE_TITLE_FUNCTION
        : 'generate-chat-title';

      try {
        var functionResponse = await window.supabaseClient.functions.invoke(functionName, {
          body: payload
        });
        if (functionResponse.error) return null;
        var edgeTitle = sanitizeChatTitle(
          typeof functionResponse.data === 'string'
            ? functionResponse.data
            : functionResponse.data && functionResponse.data.title
              ? functionResponse.data.title
              : ''
        );
        return edgeTitle || null;
      } catch (error) {
        console.debug('chat-title edge:', error);
        return null;
      }
    }

    function updateChatCacheTitle(chatId, title) {
      chatsCache = chatsCache.map(function (chat) {
        if (chat.id === chatId) {
          chat.title = title;
        }
        return chat;
      });
    }

    function setCurrentTitle(title) {
      if (!chatTitle) return;
      chatTitle.textContent = title || getUntitledChatTitle();
    }

    async function persistChatTitle(chatId, title) {
      if (!chatId || !title) return;
      try {
        var response = await window.supabaseClient
          .from('chats')
          .update({ title: title })
          .eq('id', chatId)
          .eq('user_id', user.id);
        if (response.error) throw response.error;
      } catch (error) {
        console.error('Ошибка обновления названия чата:', error);
      }
    }

    async function applyGeneratedChatTitle(chatId, userQuestion) {
      var generatedTitle = await requestChatTitle(userQuestion);
      if (!generatedTitle) return;
      updateChatCacheTitle(chatId, generatedTitle);
      if (currentChatId === chatId) {
        setCurrentTitle(generatedTitle);
      }
      await persistChatTitle(chatId, generatedTitle);
      renderSidebarList();
    }

    function renderSidebarLabel() {
      return '<div class="sidebar-label">' + t('chat.sidebarLabel') + '</div>';
    }

    function renderSidebarLoading() {
      sidebarList.innerHTML = renderSidebarLabel() + window.ZanGid.createSkeletonMarkup(4, 'row');
    }

    function renderSidebarState(type, title, text) {
      sidebarList.innerHTML = renderSidebarLabel() + window.ZanGid.createStateMarkup({
        type: type,
        compact: true,
        title: title,
        text: text
      });
    }

    function renderSidebarList() {
      sidebarList.innerHTML = renderSidebarLabel();

      if (!chatsCache.length) {
        renderSidebarState('empty', t('chat.sidebarEmptyTitle'), t('chat.sidebarEmptyText'));
        return;
      }

      chatsCache.forEach(function (chat) {
        var item = document.createElement('div');
        item.className = 'sidebar-item' + (currentChatId === chat.id ? ' active' : '');
        item.dataset.chatId = chat.id;
        item.innerHTML =
          '<div class="sidebar-item-icon">ZG</div>' +
          '<div class="sidebar-item-body">' +
            '<span class="sidebar-item-text"></span>' +
            '<span class="sidebar-item-meta"></span>' +
          '</div>';
        item.querySelector('.sidebar-item-text').textContent = chat.title || getUntitledChatTitle();
        item.querySelector('.sidebar-item-meta').textContent = window.ZanGid.formatDate(chat.created_at, {
          day: 'numeric',
          month: 'short'
        });
        item.addEventListener('click', function () {
          loadChatMessages(chat.id, chat.title);
        });
        sidebarList.appendChild(item);
      });
    }

    async function loadChats() {
      renderSidebarLoading();
      try {
        var response = await window.supabaseClient
          .from('chats')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (response.error) throw response.error;
        chatsCache = response.data || [];
        renderSidebarList();
      } catch (error) {
        console.error('Ошибка загрузки истории чатов:', error);
        renderSidebarState('error', t('chat.sidebarErrorTitle'), t('chat.sidebarErrorText'));
      }
    }

    function closeSidebarOnMobile() {
      if (window.innerWidth <= 880 && chatSidebar) {
        chatSidebar.classList.remove('open');
      }
    }

    function normalizeStringArray(value) {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value.map(function (item) {
          return String(item || '').trim();
        }).filter(Boolean);
      }
      if (typeof value === 'string') {
        return value.split(/\r?\n/).map(function (item) {
          return item.replace(/^[-•]\s*/, '').trim();
        }).filter(Boolean);
      }
      return [];
    }

    function normalizeSources(value) {
      if (!value) return [];
      if (!Array.isArray(value)) {
        return typeof value === 'string' ? [{ title: value, article: '', url: '' }] : [];
      }
      return value.map(function (item) {
        if (typeof item === 'string') {
          return { title: item, article: '', url: '' };
        }
        return {
          title: String(item.title || item.name || t('chat.sourceFallback')).trim(),
          article: String(item.article || item.meta || '').trim(),
          url: String(item.url || '').trim()
        };
      }).filter(function (item) {
        return item.title;
      });
    }

    function hasStructuredData(payload) {
      if (!payload || typeof payload !== 'object') return false;
      return Boolean(
        (payload.summary && String(payload.summary).trim()) ||
        (payload.steps && payload.steps.length) ||
        (payload.documents && payload.documents.length) ||
        (payload.sources && payload.sources.length) ||
        (payload.disclaimer && String(payload.disclaimer).trim())
      );
    }

    function normalizeStructuredObject(value) {
      if (!value) return null;

      if (Array.isArray(value)) {
        if (value.every(function (item) { return typeof item === 'string'; })) {
          return { steps: normalizeStringArray(value) };
        }

        var arrayPayload = {
          summary: '',
          steps: [],
          documents: [],
          sources: [],
          disclaimer: ''
        };

        value.forEach(function (item) {
          if (!item || typeof item !== 'object') return;
          var type = String(item.type || item.kind || '').toLowerCase();
          if (type === 'summary' || type === 'short_answer') {
            arrayPayload.summary = String(item.content || item.text || item.value || '').trim();
          }
          if (type === 'steps') {
            arrayPayload.steps = normalizeStringArray(item.items || item.steps || item.content || item.value);
          }
          if (type === 'documents') {
            arrayPayload.documents = normalizeStringArray(item.items || item.documents || item.content || item.value);
          }
          if (type === 'sources') {
            arrayPayload.sources = normalizeSources(item.items || item.sources || item.content || item.value);
          }
          if (type === 'disclaimer' || type === 'note') {
            arrayPayload.disclaimer = String(item.content || item.text || item.value || '').trim();
          }
        });

        return hasStructuredData(arrayPayload) ? arrayPayload : null;
      }

      if (typeof value !== 'object') return null;

      var structured = {
        summary: String(value.summary || value.shortAnswer || value.short_answer || value.answer || '').trim(),
        steps: normalizeStringArray(value.steps || value.instructions || value.step_by_step || value.actions),
        documents: normalizeStringArray(value.documents || value.required_documents || value.docs),
        sources: normalizeSources(value.sources || value.legal_basis || value.references),
        disclaimer: String(value.disclaimer || value.note || value.important_note || value.important || '').trim()
      };

      return hasStructuredData(structured) ? structured : null;
    }

    function parsePlainText(text) {
      var normalized = String(text || '').replace(/\r/g, '').trim();
      if (!normalized) return { paragraphs: [] };

      var lines = normalized.split('\n');
      var intro = [];
      var steps = [];
      var currentStep = null;

      lines.forEach(function (line) {
        var trimmed = line.trim();
        var numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);

        if (numbered) {
          if (currentStep) {
            steps.push(currentStep.trim());
          }
          currentStep = numbered[2].trim();
          return;
        }

        if (currentStep) {
          if (trimmed) {
            currentStep += ' ' + trimmed;
          } else {
            steps.push(currentStep.trim());
            currentStep = null;
          }
          return;
        }

        if (trimmed) {
          intro.push(trimmed);
        }
      });

      if (currentStep) {
        steps.push(currentStep.trim());
      }

      if (steps.length >= 1) {
        return {
          summary: intro.join(' '),
          steps: steps
        };
      }

      return {
        paragraphs: normalized.split(/\n{2,}/).map(function (chunk) {
          return chunk.trim();
        }).filter(Boolean)
      };
    }

    function normalizeAssistantPayload(content) {
      var parsed = deserializeMessageContent(content);
      var structured = normalizeStructuredObject(parsed);
      if (structured) return structured;
      if (typeof parsed === 'string') return parsePlainText(parsed);
      return { paragraphs: [String(content || '')] };
    }

    function createParagraphs(paragraphs) {
      var wrapper = document.createElement('div');
      (paragraphs || []).forEach(function (text) {
        if (!text) return;
        var paragraph = document.createElement('p');
        paragraph.textContent = text;
        wrapper.appendChild(paragraph);
      });
      return wrapper;
    }

    function createSection(title) {
      var section = document.createElement('section');
      section.className = 'assistant-section';

      var heading = document.createElement('div');
      heading.className = 'assistant-section-title';
      heading.textContent = title;
      section.appendChild(heading);
      return section;
    }

    function createStepsSection(steps) {
      var section = createSection(t('chat.steps'));
      var list = document.createElement('div');
      list.className = 'assistant-step-list';

      (steps || []).forEach(function (step, index) {
        var row = document.createElement('div');
        row.className = 'assistant-step-row';

        var badge = document.createElement('span');
        badge.className = 'assistant-step-badge';
        badge.textContent = String(index + 1);

        var text = document.createElement('div');
        text.className = 'assistant-step-text';
        text.textContent = step;

        row.appendChild(badge);
        row.appendChild(text);
        list.appendChild(row);
      });

      section.appendChild(list);
      return section;
    }

    function createDocumentsSection(documents) {
      var section = createSection(t('chat.documents'));
      var list = document.createElement('div');
      list.className = 'assistant-doc-list';

      (documents || []).forEach(function (documentItem) {
        var item = document.createElement('div');
        item.className = 'assistant-doc-item';
        item.textContent = documentItem;
        list.appendChild(item);
      });

      section.appendChild(list);
      return section;
    }

    function createSourcesSection(sources) {
      var section = createSection(t('chat.sources'));
      var list = document.createElement('div');
      list.className = 'assistant-source-list';

      (sources || []).forEach(function (source) {
        var item = document.createElement('div');
        item.className = 'assistant-source-item';

        var title = document.createElement('span');
        title.className = 'assistant-source-title';
        title.textContent = source.title;
        item.appendChild(title);

        if (source.article) {
          var meta = document.createElement('span');
          meta.className = 'assistant-source-meta';
          meta.textContent = source.article;
          item.appendChild(meta);
        }

        if (source.url && source.url !== '#') {
          var link = document.createElement('a');
          link.className = 'assistant-source-link';
          link.href = source.url;
          link.target = '_blank';
          link.rel = 'noreferrer noopener';
          link.textContent = source.url;
          item.appendChild(link);
        }

        list.appendChild(item);
      });

      section.appendChild(list);
      return section;
    }

    function renderAssistantPayload(payload) {
      var wrapper = document.createElement('div');
      wrapper.className = 'assistant-content';

      if (payload.summary) {
        var summarySection = createSection(t('chat.shortAnswer'));
        var summary = document.createElement('div');
        summary.className = 'assistant-summary';
        summary.textContent = payload.summary;
        summarySection.appendChild(summary);
        wrapper.appendChild(summarySection);
      }

      if (payload.paragraphs && payload.paragraphs.length) {
        wrapper.appendChild(createParagraphs(payload.paragraphs));
      }

      if (payload.steps && payload.steps.length) {
        wrapper.appendChild(createStepsSection(payload.steps));
      }

      if (payload.documents && payload.documents.length) {
        wrapper.appendChild(createDocumentsSection(payload.documents));
      }

      if (payload.sources && payload.sources.length) {
        wrapper.appendChild(createSourcesSection(payload.sources));
      }

      if (payload.disclaimer) {
        var noteSection = createSection(t('chat.important'));
        var note = document.createElement('div');
        note.className = 'assistant-note';
        note.textContent = payload.disclaimer;
        noteSection.appendChild(note);
        wrapper.appendChild(noteSection);
      }

      if (!wrapper.childNodes.length) {
        wrapper.appendChild(createParagraphs([String(payload.raw || '')]));
      }

      return wrapper;
    }

    function createMessageElement(role, content) {
      var message = document.createElement('article');
      message.className = 'message ' + role;

      var avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.textContent = role === 'user'
        ? window.ZanGid.getInitials(user.user_metadata?.fullname || user.email || 'U')
        : 'ZG';

      var card = document.createElement('div');
      card.className = 'message-card';

      var label = document.createElement('div');
      label.className = 'message-label';
      label.textContent = role === 'user' ? t('chat.you') : t('chat.assistant');

      var bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      if (role === 'assistant') {
        bubble.appendChild(renderAssistantPayload(normalizeAssistantPayload(content)));
      } else {
        bubble.appendChild(createParagraphs(String(content || '').split(/\n{2,}/)));
      }

      card.appendChild(label);
      card.appendChild(bubble);
      message.appendChild(avatar);
      message.appendChild(card);

      return message;
    }

    function rerenderMessages() {
      if (!messagesCache.length) {
        renderEmptyChat();
        return;
      }

      chatMessages.innerHTML = '';
      messagesCache.forEach(function (message) {
        chatMessages.appendChild(createMessageElement(message.role, message.content));
      });
      scrollToBottom();
    }

    function appendMessage(role, content, pushToCache) {
      chatMessages.appendChild(createMessageElement(role, content));
      if (pushToCache !== false) {
        messagesCache.push({ role: role, content: content });
      }
    }

    function renderEmptyChat() {
      messagesCache = [];
      chatMessages.innerHTML = '';

      var emptyState = document.createElement('div');
      emptyState.className = 'chat-empty';

      var title = document.createElement('h2');
      title.textContent = t('chat.emptyTitle');
      emptyState.appendChild(title);

      var text = document.createElement('p');
      text.textContent = t('chat.emptyText');
      emptyState.appendChild(text);

      var label = document.createElement('div');
      label.className = 'chat-empty-label';
      label.textContent = t('chat.emptySuggestionLabel');
      emptyState.appendChild(label);

      var actions = document.createElement('div');
      actions.className = 'chat-empty-actions';

      (getI18nValue('chat.emptyStateSuggestions') || []).forEach(function (query) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'chat-suggestion-btn';
        button.textContent = query;
        button.addEventListener('click', function () {
          chatInput.value = query;
          autoResizeTextarea();
          chatInput.focus();
        });
        actions.appendChild(button);
      });

      emptyState.appendChild(actions);
      chatMessages.appendChild(emptyState);
    }

    function renderMessagesLoading() {
      chatMessages.innerHTML = window.ZanGid.createSkeletonMarkup(3, 'row');
    }

    async function loadChatMessages(chatId, title) {
      currentChatId = chatId;
      setCurrentTitle(title || getUntitledChatTitle());
      renderMessagesLoading();
      renderSidebarList();
      closeSidebarOnMobile();

      try {
        var response = await window.supabaseClient
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (response.error) throw response.error;

        messagesCache = (response.data || []).map(function (message) {
          return {
            role: message.role,
            content: deserializeMessageContent(message.content)
          };
        });

        rerenderMessages();
      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
        chatMessages.innerHTML = window.ZanGid.createStateMarkup({
          type: 'error',
          title: t('chat.systemError'),
          text: t('chat.sidebarErrorText')
        });
      }
    }

    function showTypingIndicator() {
      var message = document.createElement('article');
      message.className = 'message assistant';
      message.id = 'typingIndicator';

      var avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.textContent = 'ZG';

      var card = document.createElement('div');
      card.className = 'message-card';

      var label = document.createElement('div');
      label.className = 'message-label';
      label.textContent = t('chat.typing');

      var bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.innerHTML = '<div class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';

      card.appendChild(label);
      card.appendChild(bubble);
      message.appendChild(avatar);
      message.appendChild(card);
      chatMessages.appendChild(message);

      scrollToBottom();
      return message;
    }

    function removeTypingIndicator(node) {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }

    function scrollToBottom() {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function autoResizeTextarea() {
      if (!chatInput) return;
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 180) + 'px';
    }

    function createStubReply() {
      return {
        type: 'structured',
        summary: t('chat.backendStubSummary'),
        steps: getI18nValue('chat.backendStubSteps') || [],
        documents: getI18nValue('chat.backendStubDocuments') || [],
        sources: getI18nValue('chat.backendStubSources') || [],
        disclaimer: t('chat.disclaimer')
      };
    }

    async function sendMessage() {
      var text = String(chatInput.value || '').trim();
      if (!text) return;

      appendMessage('user', text);
      chatInput.value = '';
      autoResizeTextarea();
      scrollToBottom();

      var typingIndicator = showTypingIndicator();
      var titleJobChatId = null;

      try {
        if (!currentChatId) {
          var pendingTitle = t('common.generatingTitle');
          var chatInsert = await window.supabaseClient
            .from('chats')
            .insert([{ user_id: user.id, title: pendingTitle }])
            .select()
            .single();

          if (chatInsert.error) throw chatInsert.error;

          currentChatId = chatInsert.data.id;
          titleJobChatId = currentChatId;
          chatsCache.unshift(chatInsert.data);
          updateChatCacheTitle(currentChatId, pendingTitle);
          setCurrentTitle(pendingTitle);
          renderSidebarList();
          window.ZanGid.showToast(t('chat.titleCreated'), 'success');
        }

        var userMessageInsert = await window.supabaseClient
          .from('messages')
          .insert([{ chat_id: currentChatId, role: 'user', content: text }]);

        if (userMessageInsert.error) throw userMessageInsert.error;

        if (titleJobChatId) {
          var fallbackTitle = deriveFallbackTitleFromQuestion(text);
          updateChatCacheTitle(titleJobChatId, fallbackTitle);
          if (currentChatId === titleJobChatId) {
            setCurrentTitle(fallbackTitle);
          }
          renderSidebarList();
          persistChatTitle(titleJobChatId, fallbackTitle);
          setTimeout(function () {
            applyGeneratedChatTitle(titleJobChatId, text);
          }, 0);
        }

        var assistantReply = '';

        if (backendUrl) {
          var response = await fetch(String(backendUrl).replace(/\/$/, '') + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: currentChatId,
              user_id: user.id,
              message: text
            })
          });

          if (response.ok) {
            var result = await response.json().catch(function () { return {}; });
            assistantReply = result.reply !== undefined
              ? result.reply
              : result.message !== undefined
                ? result.message
                : result;
          } else {
            assistantReply = t('chat.systemError');
          }
        } else {
          await new Promise(function (resolve) { setTimeout(resolve, 900); });
          assistantReply = createStubReply();
        }

        var assistantInsert = await window.supabaseClient
          .from('messages')
          .insert([{ chat_id: currentChatId, role: 'assistant', content: serializeMessageContent(assistantReply) }]);

        if (assistantInsert.error) {
          console.error('Ошибка сохранения ответа:', assistantInsert.error);
        }

        removeTypingIndicator(typingIndicator);
        appendMessage('assistant', assistantReply);
        scrollToBottom();
      } catch (error) {
        removeTypingIndicator(typingIndicator);
        console.error('Ошибка отправки сообщения:', error);
        appendMessage('assistant', t('chat.systemError'));
        scrollToBottom();
      }
    }

    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', sendMessage);
    }

    if (chatInput) {
      chatInput.addEventListener('input', autoResizeTextarea);
      chatInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          sendMessage();
        }
      });
      autoResizeTextarea();
    }

    if (newChatBtn) {
      newChatBtn.addEventListener('click', function () {
        currentChatId = null;
        messagesCache = [];
        setCurrentTitle(getUntitledChatTitle());
        renderSidebarList();
        document.querySelectorAll('.sidebar-item').forEach(function (item) {
          item.classList.remove('active');
        });
        renderEmptyChat();
        closeSidebarOnMobile();
      });
    }

    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        if (chatSidebar) {
          chatSidebar.classList.toggle('open');
        }
      });
    }

    document.addEventListener('zangid:languagechange', function () {
      renderSidebarList();
      if (!messagesCache.length) {
        renderEmptyChat();
      } else {
        rerenderMessages();
      }
      if (!currentChatId) {
        setCurrentTitle(getUntitledChatTitle());
      }
      autoResizeTextarea();
    });

    await loadChats();
    setCurrentTitle(getUntitledChatTitle());

    var urlParams = new URLSearchParams(window.location.search);
    var openChatId = urlParams.get('id') || urlParams.get('chat_id');
    var queryParam = urlParams.get('q');

    if (openChatId) {
      try {
        var chatRow = await window.supabaseClient
          .from('chats')
          .select('title')
          .eq('id', openChatId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!chatRow.error && chatRow.data) {
          await loadChatMessages(openChatId, chatRow.data.title);
        }
      } catch (error) {
        console.error('Ошибка открытия чата по ссылке:', error);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      renderEmptyChat();
      if (queryParam && chatInput) {
        chatInput.value = queryParam;
        autoResizeTextarea();
        chatInput.focus();
      }
    }
  });
})();
