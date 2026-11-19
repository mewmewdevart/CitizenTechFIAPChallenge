(() => {
  function iniciarVLibras() {
    if (!window.VLibras?.Widget) return;
    new window.VLibras.Widget({
      rootPath: 'https://vlibras.gov.br/app',
      personalization: 'https://vlibras.gov.br/config/default_logo.json',
      avatar: 'random',
      position: 'R'
    });
  }

  const script = document.createElement('script');
  script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
  script.async = true;
  script.addEventListener('load', iniciarVLibras, { once: true });
  document.head.append(script);
})();
