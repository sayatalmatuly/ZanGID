(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var heroSearch = document.getElementById('heroSearch');
    var heroInput = document.getElementById('heroSearchInput');
    var popularChips = document.getElementById('popularChips');

    function getData(key) {
      return window.ZanGidI18n.get(key, window.ZanGid.getLanguage());
    }

    function goToChat(query) {
      if (!query) return;
      window.location.href = 'chat.html?q=' + encodeURIComponent(query);
    }

    function renderPopularChips() {
      if (!popularChips) return;
      popularChips.innerHTML = '';
      (getData('landing.popular') || []).forEach(function (item) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'chip';
        button.textContent = item.label;
        button.addEventListener('click', function () {
          goToChat(item.query);
        });
        popularChips.appendChild(button);
      });
    }

    function bindCategoryCards() {
      var categoryMap = {
        categoryProperty: 'landing.categoryQueries.property',
        categoryBusiness: 'landing.categoryQueries.business',
        categoryLabor: 'landing.categoryQueries.labor',
        categoryUtilities: 'landing.categoryQueries.utilities'
      };

      Object.keys(categoryMap).forEach(function (id) {
        var card = document.getElementById(id);
        if (!card || card.dataset.bound === 'true') return;
        card.dataset.bound = 'true';
        card.addEventListener('click', function (event) {
          event.preventDefault();
          goToChat(getData(categoryMap[id]));
        });
      });
    }

    function initAnimations() {
      var animated = document.querySelectorAll('.hero-note-card, .hero-preview, .category-card, .feature-card, .step-card');
      if (!('IntersectionObserver' in window)) return;

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        });
      }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      });

      animated.forEach(function (node, index) {
        node.style.opacity = '0';
        node.style.transform = 'translateY(18px)';
        node.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
        node.style.transitionDelay = Math.min(index * 40, 180) + 'ms';
        observer.observe(node);
      });
    }

    document.addEventListener('zangid:languagechange', function () {
      renderPopularChips();
      bindCategoryCards();
    });

    if (heroSearch) {
      heroSearch.addEventListener('submit', function (event) {
        event.preventDefault();
        goToChat(String(heroInput.value || '').trim());
      });
    }

    renderPopularChips();
    bindCategoryCards();
    initAnimations();
  });
})();
