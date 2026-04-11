/**
 * ZanGID — Логика страницы поддержки
 * FAQ-аккордеон, форма обратной связи
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    // --- FAQ — аккордеон ---
    var faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(function (item) {
      var question = item.querySelector('.faq-question');

      question.addEventListener('click', function () {
        // Если кликнутый элемент уже открыт — закрываем
        var isOpen = item.classList.contains('open');

        // Закрываем все
        faqItems.forEach(function (fi) {
          fi.classList.remove('open');
        });

        // Если не был открыт — открываем
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    });

    // --- Форма обратной связи ---
    var contactForm = document.getElementById('contactForm');

    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var name = document.getElementById('contactName').value.trim();
        var email = document.getElementById('contactEmail').value.trim();
        var message = document.getElementById('contactMessage').value.trim();

        if (!name || !email || !message) return;

        // TODO: отправка формы на бэкенд
        console.log('Форма отправлена:', { name: name, email: email, message: message });

        // Показываем уведомление
        showNotification('Сообщение отправлено! Мы ответим в ближайшее время.');

        // Очищаем форму
        contactForm.reset();
      });
    }

    // --- Временное уведомление ---
    function showNotification(text) {
      // Удаляем старое, если есть
      var existing = document.querySelector('.notification-toast');
      if (existing) existing.remove();

      var toast = document.createElement('div');
      toast.className = 'notification-toast';
      toast.textContent = text;
      toast.style.cssText = [
        'position: fixed',
        'bottom: 24px',
        'left: 50%',
        'transform: translateX(-50%) translateY(10px)',
        'background-color: var(--accent)',
        'color: #FFFFFF',
        'padding: 14px 28px',
        'border-radius: var(--radius-sm)',
        'font-size: 0.9375rem',
        'font-weight: 500',
        'z-index: 1000',
        'opacity: 0',
        'transition: opacity 0.3s, transform 0.3s'
      ].join(';');

      document.body.appendChild(toast);

      // Анимация появления
      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });

      // Убираем через 3 секунды
      setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(function () {
          toast.remove();
        }, 300);
      }, 3000);
    }

  });

})();
