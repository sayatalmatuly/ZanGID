(function () {
  'use strict';

  function mondayStart(date) {
    var copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var day = copy.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return copy;
  }

  function monthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function groupKeyForChat(createdAt, now) {
    var created = new Date(createdAt);
    if (created >= mondayStart(now)) return 'week';
    if (created >= monthStart(now)) return 'month';
    return 'older';
  }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.supabaseClient) return;

    var timeline = document.getElementById('historyTimeline');
    var searchInput = document.getElementById('historySearchInput');
    var filters = document.getElementById('historyFilters');
    var renderedItems = [];
    var chatsCache = [];

    function t(key) {
      return window.ZanGid.t(key);
    }

    function getData(key) {
      return window.ZanGidI18n.get(key, window.ZanGid.getLanguage());
    }

    function renderFilters() {
      filters.innerHTML = '';
      (getData('history.filters') || []).forEach(function (label, index) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip' + (index === 0 ? ' active' : '');
        chip.textContent = label;
        filters.appendChild(chip);
      });
    }

    function formatChatDate(iso) {
      var date = new Date(iso);
      var now = new Date();
      var dayStart = function (value) {
        return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
      };
      var diffDays = Math.round((dayStart(now) - dayStart(date)) / 86400000);
      if (diffDays === 0) {
        return t('common.today') + ', ' + window.ZanGid.formatDate(date, { hour: '2-digit', minute: '2-digit' });
      }
      if (diffDays === 1) {
        return t('common.yesterday');
      }
      return window.ZanGid.formatDate(date, {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }

    function truncate(text, maxLength) {
      if (!text) return '';
      var normalized = String(text).trim();
      if (normalized.length <= maxLength) return normalized;
      return normalized.slice(0, maxLength - 1) + '…';
    }

    function renderTimeline() {
      if (!chatsCache.length) {
        timeline.innerHTML = window.ZanGid.createStateMarkup({
          type: 'empty',
          title: t('history.emptyTitle'),
          text: t('history.emptyText'),
          actionHref: 'chat.html',
          actionLabel: t('history.firstQuestion')
        });
        return;
      }

      var now = new Date();
      var buckets = { week: [], month: [], older: [] };
      chatsCache.forEach(function (chat) {
        buckets[groupKeyForChat(chat.created_at, now)].push(chat);
      });

      var labels = {
        week: t('history.groupWeek'),
        month: t('history.groupMonth'),
        older: t('history.groupOlder')
      };

      timeline.innerHTML = '';
      renderedItems = [];

      ['week', 'month', 'older'].forEach(function (key) {
        if (!buckets[key].length) return;

        var group = document.createElement('div');
        group.className = 'timeline-group';

        var title = document.createElement('div');
        title.className = 'timeline-group-title';
        title.textContent = labels[key];
        group.appendChild(title);

        var items = document.createElement('div');
        items.className = 'timeline-items';

        buckets[key].forEach(function (chat) {
          var item = document.createElement('a');
          item.className = 'timeline-item';
          item.href = 'chat.html?id=' + encodeURIComponent(chat.id);
          item.dataset.search = ((chat.title || '') + ' ' + (chat.preview || '')).toLowerCase();
          item.innerHTML =
            '<div class="timeline-info">' +
              '<h3>' + escapeHtml(chat.title || t('common.untitledChat')) + '</h3>' +
              '<div class="timeline-meta">' +
                '<span class="timeline-meta-item">' + escapeHtml(truncate(chat.preview || t('history.previewPlaceholder'), 120)) + '</span>' +
                '<span class="timeline-meta-item">' + escapeHtml(formatChatDate(chat.created_at)) + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="timeline-action">→</div>';
          items.appendChild(item);
          renderedItems.push(item);
        });

        group.appendChild(items);
        timeline.appendChild(group);
      });
    }

    function applySearch() {
      var query = String(searchInput.value || '').trim().toLowerCase();
      renderedItems.forEach(function (item) {
        item.style.display = !query || (item.dataset.search || '').indexOf(query) !== -1 ? '' : 'none';
      });
      timeline.querySelectorAll('.timeline-group').forEach(function (group) {
        var visible = Array.prototype.some.call(group.querySelectorAll('.timeline-item'), function (item) {
          return item.style.display !== 'none';
        });
        group.style.display = visible ? '' : 'none';
      });
    }

    document.addEventListener('zangid:languagechange', function () {
      renderFilters();
      renderTimeline();
      applySearch();
    });

    renderFilters();
    timeline.innerHTML = window.ZanGid.createSkeletonMarkup(3, 'row');

    try {
      var sessionData = await window.supabaseClient.auth.getSession();
      var session = sessionData && sessionData.data ? sessionData.data.session : null;
      if (!session) return;

      var chatsResponse = await window.supabaseClient
        .from('chats')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (chatsResponse.error) throw chatsResponse.error;

      var chats = chatsResponse.data || [];
      if (!chats.length) {
        chatsCache = [];
        renderTimeline();
        return;
      }

      var ids = chats.map(function (chat) { return chat.id; });
      var messagesResponse = await window.supabaseClient
        .from('messages')
        .select('chat_id, content, created_at')
        .eq('role', 'user')
        .in('chat_id', ids)
        .order('created_at', { ascending: true });
      if (messagesResponse.error) throw messagesResponse.error;

      var previews = {};
      (messagesResponse.data || []).forEach(function (message) {
        if (previews[message.chat_id]) return;
        previews[message.chat_id] = message.content;
      });

      chatsCache = chats.map(function (chat) {
        return {
          id: chat.id,
          title: chat.title,
          created_at: chat.created_at,
          preview: previews[chat.id] || ''
        };
      });
      renderTimeline();
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
      timeline.innerHTML = window.ZanGid.createStateMarkup({
        type: 'error',
        title: t('history.errorTitle'),
        text: t('history.errorText'),
        actionHref: 'chat.html',
        actionLabel: t('nav.newChat')
      });
    }

    searchInput.addEventListener('input', applySearch);
  });
})();
