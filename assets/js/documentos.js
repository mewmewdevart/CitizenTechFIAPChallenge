(() => {
  const pagina = document.querySelector('[data-pagina-mvp="documentos"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

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
  const filtrosCategoria = pagina.querySelectorAll('[data-documentos-filtro]');
  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const dialogoDetalhes = document.getElementById('dialogo-detalhes-documento');
  const dialogoAdicionar = document.getElementById('dialogo-adicionar-documento');
  let documentoEmFocoId = null;
  let categoriaAtiva = 'Todos';

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
    const termo = (campoBusca?.value || '').trim().toLowerCase();
    const docs = [...(obterEstado().documents || [])]
      .sort((a, b) => (b.dia || '').localeCompare(a.dia || ''))
      .filter(doc => {
        if (categoriaAtiva !== 'Todos' && doc.categoria !== categoriaAtiva) return false;
        if (!termo) return true;
        const texto = `${doc.titulo} ${doc.categoria} ${doc.autor} ${doc.vinculo} ${doc.observacoes}`.toLowerCase();
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

  filtrosCategoria.forEach(botao => {
    botao.addEventListener('click', () => {
      categoriaAtiva = botao.dataset.documentosFiltro || 'Todos';
      filtrosCategoria.forEach(item => {
        item.setAttribute('aria-pressed', String(item === botao));
      });
      renderizar();
    });
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

  dialogoAdicionar?.querySelector('[data-formulario-mvp="documento"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const campos = Object.fromEntries(new FormData(form));
    const titulo = (campos.titulo || '').trim();
    if (!titulo || !campos.dia) {
      anunciarStatus(elementoStatus, 'Preencha o título e a data do documento.');
      return;
    }

    const arquivo = form.elements.arquivo?.files?.[0];
    const novoDoc = {
      id: `doc-${Date.now()}`,
      titulo,
      categoria: campos.categoria || 'Documento',
      dia: campos.dia || HOJE,
      autor: (campos.autor || obterUsuarioAtual().nome).trim(),
      vinculo: (campos.vinculo || '').trim(),
      observacoes: (campos.observacoes || '').trim(),
      nomeArquivo: arquivo ? arquivo.name : ''
    };

    atualizarEstado(estado => ({
      ...estado,
      documents: [novoDoc, ...(estado.documents || [])]
    }));

    form.reset();
    if (form.elements.dia) form.elements.dia.value = HOJE;
    if (form.elements.autor) form.elements.autor.value = obterUsuarioAtual().nome;
    dialogoAdicionar.close();
    anunciarStatus(elementoStatus, `Documento "${titulo}" adicionado.`);
    renderizar();
  });

  renderizar();
})();
