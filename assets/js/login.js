(() => {
  const form = document.querySelector('[data-login-form]');
  if (!form) return;

  const statusEl = document.querySelector('[data-login-status]');
  const emailInput = form.elements.email;
  const senhaInput = form.elements.senha;
  const btnEsqueci = document.querySelector('[data-login-esqueci]');
  const btnCadastro = document.querySelector('[data-login-cadastro]');

  const limparErros = () => {
    emailInput?.removeAttribute('aria-invalid');
    senhaInput?.removeAttribute('aria-invalid');
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.remove('login__status--erro');
    }
  };

  const mostrarErro = (campo, mensagem) => {
    if (campo) {
      campo.setAttribute('aria-invalid', 'true');
      campo.focus();
    }
    if (statusEl) {
      statusEl.textContent = mensagem;
      statusEl.classList.add('login__status--erro');
    }
  };

  const validarLogin = () => {
    limparErros();
    const email = String(emailInput?.value || '').trim();
    const senha = String(senhaInput?.value || '').trim();

    if (!email) {
      mostrarErro(emailInput, 'Informe seu e-mail para entrar.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarErro(emailInput, 'Informe um e-mail válido (ex.: nome@dominio.com).');
      return false;
    }
    if (!senha) {
      mostrarErro(senhaInput, 'Informe sua senha para entrar.');
      return false;
    }
    if (senha.length < 4) {
      mostrarErro(senhaInput, 'A senha deve ter pelo menos 4 caracteres.');
      return false;
    }
    return true;
  };

  const botaoVerSenha = form.querySelector('[data-ver-senha]');
  botaoVerSenha?.addEventListener('click', () => {
    const mostrar = senhaInput.type === 'password';
    senhaInput.type = mostrar ? 'text' : 'password';
    botaoVerSenha.setAttribute('aria-pressed', String(mostrar));
    botaoVerSenha.setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha');
    botaoVerSenha.querySelector('[data-icone="mostrar"]').hidden = mostrar;
    botaoVerSenha.querySelector('[data-icone="esconder"]').hidden = !mostrar;
    form.dispatchEvent(new CustomEvent('mutirao:senha-visivel', { detail: mostrar }));
  });

  emailInput?.addEventListener('input', limparErros);
  senhaInput?.addEventListener('input', limparErros);

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    if (!validarLogin()) return;
    const comemorar = mascotes && !movimentoReduzido();
    if (comemorar) form.dispatchEvent(new CustomEvent('mutirao:entrando'));
    setTimeout(() => { window.location.href = 'home.html'; }, comemorar ? 700 : 0);
  });

  const mascotes = document.querySelector('[data-mascotes]');
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  const movimentoReduzido = () =>
    reduzirMovimento.matches || document.documentElement.classList.contains('acessibilidade--reduzir-animacoes');
  const botaoEntrar = form.querySelector('.login__entrar');

  if (mascotes) {
    const olhos = [...mascotes.querySelectorAll('.mascote-olho__pupila')].map(pupila => ({
      pupila,
      cx: Number(pupila.dataset.cx),
      cy: Number(pupila.dataset.cy)
    }));
    const ALCANCE = 1.1;
    let quadro = 0;
    let timerDigitando = 0;
    let timerReacao = 0;

    const estado = (nome, ativo) => {
      if (ativo && movimentoReduzido()) return;
      mascotes.classList.toggle(`mascotes--${nome}`, ativo);
    };

    const limparAnimacoesMascotes = () => {
      cancelAnimationFrame(quadro);
      clearTimeout(timerDigitando);
      clearTimeout(timerReacao);
      clearTimeout(timerEspiada);
      ['olhando-form', 'digitando', 'desviando', 'olhos-fechados', 'espiando', 'animados', 'surpresos', 'comemorando', 'piscando']
        .forEach(nome => mascotes.classList.remove(`mascotes--${nome}`));
      olhos.forEach(({ pupila }) => pupila.removeAttribute('transform'));
    };

    new MutationObserver(() => {
      if (movimentoReduzido()) limparAnimacoesMascotes();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const olharPara = (x, y) => {
      if (movimentoReduzido()) return;
      const matriz = mascotes.getScreenCTM();
      if (!matriz) return;
      const ponto = new DOMPoint(x, y).matrixTransform(matriz.inverse());
      olhos.forEach(({ pupila, cx, cy }) => {
        const dx = ponto.x - cx;
        const dy = ponto.y - cy;
        const distancia = Math.hypot(dx, dy) || 1;
        const fator = Math.min(ALCANCE, distancia / 40) / distancia;
        pupila.setAttribute('transform', `translate(${(dx * fator).toFixed(2)} ${(dy * fator).toFixed(2)})`);
      });
    };

    const olharParaElemento = elemento => {
      if (movimentoReduzido()) return;
      const caixa = elemento.getBoundingClientRect();
      olharPara(caixa.left + caixa.width / 2, caixa.top + caixa.height / 2);
    };

    const reagir = (nome, duracao) => {
      if (movimentoReduzido()) return;
      clearTimeout(timerReacao);
      ['surpresos', 'comemorando'].forEach(outro => estado(outro, false));
      void mascotes.getBoundingClientRect();
      estado(nome, true);
      timerReacao = setTimeout(() => estado(nome, false), duracao);
    };

    window.addEventListener('pointermove', evento => {
      if (movimentoReduzido() || mascotes.classList.contains('mascotes--olhos-fechados')) return;
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => olharPara(evento.clientX, evento.clientY));
    });

    emailInput?.addEventListener('focus', () => {
      estado('olhando-form', true);
      if (!movimentoReduzido()) olharParaElemento(emailInput);
    });
    emailInput?.addEventListener('blur', () => estado('olhando-form', false));
    emailInput?.addEventListener('input', () => {
      clearTimeout(timerDigitando);
      estado('digitando', true);
      timerDigitando = setTimeout(() => estado('digitando', false), 180);
    });

    let timerEspiada = 0;
    const atualizarSenha = () => {
      if (movimentoReduzido()) {
        limparAnimacoesMascotes();
        return;
      }
      const visivel = senhaInput?.type === 'text';
      const naSenha = document.activeElement === senhaInput || document.activeElement === botaoVerSenha;
      estado('desviando', visivel);
      estado('olhos-fechados', visivel || naSenha);
      if (!visivel) {
        clearTimeout(timerEspiada);
        estado('espiando', false);
      }
    };

    const espiar = () => {
      clearTimeout(timerEspiada);
      if (senhaInput?.type !== 'text' || movimentoReduzido()) return;
      timerEspiada = setTimeout(() => {
        if (senhaInput.type !== 'text' || movimentoReduzido()) return;
        estado('espiando', true);
        setTimeout(() => {
          estado('espiando', false);
          espiar();
        }, 700);
      }, 2200 + Math.random() * 1800);
    };

    senhaInput?.addEventListener('focus', atualizarSenha);
    senhaInput?.addEventListener('blur', () => setTimeout(atualizarSenha, 0));
    botaoVerSenha?.addEventListener('blur', () => setTimeout(atualizarSenha, 0));
    form.addEventListener('mutirao:senha-visivel', () => {
      atualizarSenha();
      espiar();
    });

    botaoEntrar?.addEventListener('pointerenter', () => estado('animados', true));
    botaoEntrar?.addEventListener('pointerleave', () => estado('animados', false));
    botaoEntrar?.addEventListener('focus', () => estado('animados', true));
    botaoEntrar?.addEventListener('blur', () => estado('animados', false));

    if (statusEl) {
      new MutationObserver(() => {
        if (statusEl.classList.contains('login__status--erro')) reagir('surpresos', 1400);
      }).observe(statusEl, { attributes: true, attributeFilter: ['class'], childList: true });
    }

    form.addEventListener('mutirao:entrando', () => reagir('comemorando', 900));

    const piscar = () => {
      if (!movimentoReduzido() && !mascotes.classList.contains('mascotes--olhos-fechados') && !document.hidden) {
        estado('piscando', true);
        setTimeout(() => estado('piscando', false), 160);
      }
      setTimeout(piscar, 3500 + Math.random() * 3000);
    };
    setTimeout(piscar, 2500);
  }

  btnEsqueci?.addEventListener('click', evento => evento.preventDefault());
  btnCadastro?.addEventListener('click', evento => evento.preventDefault());
})();
