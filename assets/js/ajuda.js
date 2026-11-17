(() => {
  'use strict';

  const ASSUNTO_MIN = 5;
  const ASSUNTO_MAX = 100;
  const MENSAGEM_MIN = 20;
  const MENSAGEM_MAX = 2000;
  const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const formulario = document.querySelector('#formulario-ajuda');
  if (!formulario) return;

  const retorno = document.querySelector('#ajuda-retorno');
  const campoEmail = formulario.querySelector('#ajuda-email');
  const erroEmailEl = formulario.querySelector('#ajuda-email-erro');
  const campoAssunto = formulario.querySelector('#ajuda-assunto');
  const erroAssuntoEl = formulario.querySelector('#ajuda-assunto-erro');
  const campoMensagem = formulario.querySelector('#ajuda-mensagem');
  const erroMensagemEl = formulario.querySelector('#ajuda-mensagem-erro');
  const contadorMensagem = formulario.querySelector('#ajuda-mensagem-contador');

  let timerStatus = null;

  const mostrarStatus = (mensagem, tipo = 'sucesso') => {
    if (!retorno) return;
    clearTimeout(timerStatus);
    const estado = tipo === 'erro' ? 'erro' : 'sucesso';
    retorno.setAttribute('data-mvp-status', estado);
    retorno.textContent = '';

    const icone = document.createElement('i');
    icone.className = estado === 'erro' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    icone.setAttribute('aria-hidden', 'true');

    const texto = document.createElement('span');
    texto.textContent = mensagem;

    requestAnimationFrame(() => {
      retorno.replaceChildren(icone, texto);
    });
    timerStatus = setTimeout(() => {
      retorno.replaceChildren();
      retorno.setAttribute('data-mvp-status', '');
    }, 5000);
  };

  const obterTextoMensagem = () => (campoMensagem?.value || '').replace(/\s+/g, ' ').trim();

  const atualizarContadorMensagem = () => {
    if (!contadorMensagem || !campoMensagem) return;
    const tamanho = obterTextoMensagem().length;
    contadorMensagem.textContent = `${tamanho} / ${MENSAGEM_MAX} caracteres (mínimo ${MENSAGEM_MIN})`;
    contadorMensagem.classList.toggle('ajuda__contador--erro', tamanho > MENSAGEM_MAX);
  };

  const validarEmail = () => {
    if (!campoEmail) return '';
    const valor = campoEmail.value.trim();
    if (!valor) return 'Coloque seu e-mail para a gente responder.';
    if (!REGEX_EMAIL.test(valor) || !campoEmail.checkValidity()) {
      return 'Esse e-mail parece errado. Exemplo: nome@email.com';
    }
    return '';
  };

  const validarAssunto = () => {
    if (!campoAssunto) return '';
    const valor = campoAssunto.value.trim();
    if (!valor) return 'Escreva o assunto.';
    if (valor.length < ASSUNTO_MIN) return `O assunto deve ter pelo menos ${ASSUNTO_MIN} caracteres.`;
    if (valor.length > ASSUNTO_MAX) return `O assunto deve ter no máximo ${ASSUNTO_MAX} caracteres.`;
    return '';
  };

  const validarMensagem = () => {
    if (!campoMensagem) return '';
    const tamanho = obterTextoMensagem().length;
    if (!tamanho) return 'Escreva a mensagem antes de mandar.';
    if (tamanho < MENSAGEM_MIN) return `A mensagem deve ter pelo menos ${MENSAGEM_MIN} caracteres.`;
    if (tamanho > MENSAGEM_MAX) return `A mensagem deve ter no máximo ${MENSAGEM_MAX} caracteres.`;
    return '';
  };

  const aplicarErroCampo = (elemento, erroEl, mensagem) => {
    if (elemento) {
      if (mensagem) elemento.setAttribute('aria-invalid', 'true');
      else elemento.removeAttribute('aria-invalid');
    }
    if (erroEl) erroEl.textContent = mensagem;
  };

  campoEmail?.addEventListener('input', () => {
    campoEmail.setCustomValidity('');
    aplicarErroCampo(campoEmail, erroEmailEl, validarEmail());
  });

  campoEmail?.addEventListener('blur', () => {
    aplicarErroCampo(campoEmail, erroEmailEl, validarEmail());
  });

  campoAssunto?.addEventListener('input', () => {
    campoAssunto.setCustomValidity('');
    aplicarErroCampo(campoAssunto, erroAssuntoEl, validarAssunto());
  });

  campoAssunto?.addEventListener('blur', () => {
    aplicarErroCampo(campoAssunto, erroAssuntoEl, validarAssunto());
  });

  if (campoMensagem) {
    campoMensagem.addEventListener('input', () => {
      campoMensagem.setCustomValidity('');
      atualizarContadorMensagem();
      aplicarErroCampo(campoMensagem, erroMensagemEl, validarMensagem());
    });

    campoMensagem.addEventListener('blur', () => {
      aplicarErroCampo(campoMensagem, erroMensagemEl, validarMensagem());
    });

    atualizarContadorMensagem();
  }

  const core = window.MutiraoCuidado;
  const historico = document.createElement('section');
  historico.className = 'apoio__painel';
  historico.setAttribute('aria-label', 'Seus chamados da simulação');
  formulario.after(historico);
  const renderizarChamados = () => {
    const e = core.escaparHtml;
    historico.innerHTML = '<h2>Suas mensagens</h2>' + ((core.obterEstado().chamados || []).map(item =>
      `<article class="painel__bloco"><h3>${e(item.protocolo)} · ${e(item.assunto)}</h3><p>${e(item.mensagem)}</p><p>${e(item.email)} · ${e(item.status)}</p>${item.status === 'Aberto' ? '' /* `<button class="botao botao--secundario" type="button" data-concluir-chamado="${e(item.protocolo)}">Simular resposta e concluir</button>` */ : `<p>Resposta simulada: recebemos seu relato sobre “${e(item.assunto)}”. Ele está disponível neste histórico; nenhum atendimento externo foi realizado.</p>`}</article>`).join('') || '<p>Nenhuma mensagem enviada.</p>');
  };
  historico.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-concluir-chamado]');
    if (!botao) return;
    core.atualizarEstado(estado => ({ ...estado, chamados: estado.chamados.map(item => item.protocolo === botao.dataset.concluirChamado ? { ...item, status: 'Concluído na simulação' } : item) }));
    renderizarChamados(); mostrarStatus('Resposta de teste salva no histórico.');
    historico.tabIndex = -1; historico.focus();
  });
  renderizarChamados();

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();

    const erroEmail = validarEmail();
    const erroAssunto = validarAssunto();
    const erroMensagem = validarMensagem();

    aplicarErroCampo(campoEmail, erroEmailEl, erroEmail);
    aplicarErroCampo(campoAssunto, erroAssuntoEl, erroAssunto);
    aplicarErroCampo(campoMensagem, erroMensagemEl, erroMensagem);

    const primeiroErro = [
      [campoEmail, erroEmail],
      [campoAssunto, erroAssunto],
      [campoMensagem, erroMensagem]
    ].find(([, msg]) => Boolean(msg));

    if (primeiroErro) {
      const [elemento, mensagemErro] = primeiroErro;
      elemento?.focus();
      mostrarStatus(mensagemErro, 'erro');
      return;
    }

    const protocolo = `MUT-${Date.now()}`;
    core.atualizarEstado(estado => ({ ...estado, chamados: [...(estado.chamados || []), {
      protocolo, email: campoEmail.value.trim(), assunto: campoAssunto.value.trim(), mensagem: obterTextoMensagem(), status: 'Aberto'
    }] }));
    renderizarChamados();
    formulario.reset();
    aplicarErroCampo(campoEmail, erroEmailEl, '');
    aplicarErroCampo(campoAssunto, erroAssuntoEl, '');
    aplicarErroCampo(campoMensagem, erroMensagemEl, '');
    atualizarContadorMensagem();

    window.MutiraoNotificacoes.registrar('Mensagem de teste enviada', 'Formulário de Ajuda concluído somente nesta aba.', 'ajuda.html#formulario-ajuda');
    mostrarStatus(`Chamado ${protocolo} salvo no histórico. Nenhum e-mail foi enviado.`, 'sucesso');
  });
})();
