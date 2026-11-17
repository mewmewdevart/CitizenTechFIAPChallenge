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
    if (!valor) return 'Informe seu e-mail para resposta.';
    if (!REGEX_EMAIL.test(valor) || !campoEmail.checkValidity()) {
      return 'Informe um e-mail válido (ex.: nome@email.com).';
    }
    return '';
  };

  const validarAssunto = () => {
    if (!campoAssunto) return '';
    const valor = campoAssunto.value.trim();
    if (!valor) return 'Informe o assunto da mensagem.';
    if (valor.length < ASSUNTO_MIN) return `O assunto deve ter pelo menos ${ASSUNTO_MIN} caracteres.`;
    if (valor.length > ASSUNTO_MAX) return `O assunto deve ter no máximo ${ASSUNTO_MAX} caracteres.`;
    return '';
  };

  const validarMensagem = () => {
    if (!campoMensagem) return '';
    const tamanho = obterTextoMensagem().length;
    if (!tamanho) return 'Escreva a mensagem antes de enviar.';
    if (tamanho < MENSAGEM_MIN) return `A mensagem deve ter pelo menos ${MENSAGEM_MIN} caracteres.`;
    if (tamanho > MENSAGEM_MAX) return `A mensagem deve ter no máximo ${MENSAGEM_MAX} caracteres.`;
    return '';
  };

  const aplicarErroCampo = (elemento, erroEl, mensagem) => {
    if (elemento) elemento.toggleAttribute('aria-invalid', Boolean(mensagem));
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

    formulario.reset();
    aplicarErroCampo(campoEmail, erroEmailEl, '');
    aplicarErroCampo(campoAssunto, erroAssuntoEl, '');
    aplicarErroCampo(campoMensagem, erroMensagemEl, '');
    atualizarContadorMensagem();

    window.MutiraoNotificacoes.registrar('Mensagem de demonstração registrada', 'Formulário de Ajuda concluído somente nesta aba.', 'ajuda.html#formulario-ajuda');
    mostrarStatus('Mensagem registrada nesta demonstração. Nenhum e-mail foi enviado.', 'sucesso');
  });
})();
