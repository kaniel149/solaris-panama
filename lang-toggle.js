// Solaris Panamá — EN/ES Language Toggle
(function() {
  // Create toggle button
  const btn = document.createElement('button');
  btn.className = 'lang-toggle';
  btn.setAttribute('aria-label', 'Toggle language');
  const lang = localStorage.getItem('solaris-lang') || 'es';
  btn.textContent = lang === 'es' ? 'EN | ES' : 'EN | ES';
  document.body.appendChild(btn);

  function applyLang(l) {
    document.querySelectorAll('[data-es][data-en]').forEach(el => {
      el.textContent = l === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-es');
    });
    btn.innerHTML = l === 'es'
      ? '<span style="opacity:0.5">EN</span> | ES'
      : 'EN | <span style="opacity:0.5">ES</span>';
    localStorage.setItem('solaris-lang', l);
    document.documentElement.lang = l;
  }

  btn.addEventListener('click', () => {
    const cur = localStorage.getItem('solaris-lang') || 'es';
    applyLang(cur === 'es' ? 'en' : 'es');
  });

  applyLang(lang);
})();
