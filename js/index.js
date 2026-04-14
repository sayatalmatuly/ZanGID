/**
 * ZanGID — Логика главной страницы
 * Поиск, чипы, навигация к чату
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    // --- Поиск в hero-секции ---
    var heroSearch = document.getElementById('heroSearch');
    var heroInput = document.getElementById('heroSearchInput');

    if (heroSearch) {
      heroSearch.addEventListener('submit', function (e) {
        e.preventDefault();
        var query = heroInput.value.trim();
        if (query) {
          // Переходим в чат с запросом
          window.location.href = 'chat.html?q=' + encodeURIComponent(query);
        }
      });
    }

    // --- Клик по популярным чипам ---
    var chips = document.querySelectorAll('#popularChips .chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var query = chip.getAttribute('data-query');
        if (query) {
          window.location.href = 'chat.html?q=' + encodeURIComponent(query);
        }
      });
    });

    // --- Категории с предзаполненным контекстом ---
    var categoryQueryMap = {
      categoryProperty: 'недвижимость',
      categoryBusiness: 'бизнес и предпринимательство',
      categoryLabor: 'трудовые споры',
      categoryUtilities: 'ЖКХ и коммунальные услуги'
    };

    Object.keys(categoryQueryMap).forEach(function (id) {
      var card = document.getElementById(id);
      if (!card) return;
      card.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = 'chat.html?q=' + encodeURIComponent(categoryQueryMap[id]);
      });
    });

    // --- Анимация появления при скролле ---
    var observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    };

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Элементы с анимацией появления
    var animatedElements = document.querySelectorAll('.category-card, .step-card');
    animatedElements.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      observer.observe(el);
    });

  });

})();
