/**
 * ZanGID — История чатов: загрузка из Supabase
 */

(function () {
  'use strict';

  function mondayStart(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = x.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
  }

  function monthStart(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function formatChatDate(iso) {
    var d = new Date(iso);
    var now = new Date();
    function dayStart(x) {
      return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    }
    var ds = dayStart(d);
    var ns = dayStart(now);
    var diffDays = Math.round((ns - ds) / 86400000);
    if (diffDays === 0) {
      return (
        'Сегодня, ' +
        d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      );
    }
    if (diffDays === 1) return 'Вчера';
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  function truncate(text, max) {
    if (!text) return '';
    var s = String(text).trim();
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function buildArrowSvg() {
    return (
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M5 12h14M12 5l7 7-7 7"/></svg>'
    );
  }

  function groupKeyForChat(createdAt, now) {
    var c = new Date(createdAt);
    var m0 = mondayStart(now);
    if (c >= m0) return 'week';
    var m1 = monthStart(now);
    if (c >= m1) return 'month';
    return 'older';
  }

  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.supabaseClient) return;

    var timeline = document.getElementById('historyTimeline');
    var loadingEl = document.getElementById('historyLoading');
    if (!timeline) return;

    var searchInput = document.querySelector('.history-search input');
    var renderedItems = [];

    var { data: sessionData } = await window.supabaseClient.auth.getSession();
    var session = sessionData && sessionData.session;
    if (!session) return;

    var user = session.user;

    try {
      var { data: chats, error: chatsErr } = await window.supabaseClient
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (chatsErr) throw chatsErr;

      if (loadingEl) {
        loadingEl.remove();
        loadingEl = null;
      }

      if (!chats || chats.length === 0) {
        timeline.innerHTML =
          '<div class="history-empty">' +
          '<div class="history-empty-icon">🔍</div>' +
          '<h4 class="history-empty-title">История пуста</h4>' +
          '<p class="history-empty-text">Вы ещё не задавали вопросов</p>' +
          '<a href="chat.html" class="btn btn-primary history-empty-btn">Начать</a>' +
          '</div>';
        return;
      }

      var ids = chats.map(function (c) {
        return c.id;
      });

      var firstByChat = {};
      if (ids.length > 0) {
        var { data: userMsgs, error: msgErr } = await window.supabaseClient
          .from('messages')
          .select('chat_id, content, created_at')
          .eq('role', 'user')
          .in('chat_id', ids)
          .order('created_at', { ascending: true });

        if (msgErr) throw msgErr;

        (userMsgs || []).forEach(function (m) {
          if (firstByChat[m.chat_id] == null) {
            firstByChat[m.chat_id] = m;
          }
        });
      }

      var now = new Date();
      var buckets = { week: [], month: [], older: [] };
      chats.forEach(function (chat) {
        var k = groupKeyForChat(chat.created_at, now);
        buckets[k].push(chat);
      });

      var labels = {
        week: 'На этой неделе',
        month: 'В этом месяце',
        older: 'Ранее'
      };

      timeline.innerHTML = '';
      renderedItems = [];

      ['week', 'month', 'older'].forEach(function (key) {
        var list = buckets[key];
        if (!list.length) return;

        var group = document.createElement('div');
        group.className = 'timeline-group';
        group.dataset.historyGroup = key;

        var title = document.createElement('div');
        title.className = 'timeline-group-title';
        title.textContent = labels[key];
        group.appendChild(title);

        var itemsWrap = document.createElement('div');
        itemsWrap.className = 'timeline-items';

        list.forEach(function (chat) {
          var first = firstByChat[chat.id];
          var preview = first && first.content ? first.content : '';
          var titleText = chat.title || 'Новый чат';
          var href = 'chat.html?id=' + encodeURIComponent(chat.id);

          var a = document.createElement('a');
          a.href = href;
          a.className = 'timeline-item';
          a.dataset.search =
            (titleText + ' ' + preview).toLowerCase();

          a.innerHTML =
            '<div class="timeline-info">' +
            '<h3>' +
            escapeHtml(titleText) +
            '</h3>' +
            '<div class="timeline-meta">' +
            '<span class="timeline-meta-item">💬 ' +
            escapeHtml(truncate(preview, 140) || '—') +
            '</span>' +
            '<span class="timeline-meta-item">🕒 ' +
            escapeHtml(formatChatDate(chat.created_at)) +
            '</span>' +
            '</div>' +
            '</div>' +
            '<div class="timeline-action">' +
            buildArrowSvg() +
            '</div>';

          itemsWrap.appendChild(a);
          renderedItems.push(a);
        });

        group.appendChild(itemsWrap);
        timeline.appendChild(group);
      });

      function applySearchFilter() {
        var q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
        renderedItems.forEach(function (el) {
          if (!q) {
            el.style.display = '';
            return;
          }
          var hay = el.dataset.search || '';
          el.style.display = hay.indexOf(q) !== -1 ? '' : 'none';
        });
        timeline.querySelectorAll('.timeline-group').forEach(function (g) {
          var items = g.querySelectorAll('.timeline-item');
          var any = false;
          items.forEach(function (it) {
            if (it.style.display !== 'none') any = true;
          });
          g.style.display = any ? '' : 'none';
        });
      }

      if (searchInput) {
        searchInput.addEventListener('input', applySearchFilter);
      }
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
      if (loadingEl) {
        loadingEl.textContent = 'Не удалось загрузить историю. Обновите страницу.';
      } else {
        timeline.innerHTML =
          '<p style="text-align:center;color:var(--text-muted);padding:32px;">Не удалось загрузить историю.</p>';
      }
    }
  });
})();
