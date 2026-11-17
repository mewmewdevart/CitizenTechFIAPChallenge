(() => {
  const pagina = document.querySelector('[data-pagina-mvp="documentos"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const {
    HOJE,
    EQUIPE_CUIDADO,
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

  const limparErrosDocumento = () => {
    if (erroDocumento) erroDocumento.textContent = '';
    formDocumento?.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  };

  const popularSelectAutor = (valorSelecionado = '') => {
    const select = formDocumento?.elements?.autor;
    if (!select) return;
    const usuario = obterUsuarioAtual();
    const pessoasRede = (EQUIPE_CUIDADO || []).map(pessoa =>
      pessoa.nome === 'Zé da Manga' ? usuario.nomeComApelido : pessoa.nome
    );
    const opcoes = [...new Set(pessoasRede)].filter(nome =>
      nome && !/maria das dores|\(mari\)/i.test(nome)
    );
    if (valorSelecionado && !opcoes.includes(valorSelecionado)) {
      opcoes.push(valorSelecionado);
    }
    select.innerHTML = opcoes
      .map(nome => `<option value="${escaparHtml(nome)}">${escaparHtml(nome)}</option>`)
      .join('');
    select.value = valorSelecionado || usuario.nomeComApelido;
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
    formDocumento.elements.vinculo.value = doc?.vinculo || '';
    formDocumento.elements.observacoes.value = doc?.observacoes || '';
    if (tituloDialogoDoc) {
      tituloDialogoDoc.textContent = doc ? 'Editar documento da Mari' : 'Adicionar documento da Mari';
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
    const termo = core.normalizarBusca(campoBusca?.value);
    const docs = [...(obterEstado().documents || [])]
      .sort((a, b) => (b.dia || '').localeCompare(a.dia || ''))
      .filter(doc => {
        if (categoriaAtiva !== 'Todos' && doc.categoria !== categoriaAtiva) return false;
        if (!termo) return true;
        const texto = core.normalizarBusca([doc.titulo, doc.categoria, doc.autor, doc.vinculo, doc.observacoes].filter(Boolean).join(' '));
        return texto.includes(termo);
      });

    if (!docs.length) {
      const textoVazio = termo || categoriaAtiva !== 'Todos'
        ? 'Nenhum documento encontrado para os filtros aplicados.'
        : 'Nenhum documento cadastrado ainda.';
      lista.innerHTML = `<div class="estado-vazio"><strong>Sem resultados</strong><p>${textoVazio}</p></div>`;
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
          ${doc.vinculo ? `<p>${escaparHtml(doc.vinculo)}</p>` : ''}
        </div>
        <button type="button" class="botao botao--secundario" data-ver-documento="${escaparHtml(doc.id)}">Ver detalhes</button>
      </article>`;
    }).join('');
  };

  const abrirDetalhes = docId => {
    const doc = (obterEstado().documents || []).find(d => d.id === docId);
    const dl = dialogoDetalhes?.querySelector('[data-detalhes-documento]');
    if (!doc || !dialogoDetalhes || !dl) return;

    documentoEmFocoId = doc.id;
    dialogoDetalhes.querySelector('#titulo-detalhes-documento').textContent = doc.titulo;
    dl.innerHTML = `
      <div><dt>Categoria</dt><dd>${escaparHtml(doc.categoria)}</dd></div>
      <div><dt>Data</dt><dd>${escaparHtml(doc.dia ? formatarDataCurta(doc.dia, true) : 'Não informada')}</dd></div>
      <div><dt>Adicionado por</dt><dd>${escaparHtml(doc.autor || 'Não informado')}</dd></div>
      <div><dt>Vínculo / Assunto</dt><dd>${escaparHtml(doc.vinculo || 'Documento geral')}</dd></div>
      ${doc.observacoes ? `<div><dt>Observações</dt><dd>${escaparHtml(doc.observacoes)}</dd></div>` : ''}
      ${doc.nomeArquivo ? `<div><dt>Arquivo anexado</dt><dd>${escaparHtml(doc.nomeArquivo)}</dd></div>` : ''}
    `;
    dialogoDetalhes.showModal();
  };

  campoBusca?.addEventListener('input', renderizar);

  core.vincularFiltro(filtrosCategoria, '[data-documentos-filtro]', botao => {
    categoriaAtiva = botao.dataset.documentosFiltro;
    renderizar();
  });

  pagina.addEventListener('click', evento => {
    const botao = evento.target.closest('button');
    if (!botao) return;

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
      atualizarEstado(estado => ({
        ...estado,
        documents: (estado.documents || []).filter(d => d.id !== doc.id)
      }));
      botao.closest('dialog')?.close();
      anunciarStatus(elementoStatus, `Documento "${doc.titulo}" removido.`);
      renderizar();
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

    const arquivo = form.elements.arquivo?.files?.[0];
    if (arquivo && (!/\.(pdf|jpe?g|png)$/i.test(arquivo.name)
      || (arquivo.type && !['application/pdf', 'image/jpeg', 'image/png'].includes(arquivo.type))
      || arquivo.size > 10 * 1024 * 1024)) {
      form.elements.arquivo.setAttribute('aria-invalid', 'true');
      const aviso = pagina.querySelector('#dialogo-arquivo-invalido');
      aviso.addEventListener('close', () => form.elements.arquivo.focus(), { once: true });
      aviso.showModal();
      return;
    }
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
            vinculo: (campos.vinculo || '').trim(),
            observacoes: (campos.observacoes || '').trim(),
            nomeArquivo: arquivo ? arquivo.name : (d.nomeArquivo || '')
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
        vinculo: (campos.vinculo || '').trim(),
        observacoes: (campos.observacoes || '').trim(),
        nomeArquivo: arquivo ? arquivo.name : ''
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
  window.addEventListener('mutirao:perfil-atualizado', () => popularSelectAutor());
  renderizar();
  const idInicial = new URLSearchParams(location.search).get('documento');
  if (idInicial) abrirDetalhes(idInicial);
})();
