/**
 * ZanGID — Логика страницы «О нас»
 * Анимации при скролле
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    // --- Анимация появления элементов при скролле ---
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

    var animatedElements = document.querySelectorAll('.about-step, .disclaimer-card, .mission-content');
    animatedElements.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      observer.observe(el);
    });

  });

})();
