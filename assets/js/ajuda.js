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
  const editor = formulario.querySelector('[data-editor-rico]');
  const areaEditor = editor?.querySelector('[data-editor-alvo]');
  const erroMensagemEl = formulario.querySelector('#ajuda-mensagem-erro');
  const inputEditor = formulario.querySelector('[data-input-editor]');
  const contadorMensagem = formulario.querySelector('#ajuda-mensagem-contador');
  const listaNotificacoes = document.querySelector('.menu-notificacoes__lista');
  const botaoNotificacoes = document.querySelector('.botao-icone--notificacao');

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

  const adicionarNotificacao = (titulo, descricao, href = '#formulario-ajuda') => {
    if (!listaNotificacoes) return;

    const item = document.createElement('li');
    item.className = 'notificacao';

    const link = document.createElement('a');
    link.className = 'notificacao__link';
    link.href = href;

    const blocoTexto = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = titulo;
    const p = document.createElement('p');
    p.textContent = descricao;
    blocoTexto.append(h3, p);

    const seta = document.createElement('i');
    seta.className = 'fa-solid fa-chevron-right notificacao__seta';
    seta.setAttribute('aria-hidden', 'true');

    link.append(blocoTexto, seta);
    item.append(link);
    listaNotificacoes.prepend(item);

    if (botaoNotificacoes) {
      const total = listaNotificacoes.querySelectorAll('.notificacao').length;
      botaoNotificacoes.setAttribute('aria-label', `Notificações (${total} itens)`);
      botaoNotificacoes.setAttribute('data-nova-notificacao', 'true');
    }
  };

  const obterTextoMensagem = () => (areaEditor?.textContent || '').replace(/\s+/g, ' ').trim();

  const atualizarContadorMensagem = () => {
    if (!contadorMensagem || !areaEditor) return;
    const tamanho = obterTextoMensagem().length;
    contadorMensagem.textContent = `${tamanho} / ${MENSAGEM_MAX} caracteres (mínimo ${MENSAGEM_MIN})`;
    contadorMensagem.classList.toggle('ajuda__contador--erro', tamanho > MENSAGEM_MAX);
  };

  const sanitizarHtmlEditor = html => {
    const template = document.createElement('template');
    template.innerHTML = String(html ?? '');
    const tagsPermitidas = new Set(['B', 'STRONG', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV']);

    const limparNo = no => {
      [...no.childNodes].forEach(filho => {
        if (filho.nodeType !== Node.ELEMENT_NODE) return;
        if (!tagsPermitidas.has(filho.tagName)) {
          filho.replaceWith(document.createTextNode(filho.textContent || ''));
          return;
        }
        [...filho.attributes].forEach(attr => filho.removeAttribute(attr.name));
        limparNo(filho);
      });
    };

    limparNo(template.content);
    if (!(template.content.textContent || '').trim() && !template.content.querySelector('li')) {
      return '';
    }
    return template.innerHTML.trim();
  };

  const sincronizarEditorRico = () => {
    if (!editor || !areaEditor) return;
    if (inputEditor) {
      inputEditor.value = sanitizarHtmlEditor(areaEditor.innerHTML);
    }
    editor.querySelectorAll('[data-comando-editor]').forEach(botao => {
      try {
        botao.setAttribute('aria-pressed', String(document.queryCommandState(botao.dataset.comandoEditor)));
      } catch {
        botao.setAttribute('aria-pressed', 'false');
      }
    });
    atualizarContadorMensagem();
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
    if (!areaEditor) return '';
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

  if (editor && areaEditor) {
    editor.addEventListener('mousedown', evento => {
      if (evento.target.closest('[data-comando-editor]')) {
        evento.preventDefault();
      }
    });

    editor.addEventListener('click', evento => {
      const botao = evento.target.closest('[data-comando-editor]');
      if (!botao) return;
      areaEditor.focus();
      document.execCommand(botao.dataset.comandoEditor, false, null);
      sincronizarEditorRico();
      aplicarErroCampo(areaEditor, erroMensagemEl, validarMensagem());
    });

    document.addEventListener('selectionchange', () => {
      if (document.activeElement === areaEditor || areaEditor.contains(document.activeElement)) {
        sincronizarEditorRico();
      }
    });

    ['input', 'keyup', 'mouseup'].forEach(tipoEvento => {
      areaEditor.addEventListener(tipoEvento, () => {
        sincronizarEditorRico();
        if (tipoEvento === 'input') {
          aplicarErroCampo(areaEditor, erroMensagemEl, validarMensagem());
        }
      });
    });

    areaEditor.addEventListener('blur', () => {
      aplicarErroCampo(areaEditor, erroMensagemEl, validarMensagem());
    });

    atualizarContadorMensagem();
  }

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    sincronizarEditorRico();

    const erroEmail = validarEmail();
    const erroAssunto = validarAssunto();
    const erroMensagem = validarMensagem();

    aplicarErroCampo(campoEmail, erroEmailEl, erroEmail);
    aplicarErroCampo(campoAssunto, erroAssuntoEl, erroAssunto);
    aplicarErroCampo(areaEditor, erroMensagemEl, erroMensagem);

    const primeiroErro = [
      [campoEmail, erroEmail],
      [campoAssunto, erroAssunto],
      [areaEditor, erroMensagem]
    ].find(([, msg]) => Boolean(msg));

    if (primeiroErro) {
      const [elemento, mensagemErro] = primeiroErro;
      elemento?.focus();
      mostrarStatus(mensagemErro, 'erro');
      return;
    }

    const email = campoEmail?.value.trim() || '';
    const assunto = campoAssunto?.value.trim() || '';

    formulario.reset();
    aplicarErroCampo(campoEmail, erroEmailEl, '');
    aplicarErroCampo(campoAssunto, erroAssuntoEl, '');
    if (areaEditor) {
      areaEditor.innerHTML = '';
      aplicarErroCampo(areaEditor, erroMensagemEl, '');
      sincronizarEditorRico();
    }

    adicionarNotificacao(
      'E-mail enviado com sucesso',
      `Assunto: "${assunto}" · Em breve entraremos em contato pelo e-mail ${email}.`,
      'ajuda.html#formulario-ajuda'
    );
    mostrarStatus('E-mail enviado com sucesso! Em breve entraremos em contato.', 'sucesso');
  });
})();
