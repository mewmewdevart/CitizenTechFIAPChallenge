(() => {
  const CHAVE_PREFERENCIAS = 'mutirao-acessibilidade-preferencias';
  const FONTE_MINIMA = 90;
  const FONTE_MAXIMA = 110;
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

  aplicarPreferencias(estado);

  function criarPainelAcessibilidade() {
    if (document.getElementById('mutirao-acessibilidade-raiz')) return;

    const raiz = document.createElement('div');
    raiz.id = 'mutirao-acessibilidade-raiz';
    raiz.innerHTML = `
      <button
        type="button"
        id="acessibilidade-botao"
        class="acessibilidade__botao-flutuante"
        aria-label="Recursos assistivos: abrir Central de Acessibilidade"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="acessibilidade-painel"
        title="Recursos assistivos"
      >
        <i class="fa-solid fa-person acessibilidade__icone-flutuante" aria-hidden="true"></i>
        <span class="acessibilidade__rotulo-flutuante" aria-hidden="true">Recursos assistivos</span>
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
              <h2 id="acessibilidade-titulo" class="acessibilidade__titulo">Central de Acessibilidade</h2>
              <p id="acessibilidade-subtitulo" class="acessibilidade__subtitulo">Personalize a leitura e a navegação do Mutirão</p>
            </div>
          </div>
          <button
            type="button"
            id="acessibilidade-fechar"
            class="acessibilidade__fechar"
            aria-label="Fechar Central de Acessibilidade"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <div class="acessibilidade__corpo">
          <div class="acessibilidade__cartao-controle">
            <span id="acessibilidade-rotulo-fonte" class="acessibilidade__rotulo-controle">Tamanho do texto</span>
            <span class="acessibilidade__descricao-controle">Aumente ou diminua as fontes da página</span>
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
              <span class="acessibilidade__descricao-controle">Cores com maior contraste para leitura</span>
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
              <span class="acessibilidade__descricao-controle">Sublinhar links para facilitar a identificação</span>
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
              <span class="acessibilidade__descricao-controle">Desativar movimentos e transições</span>
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
              <span class="acessibilidade__rotulo-controle">Espaçamento do texto</span>
              <span class="acessibilidade__descricao-controle">Aumentar o espaço entre as linhas</span>
            </span>
            <span class="acessibilidade__interruptor-trilho" aria-hidden="true">
              <span class="acessibilidade__interruptor-pino"></span>
            </span>
          </button>
        </div>

        <footer class="acessibilidade__rodape">
          <button type="button" id="acessibilidade-restaurar" class="botao botao--secundario acessibilidade__botao-restaurar">
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
            Restaurar padrões
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
      botaoDiminuir.disabled = estado.escalaFonte <= FONTE_MINIMA;
      botaoAumentar.disabled = estado.escalaFonte >= FONTE_MAXIMA;

      for (const interruptor of interruptores) {
        const chave = interruptor.dataset.preferencia;
        interruptor.setAttribute('aria-checked', String(Boolean(estado[chave])));
      }
    }

    function atualizarEstado(parcial, anuncio) {
      estado = { ...estado, ...parcial };
      aplicarPreferencias(estado);
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
      espacamentoTexto: 'Espaçamento do texto'
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

    botaoRestaurar.addEventListener('click', () => {
      atualizarEstado({ ...PADROES }, 'Preferências de acessibilidade restauradas para o padrão');
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarPainelAcessibilidade);
  } else {
    criarPainelAcessibilidade();
  }
})();
