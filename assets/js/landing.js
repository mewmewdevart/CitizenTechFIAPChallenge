'use strict';

(() => {
  const cabecalho = document.querySelector('.landing-topo');
  const botaoMenu = document.getElementById('alternar-menu-landing');
  const painelMenu = document.getElementById('menu-landing');

  if (!cabecalho || !botaoMenu || !painelMenu) return;

  const mediaDesktop = window.matchMedia('(min-width: 1025px)');

  const atualizarEstadoMenu = (aberto, devolverFoco = false) => {
    const exibir = Boolean(aberto) && !mediaDesktop.matches;
    painelMenu.classList.toggle('esta-aberto', exibir);
    botaoMenu.setAttribute('aria-expanded', String(exibir));
    botaoMenu.setAttribute(
      'aria-label',
      exibir ? 'Fechar menu de navegação' : 'Abrir menu de navegação'
    );

    if (!exibir && devolverFoco) {
      botaoMenu.focus();
    }
  };

  botaoMenu.addEventListener('click', () => {
    const estaAberto = botaoMenu.getAttribute('aria-expanded') === 'true';
    atualizarEstadoMenu(!estaAberto);
  });

  painelMenu.addEventListener('click', (evento) => {
    const link = evento.target.closest('a[href]');
    if (!link) return;
    atualizarEstadoMenu(false);
  });

  document.addEventListener('click', (evento) => {
    if (botaoMenu.getAttribute('aria-expanded') !== 'true') return;
    if (cabecalho.contains(evento.target)) return;
    atualizarEstadoMenu(false);
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') return;
    if (botaoMenu.getAttribute('aria-expanded') !== 'true') return;
    evento.preventDefault();
    atualizarEstadoMenu(false, true);
  });

  const lidarMudancaViewport = () => {
    if (mediaDesktop.matches) {
      atualizarEstadoMenu(false);
    }
  };

  if (typeof mediaDesktop.addEventListener === 'function') {
    mediaDesktop.addEventListener('change', lidarMudancaViewport);
  } else if (typeof mediaDesktop.addListener === 'function') {
    mediaDesktop.addListener(lidarMudancaViewport);
  }

  if (!document.body.classList.contains('pagina-landing')) return;

  const linksSecao = [...painelMenu.querySelectorAll('.landing-topo__nav a[href^="#"]')];
  const mapaSecoes = linksSecao
    .map((link) => {
      const id = link.getAttribute('href').slice(1);
      const alvo = document.getElementById(id);
      return alvo ? { id, link, alvo } : null;
    })
    .filter(Boolean);

  if (!mapaSecoes.length) return;

  const definirLinkAtivo = (idAtivo) => {
    for (const item of mapaSecoes) {
      if (item.id === idAtivo) {
        item.link.setAttribute('aria-current', 'location');
      } else {
        item.link.removeAttribute('aria-current');
      }
    }
  };

  const atualizarSecaoAtiva = () => {
    const referencia = window.scrollY + cabecalho.offsetHeight + 120;
    let ativo = mapaSecoes[0].id;

    for (const item of mapaSecoes) {
      if (item.id === 'topo') continue;
      if (item.alvo.offsetTop <= referencia) {
        ativo = item.id;
      }
    }

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24) {
      ativo = mapaSecoes[mapaSecoes.length - 1].id;
    }

    definirLinkAtivo(ativo);
  };

  let pendente = false;
  window.addEventListener(
    'scroll',
    () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        pendente = false;
        atualizarSecaoAtiva();
      });
    },
    { passive: true }
  );

  atualizarSecaoAtiva();
})();
