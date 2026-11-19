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

  const dialogoImagem = document.getElementById('dialogo-imagem-landing');
  const tituloModal = document.getElementById('titulo-dialogo-imagem');
  const palcoImagem = dialogoImagem?.querySelector('[data-dialogo-imagem-palco]');
  const imagemModal = dialogoImagem?.querySelector('[data-dialogo-imagem-conteudo]');
  const botaoFecharImagem = dialogoImagem?.querySelector('form[method="dialog"] button');
  const gatilhosImagem = [...document.querySelectorAll('.landing-imagem-gatilho')];

  if (dialogoImagem && palcoImagem && imagemModal && gatilhosImagem.length) {
    let ultimoGatilhoImagem = null;
    const tituloPadraoModal = tituloModal?.textContent.trim() || 'Visualização ampliada da tela';

    const obterImagemVisivel = (gatilho) => {
      const imagens = [...gatilho.querySelectorAll('img')];
      return imagens.find((img) => getComputedStyle(img).display !== 'none') || imagens[0] || null;
    };

    const abrirModalImagem = (gatilho) => {
      const origem = obterImagemVisivel(gatilho);
      if (!origem) return;

      const fonte = origem.currentSrc || origem.getAttribute('src');
      if (!fonte) return;

      if (botaoMenu.getAttribute('aria-expanded') === 'true') {
        atualizarEstadoMenu(false);
      }

      ultimoGatilhoImagem = gatilho;
      if (tituloModal) {
        tituloModal.textContent = gatilho.dataset.tituloImagem || origem.alt || tituloPadraoModal;
      }
      imagemModal.src = fonte;
      imagemModal.alt = origem.alt || '';
      palcoImagem.classList.toggle(
        'dialogo-mvp__imagem-palco--sem-moldura',
        gatilho.classList.contains('landing-imagem-gatilho--sem-moldura')
      );

      if (!dialogoImagem.open && typeof dialogoImagem.showModal === 'function') {
        dialogoImagem.showModal();
      }
      botaoFecharImagem?.focus({ preventScroll: true });
    };

    for (const gatilho of gatilhosImagem) {
      gatilho.addEventListener('click', () => abrirModalImagem(gatilho));
    }

    const molduraTablet = document.querySelector('.landing-final__moldura');
    const gatilhoTablet = document.querySelector('.landing-final__gatilho-tablet');
    if (molduraTablet && gatilhoTablet) {
      molduraTablet.addEventListener('click', () => abrirModalImagem(gatilhoTablet));
    }

    dialogoImagem.addEventListener('click', (evento) => {
      if (evento.target === dialogoImagem) {
        dialogoImagem.close();
      }
    });

    dialogoImagem.addEventListener('close', () => {
      if (tituloModal) {
        tituloModal.textContent = tituloPadraoModal;
      }
      imagemModal.removeAttribute('src');
      imagemModal.alt = '';
      palcoImagem.classList.remove('dialogo-mvp__imagem-palco--sem-moldura');

      const destino = ultimoGatilhoImagem;
      ultimoGatilhoImagem = null;
      if (destino && document.contains(destino) && destino.offsetParent !== null) {
        requestAnimationFrame(() => {
          if (!dialogoImagem.open) {
            destino.focus({ preventScroll: true });
          }
        });
      }
    });
  }
})();
