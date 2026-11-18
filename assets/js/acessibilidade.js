(() => {
  const CHAVE_PREFERENCIAS = 'mutirao-acessibilidade-preferencias';
  const CHAVE_TEMA = 'mutirao-tema';
  const TEMAS = ['neutro', 'acolhedor'];
  const FONTES_TEMA_ACOLHEDOR = 'https://fonts.googleapis.com/css2?family=Gloock&family=Gochi+Hand&family=Onest:wght@400;600;700&display=swap';
  const FONTE_MINIMA = 80;
  const FONTE_MAXIMA = 140;
  const PASSO_FONTE = 5;

  const PADROES = {
    escalaFonte: 100,
    altoContraste: false,
    destacarLinks: false,
    reduzirAnimacoes: false,
    espacamentoTexto: false
  };

  function limitarEscalaFonte(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return PADROES.escalaFonte;
    const arredondado = Math.round(numero / PASSO_FONTE) * PASSO_FONTE;
    return Math.min(FONTE_MAXIMA, Math.max(FONTE_MINIMA, arredondado));
  }

  function carregarPreferencias() {
    try {
      const salvo = localStorage.getItem(CHAVE_PREFERENCIAS);
      if (!salvo) return { ...PADROES };
      const dados = JSON.parse(salvo);
      return {
        escalaFonte: limitarEscalaFonte(dados?.escalaFonte),
        altoContraste: Boolean(dados?.altoContraste),
        destacarLinks: Boolean(dados?.destacarLinks),
        reduzirAnimacoes: Boolean(dados?.reduzirAnimacoes),
        espacamentoTexto: Boolean(dados?.espacamentoTexto)
      };
    } catch {
      return { ...PADROES };
    }
  }

  function salvarPreferencias(preferencias) {
    try {
      localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(preferencias));
    } catch {
      // Ignora erro caso o navegador bloqueie storage local
    }
  }

  let estado = carregarPreferencias();

  function aplicarPreferencias(preferencias) {
    const raiz = document.documentElement;
    raiz.style.setProperty('--acessibilidade-escala-fonte', String(preferencias.escalaFonte / 100));
    raiz.classList.toggle('acessibilidade--alto-contraste', preferencias.altoContraste);
    raiz.classList.toggle('acessibilidade--destacar-links', preferencias.destacarLinks);
    raiz.classList.toggle('acessibilidade--reduzir-animacoes', preferencias.reduzirAnimacoes);
    raiz.classList.toggle('acessibilidade--espacamento-texto', preferencias.espacamentoTexto);
  }

  function obterTemaSalvo() {
    try {
      const salvo = localStorage.getItem(CHAVE_TEMA);
      return TEMAS.includes(salvo) ? salvo : 'neutro';
    } catch {
      return 'neutro';
    }
  }

  function aplicarTema(tema) {
    const valido = TEMAS.includes(tema) ? tema : 'neutro';
    const acolhedor = valido === 'acolhedor';
    document.documentElement.classList.toggle('tema--acolhedor', acolhedor);
    if (acolhedor && !document.querySelector(`link[href="${FONTES_TEMA_ACOLHEDOR}"]`)) {
      const fontes = document.createElement('link');
      fontes.rel = 'stylesheet';
      fontes.href = FONTES_TEMA_ACOLHEDOR;
      document.head.append(fontes);
    }
    for (const botao of document.querySelectorAll('[data-tema]')) {
      botao.setAttribute('aria-pressed', String(botao.dataset.tema === valido));
    }
    return valido;
  }

  function definirTema(tema) {
    const valido = TEMAS.includes(tema) ? tema : 'neutro';
    try {
      localStorage.setItem(CHAVE_TEMA, valido);
    } catch {
      return aplicarTema(valido);
    }
    return aplicarTema(valido);
  }

  aplicarPreferencias(estado);
  aplicarTema(obterTemaSalvo());

  function criarPainelAcessibilidade() {
    if (document.getElementById('mutirao-acessibilidade-raiz')) return;

    const raiz = document.createElement('div');
    raiz.id = 'mutirao-acessibilidade-raiz';
    raiz.innerHTML = `
      <button
        type="button"
        id="acessibilidade-botao"
        class="acessibilidade__botao-flutuante"
        aria-label="Ajustes de leitura: abrir Ajustes de leitura"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="acessibilidade-painel"
        title="Ajustes de leitura"
      >
        <i class="fa-solid fa-person acessibilidade__icone-flutuante" aria-hidden="true"></i>
        <span class="acessibilidade__rotulo-flutuante" aria-hidden="true">Ajustes de leitura</span>
      </button>

      <div id="acessibilidade-fundo" class="acessibilidade__fundo" hidden></div>

      <section
        id="acessibilidade-painel"
        class="acessibilidade__painel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acessibilidade-titulo"
        aria-describedby="acessibilidade-subtitulo"
        hidden
      >
        <header class="acessibilidade__cabecalho">
          <div class="acessibilidade__titulo-grupo">
            <span class="acessibilidade__icone-cabecalho" aria-hidden="true">
              <i class="fa-solid fa-person"></i>
            </span>
            <div>
              <h2 id="acessibilidade-titulo" class="acessibilidade__titulo">Ajustes de leitura</h2>
              <p id="acessibilidade-subtitulo" class="acessibilidade__subtitulo">Deixe o Mutirão mais fácil de ler e usar</p>
            </div>
          </div>
          <button
            type="button"
            id="acessibilidade-fechar"
            class="acessibilidade__fechar"
            aria-label="Fechar Ajustes de leitura"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <div class="acessibilidade__corpo">
          <div class="acessibilidade__cartao-controle">
            <span id="acessibilidade-rotulo-fonte" class="acessibilidade__rotulo-controle">Tamanho do texto</span>
            <span class="acessibilidade__descricao-controle">Deixe as letras maiores ou menores</span>
            <div class="acessibilidade__contador" role="group" aria-labelledby="acessibilidade-rotulo-fonte">
              <button
                type="button"
                id="acessibilidade-diminuir-fonte"
                class="acessibilidade__botao-passo"
                aria-label="Diminuir tamanho do texto"
              >A-</button>
              <span id="acessibilidade-valor-fonte" class="acessibilidade__valor-passo" aria-live="polite">100%</span>
              <button
                type="button"
                id="acessibilidade-aumentar-fonte"
                class="acessibilidade__botao-passo"
                aria-label="Aumentar tamanho do texto"
              >A+</button>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked="false"
            class="acessibilidade__interruptor"
            data-preferencia="altoContraste"
          >
            <span class="acessibilidade__interruptor-info">
              <span class="acessibilidade__rotulo-controle">Alto contraste</span>
              <span class="acessibilidade__descricao-controle">Cores mais fortes para ler melhor</span>
            </span>
            <span class="acessibilidade__interruptor-trilho" aria-hidden="true">
              <span class="acessibilidade__interruptor-pino"></span>
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked="false"
            class="acessibilidade__interruptor"
            data-preferencia="destacarLinks"
          >
            <span class="acessibilidade__interruptor-info">
              <span class="acessibilidade__rotulo-controle">Destacar links</span>
              <span class="acessibilidade__descricao-controle">Sublinhar os links para achar mais fácil</span>
            </span>
            <span class="acessibilidade__interruptor-trilho" aria-hidden="true">
              <span class="acessibilidade__interruptor-pino"></span>
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked="false"
            class="acessibilidade__interruptor"
            data-preferencia="reduzirAnimacoes"
          >
            <span class="acessibilidade__interruptor-info">
              <span class="acessibilidade__rotulo-controle">Reduzir animações</span>
              <span class="acessibilidade__descricao-controle">Tirar os movimentos da tela</span>
            </span>
            <span class="acessibilidade__interruptor-trilho" aria-hidden="true">
              <span class="acessibilidade__interruptor-pino"></span>
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked="false"
            class="acessibilidade__interruptor"
            data-preferencia="espacamentoTexto"
          >
            <span class="acessibilidade__interruptor-info">
              <span class="acessibilidade__rotulo-controle">Espaço entre linhas</span>
              <span class="acessibilidade__descricao-controle">Mais espaço entre as linhas</span>
            </span>
            <span class="acessibilidade__interruptor-trilho" aria-hidden="true">
              <span class="acessibilidade__interruptor-pino"></span>
            </span>
          </button>

          <div class="acessibilidade__cartao-controle">
            <span id="acessibilidade-rotulo-tema" class="acessibilidade__rotulo-controle">Aparência</span>
            <span class="acessibilidade__descricao-controle">Escolha a aparência visual das telas</span>
            <div class="acessibilidade__temas" role="group" aria-labelledby="acessibilidade-rotulo-tema">
              <button type="button" class="acessibilidade__botao-tema" data-tema="neutro" aria-pressed="true">
                <i class="fa-regular fa-sun" aria-hidden="true"></i> Neutro
              </button>
              <button type="button" class="acessibilidade__botao-tema" data-tema="acolhedor" aria-pressed="false">
                <i class="fa-regular fa-heart" aria-hidden="true"></i> Acolhedor
              </button>
            </div>
          </div>
        </div>

        <footer class="acessibilidade__rodape">
          <button type="button" id="acessibilidade-restaurar" class="botao botao--secundario acessibilidade__botao-restaurar">
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
            Voltar ao padrão
          </button>
        </footer>

        <div id="acessibilidade-regiao-ativa" class="acessibilidade__leitor-tela" aria-live="polite" aria-atomic="true"></div>
      </section>
    `;

    document.body.append(raiz);

    const botaoFlutuante = raiz.querySelector('#acessibilidade-botao');
    const fundo = raiz.querySelector('#acessibilidade-fundo');
    const painel = raiz.querySelector('#acessibilidade-painel');
    const botaoFechar = raiz.querySelector('#acessibilidade-fechar');
    const botaoDiminuir = raiz.querySelector('#acessibilidade-diminuir-fonte');
    const botaoAumentar = raiz.querySelector('#acessibilidade-aumentar-fonte');
    const valorFonte = raiz.querySelector('#acessibilidade-valor-fonte');
    const botaoRestaurar = raiz.querySelector('#acessibilidade-restaurar');
    const regiaoAtiva = raiz.querySelector('#acessibilidade-regiao-ativa');
    const interruptores = [...raiz.querySelectorAll('.acessibilidade__interruptor[data-preferencia]')];

    function anunciar(mensagem) {
      if (!regiaoAtiva) return;
      regiaoAtiva.textContent = '';
      requestAnimationFrame(() => {
        regiaoAtiva.textContent = mensagem;
      });
    }

    function sincronizarInterface() {
      valorFonte.textContent = `${estado.escalaFonte}%`;
      botaoDiminuir.setAttribute('aria-disabled', String(estado.escalaFonte <= FONTE_MINIMA));
      botaoAumentar.setAttribute('aria-disabled', String(estado.escalaFonte >= FONTE_MAXIMA));

      for (const interruptor of interruptores) {
        const chave = interruptor.dataset.preferencia;
        interruptor.setAttribute('aria-checked', String(Boolean(estado[chave])));
      }
    }

    function atualizarEstado(parcial, anuncio) {
      estado = { ...estado, ...parcial };
      function obterTemaSalvo() {
    try {
      const salvo = localStorage.getItem(CHAVE_TEMA);
      return TEMAS.includes(salvo) ? salvo : 'neutro';
    } catch {
      return 'neutro';
    }
  }

  function aplicarTema(tema) {
    const valido = TEMAS.includes(tema) ? tema : 'neutro';
    const acolhedor = valido === 'acolhedor';
    document.documentElement.classList.toggle('tema--acolhedor', acolhedor);
    if (acolhedor && !document.querySelector(`link[href="${FONTES_TEMA_ACOLHEDOR}"]`)) {
      const fontes = document.createElement('link');
      fontes.rel = 'stylesheet';
      fontes.href = FONTES_TEMA_ACOLHEDOR;
      document.head.append(fontes);
    }
    for (const botao of document.querySelectorAll('[data-tema]')) {
      botao.setAttribute('aria-pressed', String(botao.dataset.tema === valido));
    }
    return valido;
  }

  function definirTema(tema) {
    const valido = TEMAS.includes(tema) ? tema : 'neutro';
    try {
      localStorage.setItem(CHAVE_TEMA, valido);
    } catch {
      return aplicarTema(valido);
    }
    return aplicarTema(valido);
  }

  aplicarPreferencias(estado);
  aplicarTema(obterTemaSalvo());
      salvarPreferencias(estado);
      sincronizarInterface();
      if (anuncio) anunciar(anuncio);
    }

    function obterElementosFocaveis() {
      return [...painel.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])')];
    }

    function abrirPainel() {
      painel.hidden = false;
      fundo.hidden = false;
      botaoFlutuante.setAttribute('aria-expanded', 'true');
      botaoFechar.focus();
    }

    function fecharPainel() {
      if (painel.hidden) return;
      painel.hidden = true;
      fundo.hidden = true;
      botaoFlutuante.setAttribute('aria-expanded', 'false');
      botaoFlutuante.focus();
    }

    botaoFlutuante.addEventListener('click', () => {
      if (painel.hidden) abrirPainel();
      else fecharPainel();
    });

    botaoFechar.addEventListener('click', fecharPainel);
    fundo.addEventListener('click', fecharPainel);

    botaoDiminuir.addEventListener('click', () => {
      const proximo = limitarEscalaFonte(estado.escalaFonte - PASSO_FONTE);
      if (proximo !== estado.escalaFonte) {
        atualizarEstado({ escalaFonte: proximo }, `Tamanho do texto ajustado para ${proximo}%`);
      }
    });

    botaoAumentar.addEventListener('click', () => {
      const proximo = limitarEscalaFonte(estado.escalaFonte + PASSO_FONTE);
      if (proximo !== estado.escalaFonte) {
        atualizarEstado({ escalaFonte: proximo }, `Tamanho do texto ajustado para ${proximo}%`);
      }
    });

    const rotulosPreferencias = {
      altoContraste: 'Alto contraste',
      destacarLinks: 'Destacar links',
      reduzirAnimacoes: 'Reduzir animações',
      espacamentoTexto: 'Espaço entre linhas'
    };

    for (const interruptor of interruptores) {
      interruptor.addEventListener('click', () => {
        const chave = interruptor.dataset.preferencia;
        const proximoValor = !estado[chave];
        atualizarEstado(
          { [chave]: proximoValor },
          `${rotulosPreferencias[chave]} ${proximoValor ? 'ativado' : 'desativado'}`
        );
      });
    }

    for (const botaoTema of raiz.querySelectorAll('.acessibilidade__botao-tema[data-tema]')) {
      botaoTema.addEventListener('click', () => {
        const tema = definirTema(botaoTema.dataset.tema);
        anunciar(`Tema ${tema === 'acolhedor' ? 'acolhedor' : 'neutro'} ativado`);
      });
    }

    aplicarTema(obterTemaSalvo());

    botaoRestaurar.addEventListener('click', () => {
      atualizarEstado({ ...PADROES }, 'Ajustes de leitura voltaram ao padrão');
      definirTema('neutro');
    });

    document.addEventListener('keydown', evento => {
      if (painel.hidden) return;

      if (evento.key === 'Escape') {
        evento.preventDefault();
        evento.stopPropagation();
        fecharPainel();
        return;
      }

      if (evento.key === 'Tab') {
        const focaveis = obterElementosFocaveis();
        if (!focaveis.length) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    });

    sincronizarInterface();
  }

  function configurarPularConteudo() {
    const pular = document.querySelector('.pular-conteudo');
    if (!pular) return;
    pular.addEventListener('click', (evento) => {
      const seletor = pular.getAttribute('href');
      const alvo = seletor && seletor.startsWith('#') ? document.querySelector(seletor) : null;
      if (!alvo) return;
      evento.preventDefault();
      if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
      alvo.focus();
      alvo.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      configurarPularConteudo();
      criarPainelAcessibilidade();
    });
  } else {
    configurarPularConteudo();
    criarPainelAcessibilidade();
  }
})();
