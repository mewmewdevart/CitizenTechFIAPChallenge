(() => {
  'use strict';

  const formulario = document.querySelector('#formulario-ajuda');
  if (!formulario) return;

  const retorno = document.querySelector('#ajuda-retorno');
  const campoEmail = formulario.querySelector('#ajuda-email');
  const campoAssunto = formulario.querySelector('#ajuda-assunto');
  const campos = [campoEmail, campoAssunto].filter(Boolean);
  const editor = formulario.querySelector('[data-editor-rico]');
  const areaEditor = editor?.querySelector('[data-editor-alvo]');
  const inputEditor = formulario.querySelector('[data-input-editor]');
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
      botaoNotificacoes.setAttribute('aria-label', `Notificações (${total} pendentes)`);
      botaoNotificacoes.setAttribute('data-nova-notificacao', 'true');
    }
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
  };

  campos.forEach(campo => {
    campo.addEventListener('input', () => {
      campo.setCustomValidity('');
      campo.removeAttribute('aria-invalid');
    });
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
    });

    document.addEventListener('selectionchange', () => {
      if (document.activeElement === areaEditor || areaEditor.contains(document.activeElement)) {
        sincronizarEditorRico();
      }
    });

    ['input', 'keyup', 'mouseup'].forEach(tipoEvento => {
      areaEditor.addEventListener(tipoEvento, () => {
        areaEditor.removeAttribute('aria-invalid');
        sincronizarEditorRico();
      });
    });
  }

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    sincronizarEditorRico();

    let primeiroInvalido = null;

    campos.forEach(campo => {
      const preenchido = Boolean(campo.value.trim());
      campo.setCustomValidity(preenchido ? '' : 'Preencha este campo.');
      if (!preenchido || !campo.checkValidity()) {
        campo.setAttribute('aria-invalid', 'true');
        if (!primeiroInvalido) primeiroInvalido = campo;
      } else {
        campo.removeAttribute('aria-invalid');
      }
    });

    const mensagemPreenchida = Boolean((areaEditor?.textContent || '').trim() || areaEditor?.querySelector('li'));
    if (areaEditor) {
      if (!mensagemPreenchida) {
        areaEditor.setAttribute('aria-invalid', 'true');
        if (!primeiroInvalido) primeiroInvalido = areaEditor;
      } else {
        areaEditor.removeAttribute('aria-invalid');
      }
    }

    if (primeiroInvalido) {
      primeiroInvalido.focus();
      const emailInvalido = campoEmail && !campoEmail.checkValidity() && campoEmail.value.trim();
      const textoErro = emailInvalido
        ? 'Não foi possível enviar: informe um e-mail válido.'
        : 'Não foi possível enviar: preencha todos os campos obrigatórios.';
      mostrarStatus(textoErro, 'erro');
      return;
    }

    const email = campoEmail?.value.trim() || '';
    const assunto = campoAssunto?.value.trim() || '';

    formulario.reset();
    if (areaEditor) {
      areaEditor.innerHTML = '';
      areaEditor.removeAttribute('aria-invalid');
      sincronizarEditorRico();
    }

    adicionarNotificacao(
      'Mensagem enviada ao suporte',
      `${assunto} · Retorno para ${email}.`,
      'ajuda.html#formulario-ajuda'
    );
    mostrarStatus('E-mail enviado com sucesso! Em breve entraremos em contato.', 'sucesso');
  });
})();
