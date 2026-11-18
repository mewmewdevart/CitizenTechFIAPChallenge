window.MutiraoCuidadoPronto.then(core => {
  if (!core) return;
  const pagina = document.querySelector('[data-pagina-mvp="documentos"]');
  if (!pagina) return;

  const {
    HOJE,
    obterEstado,
    atualizarEstado,
    obterUsuarioAtual,
    escaparHtml,
    formatarData,
    formatarDataCurta,
    anunciarStatus
  } = core;

  const lista = pagina.querySelector('[data-documentos-lista]');
  const campoBusca = pagina.querySelector('[data-documentos-busca]');
  const filtrosCategoria = pagina.querySelector('.filtros');
  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const dialogoDetalhes = document.getElementById('dialogo-detalhes-documento');
  const dialogoAdicionar = document.getElementById('dialogo-adicionar-documento');
  const formDocumento = dialogoAdicionar?.querySelector('[data-formulario-mvp="documento"]');
  const erroDocumento = dialogoAdicionar?.querySelector('[data-erro-documento]');
  const tituloDialogoDoc = dialogoAdicionar?.querySelector('[data-titulo-dialogo-documento]');
  let documentoEmFocoId = null;
  let categoriaAtiva = 'Todos';
  const compromissoInicial = new URLSearchParams(location.search).get('compromisso');
  let compromissoFiltroId = core.obterCompromissos().some(item => item.id === compromissoInicial) ? compromissoInicial : '';

  const limparErrosDocumento = () => {
    if (erroDocumento) erroDocumento.textContent = '';
    formDocumento?.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  };

  const popularSelectAutor = (valorSelecionado = '') => {
    const select = formDocumento?.elements?.autor;
    if (!select) return;
    const usuario = obterUsuarioAtual();
    const pessoasRede = core.obterParticipantesRede().map(pessoa => pessoa.nome);
    const opcoes = [...new Set([usuario.nomeComApelido, ...pessoasRede])];
    if (valorSelecionado && !opcoes.includes(valorSelecionado)) {
      opcoes.push(valorSelecionado);
    }
    select.innerHTML = opcoes
      .map(nome => `<option value="${escaparHtml(nome)}">${escaparHtml(nome)}</option>`)
      .join('');
    select.value = valorSelecionado || usuario.nomeComApelido;
  };

  const popularSelectCompromissos = (valorSelecionado = '') => {
    const select = formDocumento?.elements?.compromissoId;
    if (!select) return;
    const eventos = core.obterCompromissos ? core.obterCompromissos() : (obterEstado().events || []);
    select.innerHTML = [
      '<option value="">Nenhum compromisso vinculado</option>',
      ...eventos.map(evt => `<option value="${escaparHtml(evt.id)}">${escaparHtml(formatarDataCurta(evt.dia))} · ${escaparHtml(evt.hora.replace(':00', 'h'))} · ${escaparHtml(evt.titulo)}</option>`)
    ].join('');
    select.value = valorSelecionado || '';
  };

  const abrirFormularioDocumento = (doc = null) => {
    if (!formDocumento || !dialogoAdicionar) return;
    formDocumento.reset();
    limparErrosDocumento();
    formDocumento.elements.id.value = doc?.id || '';
    formDocumento.elements.titulo.value = doc?.titulo || '';
    formDocumento.elements.categoria.value = doc?.categoria || 'Receita';
    formDocumento.elements.dia.value = doc?.dia || HOJE;
    popularSelectAutor(doc?.autor || obterUsuarioAtual().nomeComApelido);
    if (formDocumento.elements.localOriginal) formDocumento.elements.localOriginal.value = doc?.localOriginal || '';
    popularSelectCompromissos(doc?.compromissoId || '');
    formDocumento.elements.vinculo.value = doc?.vinculo || '';
    formDocumento.elements.observacoes.value = doc?.observacoes || '';
    formDocumento.elements.nomeArquivo.value = doc?.nomeArquivo || '';
    if (tituloDialogoDoc) {
      tituloDialogoDoc.textContent = doc ? 'Editar referência de documento' : 'Cadastrar referência de documento';
    }
    dialogoAdicionar.showModal();
  };

  const ICONES_CATEGORIA = {
    Receita: 'icone-receita.svg',
    Exame: 'icone-exame.svg',
    Documento: 'icone-documento.svg'
  };

  const formatarDataCurtaDoc = dia => {
    if (!dia) return '';
    return formatarData(dia, { day: 'numeric', month: 'short' }).replace('.', '') + '.';
  };

  const renderizar = () => {
    let contexto = pagina.querySelector('[data-contexto-documentos]');
    if (!contexto) {
      contexto = document.createElement('div'); contexto.dataset.contextoDocumentos = '';
      contexto.className = 'painel__bloco'; lista.before(contexto);
    }
    contexto.hidden = !compromissoFiltroId;
    const eventoContexto = core.obterCompromissos().find(item => item.id === compromissoFiltroId);
    contexto.innerHTML = compromissoFiltroId ? `<p>Documentos de: <strong>${escaparHtml(eventoContexto?.titulo || 'Atendimento não encontrado')}</strong></p><button class="botao botao--secundario" type="button" data-remover-contexto-documentos>Ver todo o acervo</button>` : '';
    contexto.querySelector('button')?.addEventListener('click', () => {
      compromissoFiltroId = ''; const url = new URL(location.href); url.searchParams.delete('compromisso');
      history.replaceState(null, '', url); renderizar(); campoBusca?.focus();
    });

    const termo = core.normalizarBusca(campoBusca?.value);
    const compromissoAlvo = compromissoFiltroId
      ? (core.obterCompromissos ? core.obterCompromissos() : (obterEstado().events || [])).find(e => e.id === compromissoFiltroId)
      : null;
    const tituloCompromissoLower = String(compromissoAlvo?.titulo || '').toLowerCase();
    const docs = [...(obterEstado().documents || [])]
      .sort((a, b) => (b.dia || '').localeCompare(a.dia || ''))
      .filter(doc => {
        if (compromissoFiltroId) {
          const bateCompromisso = doc.compromissoId === compromissoFiltroId;
          if (!bateCompromisso) return false;
        }
        if (categoriaAtiva !== 'Todos' && doc.categoria !== categoriaAtiva) return false;
        if (!termo) return true;
        const texto = core.normalizarBusca([doc.titulo, doc.categoria, doc.autor, doc.localOriginal, doc.vinculo, doc.observacoes, doc.nomeArquivo].filter(Boolean).join(' '));
        return texto.includes(termo);
      });

    if (!docs.length) {
      const filtrado = Boolean(termo || categoriaAtiva !== 'Todos' || compromissoFiltroId);
      lista.innerHTML = filtrado
        ? '<div class="estado-vazio"><strong>Nenhum documento encontrado</strong><button type="button" class="botao botao--secundario" data-limpar-filtros>Limpar filtros</button></div>'
        : `<div class="estado-vazio"><strong>Nenhuma referência cadastrada</strong><p>Use Cadastrar referência para organizar um documento de ${escaparHtml(obterEstado().person?.apelido || obterEstado().person?.nome || 'quem recebe cuidado')}.</p></div>`;
      return;
    }

    lista.innerHTML = docs.map(doc => {
      const icone = ICONES_CATEGORIA[doc.categoria] || 'icone-documento.svg';
      const dataRotulo = formatarDataCurtaDoc(doc.dia);
      const verbo = doc.categoria === 'Receita' ? 'Adicionada por' : 'Adicionado por';
      return `<article class="documentos__item">
        <span class="documentos__icone" aria-hidden="true">
          <img src="assets/media/icones/${icone}" alt="" width="20" height="20">
        </span>
        <div class="documentos__conteudo">
          <strong>${escaparHtml(doc.titulo)}</strong>
          <p>${escaparHtml(doc.categoria)}${dataRotulo ? ` · ${escaparHtml(dataRotulo)}` : ''}${doc.autor ? ` · ${verbo} ${escaparHtml(doc.autor)}` : ''}</p>
          ${doc.localOriginal ? `<p><strong></strong> ${escaparHtml(doc.localOriginal)}</p>` : ''}
          ${doc.vinculo ? `<p>${escaparHtml(doc.vinculo)}</p>` : ''}
        </div>
        <button type="button" class="botao botao--secundario" data-ver-documento="${escaparHtml(doc.id)}">Ver detalhes</button>
      </article>`;
    }).join('');
  };

  const abrirDetalhes = docId => {
    const doc = (obterEstado().documents || []).find(d => d.id === docId);
    const bloco = dialogoDetalhes?.querySelector('[data-detalhes-documento]');
    if (!doc || !dialogoDetalhes || !bloco) return;

    documentoEmFocoId = doc.id;
    const iconesDoc = {
      Receita: 'fa-solid fa-file-medical',
      Exame: 'fa-solid fa-vial',
      Documento: 'fa-regular fa-file-lines'
    };
    const iconeEl = dialogoDetalhes.querySelector('[data-detalhes-icone]');
    if (iconeEl) {
      iconeEl.innerHTML = `<i class="${iconesDoc[doc.categoria] || 'fa-regular fa-file-lines'}" aria-hidden="true"></i>`;
    }
    dialogoDetalhes.querySelector('#titulo-detalhes-documento').textContent = doc.titulo;
    const dataTexto = doc.dia ? formatarDataCurta(doc.dia, true) : 'Data não informada';
    const pessoaEl = dialogoDetalhes.querySelector('[data-detalhes-pessoa]');
    if (pessoaEl) pessoaEl.textContent = `${core.nomePessoaAcompanhada()} · ${doc.categoria} · ${dataTexto}`;
    const adicionada = doc.categoria === 'Receita' ? 'Adicionada por' : 'Adicionado por';
    const compromisso = doc.compromissoId
      ? (core.obterCompromissos ? core.obterCompromissos() : (obterEstado().events || [])).find(e => e.id === doc.compromissoId)
      : null;

    const secao = (titulo, icone, texto) => texto ? `<div class="dialogo-mvp__secao">
      <p class="dialogo-mvp__secao-titulo">${escaparHtml(titulo)}</p>
      <div class="dialogo-mvp__linha-info">
        <span class="dialogo-mvp__icone dialogo-mvp__icone--sm" aria-hidden="true"><i class="${icone}"></i></span>
        <span>${escaparHtml(texto)}</span>
      </div>
    </div>` : '';

    const textoAtendimento = compromisso
      ? `${formatarDataCurta(compromisso.dia)} · ${compromisso.hora.replace(':00', 'h')} · ${compromisso.titulo}`
      : (doc.vinculo || '');
    const textoObservacoes = [doc.observacoes, doc.nomeArquivo ? `Arquivo: ${doc.nomeArquivo}` : '']
      .filter(Boolean)
      .join(' · ');

    bloco.innerHTML = [
      secao(adicionada, 'fa-regular fa-user', doc.autor || 'Não informado'),
      secao('Onde encontrar o original', 'fa-regular fa-folder-open', doc.localOriginal),
      secao('Atendimento vinculado', 'fa-regular fa-calendar', textoAtendimento),
      secao('Observações', 'fa-regular fa-note-sticky', textoObservacoes)
    ].filter(Boolean).join('');
    const botaoAtendimento = dialogoDetalhes.querySelector('[data-ver-atendimento]');
    if (botaoAtendimento) {
      if (compromisso) {
        botaoAtendimento.hidden = false;
        botaoAtendimento.textContent = 'Ver atendimento';
        botaoAtendimento.href = `agenda.html?dia=${encodeURIComponent(compromisso.dia)}&compromisso=${encodeURIComponent(compromisso.id)}`;
      } else if (doc.vinculo) {
        botaoAtendimento.hidden = false;
        botaoAtendimento.textContent = 'Abrir Agenda';
        botaoAtendimento.href = 'agenda.html';
      } else {
        botaoAtendimento.hidden = true;
      }
    }
    dialogoDetalhes.showModal();
    const tituloDetalhes = dialogoDetalhes.querySelector('#titulo-detalhes-documento');
    if (tituloDetalhes) {
      tituloDetalhes.setAttribute('tabindex', '-1');
      tituloDetalhes.focus({ preventScroll: true });
    }
  };

  campoBusca?.addEventListener('input', renderizar);

  core.vincularFiltro(filtrosCategoria, '[data-documentos-filtro]', botao => {
    categoriaAtiva = botao.dataset.documentosFiltro;
    renderizar();
  });

  pagina.addEventListener('click', async evento => {
    const botao = evento.target.closest('button');
    if (!botao) return;

    if (botao.hasAttribute('data-limpar-filtros')) {
      compromissoFiltroId = '';
      campoBusca.value = '';
      filtrosCategoria.querySelector('[data-documentos-filtro="Todos"]').click();
      campoBusca.focus();
      return;
    }

    if (botao.hasAttribute('data-fechar-dialogo')) {
      botao.closest('dialog')?.close();
      return;
    }

    if (botao.dataset.verDocumento) {
      abrirDetalhes(botao.dataset.verDocumento);
      return;
    }

    if (botao.dataset.dialogo === 'dialogo-adicionar-documento') {
      abrirFormularioDocumento(null);
      return;
    }

    if (botao.hasAttribute('data-editar-documento')) {
      const doc = (obterEstado().documents || []).find(d => d.id === documentoEmFocoId);
      dialogoDetalhes?.close();
      if (doc) abrirFormularioDocumento(doc);
      return;
    }

    if (botao.hasAttribute('data-excluir-documento')) {
      const doc = (obterEstado().documents || []).find(d => d.id === documentoEmFocoId);
      if (!doc) return;
      const confirmado = await core.confirmarAcao({
        titulo: 'Excluir documento',
        descricao: `Deseja excluir a referência “${doc.titulo}”?`,
        confirmarTexto: 'Excluir'
      });
      if (!confirmado) return;
      atualizarEstado(estado => ({
        ...estado,
        documents: (estado.documents || []).filter(d => d.id !== doc.id)
      }));
      botao.closest('dialog')?.close();
      anunciarStatus(elementoStatus, `Referência "${doc.titulo}" excluída.`);
      renderizar();
      campoBusca?.focus();
    }
  });

  formDocumento?.addEventListener('input', evento => {
    if (evento.target.hasAttribute('aria-invalid')) {
      evento.target.removeAttribute('aria-invalid');
      if (erroDocumento) erroDocumento.textContent = '';
    }
  });

  formDocumento?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const campos = Object.fromEntries(new FormData(form));
    const titulo = (campos.titulo || '').trim();
    const autor = (campos.autor || '').trim();
    limparErrosDocumento();

    if (!titulo) {
      if (erroDocumento) erroDocumento.textContent = 'Informe o título do documento.';
      form.elements.titulo.setAttribute('aria-invalid', 'true');
      form.elements.titulo.focus();
      return;
    }
    if (!campos.dia) {
      if (erroDocumento) erroDocumento.textContent = 'Informe a data do documento.';
      form.elements.dia.setAttribute('aria-invalid', 'true');
      form.elements.dia.focus();
      return;
    }
    if (!autor) {
      if (erroDocumento) erroDocumento.textContent = 'Informe quem adicionou o documento.';
      form.elements.autor.setAttribute('aria-invalid', 'true');
      form.elements.autor.focus();
      return;
    }

    const nomeArquivo = (campos.nomeArquivo || '').trim();
    const localOriginal = (campos.localOriginal || '').trim();
    const compromissoId = (campos.compromissoId || '').trim();
    const idEdicao = (campos.id || '').trim();

    if (idEdicao) {
      atualizarEstado(estado => ({
        ...estado,
        documents: (estado.documents || []).map(d => (d.id === idEdicao
          ? {
            ...d,
            titulo,
            categoria: campos.categoria || 'Documento',
            dia: campos.dia,
            autor,
            compromissoId,
            vinculo: (campos.vinculo || '').trim(),
            localOriginal,
            observacoes: (campos.observacoes || '').trim(),
            nomeArquivo
          }
          : d))
      }));
      anunciarStatus(elementoStatus, `Documento "${titulo}" atualizado.`);
    } else {
      const novoDoc = {
        id: `doc-${Date.now()}`,
        titulo,
        categoria: campos.categoria || 'Documento',
        dia: campos.dia || HOJE,
        autor,
        compromissoId,
        vinculo: (campos.vinculo || '').trim(),
        localOriginal,
        observacoes: (campos.observacoes || '').trim(),
        nomeArquivo
      };

      atualizarEstado(estado => ({
        ...estado,
        documents: [novoDoc, ...(estado.documents || [])]
      }));
      anunciarStatus(elementoStatus, `Documento "${titulo}" adicionado.`);
    }

    form.reset();
    if (form.elements.id) form.elements.id.value = '';
    if (form.elements.dia) form.elements.dia.value = HOJE;
    popularSelectAutor(obterUsuarioAtual().nomeComApelido);
    dialogoAdicionar.close();
    renderizar();
  });

  popularSelectAutor();
  popularSelectCompromissos();
  window.addEventListener('mutirao:perfil-atualizado', () => popularSelectAutor());
  renderizar();
  const idInicial = new URLSearchParams(location.search).get('documento');
  if (idInicial) abrirDetalhes(idInicial);
});
