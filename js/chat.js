/**
 * ZanGID — Логика чата
 * Демо-режим с заглушкой ответа бота
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    var chatInput = document.getElementById('chatInput');
    var chatSendBtn = document.getElementById('chatSendBtn');
    var chatMessages = document.getElementById('chatMessages');
    var chatTitle = document.getElementById('chatTitle');
    var newChatBtn = document.getElementById('newChatBtn');
    var sidebarToggle = document.getElementById('sidebarToggle');
    var chatSidebar = document.getElementById('chatSidebar');
    var sidebarItems = document.querySelectorAll('.sidebar-item');

    // --- Отправка сообщения ---
    function sendMessage() {
      var text = chatInput.value.trim();
      if (!text) return;

      // Добавляем сообщение пользователя
      appendMessage('user', text);
      chatInput.value = '';

      // Показываем индикатор набора
      var typingEl = showTypingIndicator();

      // TODO: Claude API - отправить запрос
      // TODO: Supabase - сохранить сообщение
      // Демо: через 1.5 секунды показываем заглушку ответа
      setTimeout(function () {
        removeTypingIndicator(typingEl);
        appendBotDemoResponse(text);
        scrollToBottom();
      }, 1500);

      scrollToBottom();
    }

    // Кнопка отправки
    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', sendMessage);
    }

    // Enter для отправки
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    // --- Создание сообщения пользователя ---
    function appendMessage(type, text) {
      var msg = document.createElement('div');
      msg.className = 'message ' + type;

      var avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.textContent = type === 'user' ? 'А' : 'ZG';

      var bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = text;

      msg.appendChild(avatar);
      msg.appendChild(bubble);
      chatMessages.appendChild(msg);
    }

    // --- Заглушка ответа бота (демо) ---
    function appendBotDemoResponse(userQuery) {
      var msg = document.createElement('div');
      msg.className = 'message bot';

      var avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.textContent = 'ZG';

      var bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      // Заголовок ответа
      var intro = document.createElement('div');
      intro.textContent = 'Спасибо за вопрос! Вот что удалось найти:';
      bubble.appendChild(intro);

      // Демо-шаги ответа
      var steps = [
        'Изучите соответствующие статьи законодательства РК по данной теме.',
        'Соберите необходимые документы и подготовьте заявление.',
        'Обратитесь в уполномоченный государственный орган или подайте заявку через портал eGov.kz.'
      ];

      steps.forEach(function (stepText, i) {
        var step = document.createElement('div');
        step.className = 'bot-step';

        var num = document.createElement('span');
        num.className = 'bot-step-number';
        num.textContent = i + 1;

        var text = document.createElement('span');
        text.className = 'bot-step-text';
        text.textContent = stepText;

        step.appendChild(num);
        step.appendChild(text);
        bubble.appendChild(step);
      });

      // Пилюльки
      var pills = document.createElement('div');
      pills.className = 'bot-pills';

      var docPill = document.createElement('span');
      docPill.className = 'pill doc';
      docPill.textContent = '📄 Законодательство РК';

      var linkPill = document.createElement('span');
      linkPill.className = 'pill link';
      linkPill.textContent = '🔗 egov.kz';

      pills.appendChild(docPill);
      pills.appendChild(linkPill);
      bubble.appendChild(pills);

      msg.appendChild(avatar);
      msg.appendChild(bubble);
      chatMessages.appendChild(msg);
    }

    // --- Индикатор набора ---
    function showTypingIndicator() {
      var msg = document.createElement('div');
      msg.className = 'message bot';
      msg.id = 'typingIndicator';

      var avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.textContent = 'ZG';

      var bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      var dots = document.createElement('div');
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

    // --- Прокрутка вниз ---
    function scrollToBottom() {
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }

    // --- Переключение сайдбара (мобилка) ---
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        chatSidebar.classList.toggle('open');
      });
    }

    // Закрытие сайдбара при клике на элемент
    sidebarItems.forEach(function (item) {
      item.addEventListener('click', function () {
        // Убираем active у всех
        sidebarItems.forEach(function (si) { si.classList.remove('active'); });
        // Ставим active на выбранный
        item.classList.add('active');

        // Обновляем заголовок чата
        var text = item.querySelector('.sidebar-item-text').textContent;
        if (chatTitle) chatTitle.textContent = text;

        // Закрываем сайдбар на мобилке
        if (window.innerWidth <= 768) {
          chatSidebar.classList.remove('open');
        }

        // TODO: Supabase - загрузить историю чатов
      });
    });

    // --- Новый чат ---
    if (newChatBtn) {
      newChatBtn.addEventListener('click', function () {
        // Очищаем сообщения
        chatMessages.innerHTML = '';
        if (chatTitle) chatTitle.textContent = 'Новый чат';

        // Убираем active у всех
        sidebarItems.forEach(function (si) { si.classList.remove('active'); });

        // Закрываем сайдбар на мобилке
        if (window.innerWidth <= 768) {
          chatSidebar.classList.remove('open');
        }
      });
    }

    // --- Проверяем query-параметр из главной ---
    var urlParams = new URLSearchParams(window.location.search);
    var queryParam = urlParams.get('q');
    if (queryParam) {
      chatInput.value = queryParam;
      // Автоматически отправляем
      setTimeout(function () {
        sendMessage();
      }, 300);
    }

    // Прокрутка вниз при загрузке
    scrollToBottom();

  });

})();
