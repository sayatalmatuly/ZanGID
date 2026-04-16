(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var faqItems = document.querySelectorAll('.faq-item');
    var contactForm = document.getElementById('contactForm');
    var contactSubmit = document.getElementById('contactSubmit');
    var contactStatus = document.getElementById('contactStatus');

    function t(key) {
      return window.ZanGid.t(key);
    }

    function renderContactState(options) {
      if (!contactStatus) return;
      contactStatus.dataset.state = options && options.stateKey ? options.stateKey : '';
      contactStatus.innerHTML = window.ZanGid.createStateMarkup(options);
    }

    faqItems.forEach(function (item) {
      var question = item.querySelector('.faq-question');
      question.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        faqItems.forEach(function (node) {
          node.classList.remove('open');
        });
        if (!isOpen) item.classList.add('open');
      });
    });

    if (contactForm) {
      contactForm.addEventListener('submit', function (event) {
        event.preventDefault();

        var name = String(document.getElementById('contactName').value || '').trim();
        var email = String(document.getElementById('contactEmail').value || '').trim();
        var message = String(document.getElementById('contactMessage').value || '').trim();
        if (!name || !email || !message) {
          renderContactState({
            stateKey: 'error',
            type: 'error',
            compact: true,
            title: t('support.formErrorTitle'),
            text: t('support.formError')
          });
          return;
        }

        contactSubmit.disabled = true;
        contactSubmit.textContent = t('common.sending');
        renderContactState({
          stateKey: 'loading',
          compact: true,
          title: t('support.formLoadingTitle'),
          text: t('support.formLoadingText')
        });

        setTimeout(function () {
          window.ZanGid.showToast(t('support.formSuccess'), 'success');
          contactForm.reset();
          renderContactState({
            stateKey: 'success',
            type: 'empty',
            compact: true,
            title: t('support.formSuccessTitle'),
            text: t('support.formSuccess')
          });
          contactSubmit.disabled = false;
          contactSubmit.textContent = t('support.sendButton');
        }, 700);
      });
    }

    document.addEventListener('zangid:languagechange', function () {
      if (!contactSubmit.disabled) {
        contactSubmit.textContent = t('support.sendButton');
      }
      if (!contactStatus || !contactStatus.dataset.state) return;

      if (contactStatus.dataset.state === 'loading') {
        renderContactState({
          stateKey: 'loading',
          compact: true,
          title: t('support.formLoadingTitle'),
          text: t('support.formLoadingText')
        });
      } else if (contactStatus.dataset.state === 'success') {
        renderContactState({
          stateKey: 'success',
          type: 'empty',
          compact: true,
          title: t('support.formSuccessTitle'),
          text: t('support.formSuccess')
        });
      } else if (contactStatus.dataset.state === 'error') {
        renderContactState({
          stateKey: 'error',
          type: 'error',
          compact: true,
          title: t('support.formErrorTitle'),
          text: t('support.formError')
        });
      }
    });
  });
})();
