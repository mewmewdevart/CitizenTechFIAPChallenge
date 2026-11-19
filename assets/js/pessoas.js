window.MutiraoCuidadoPronto.then(core => {
  if (!core) return;
  const pagina = document.querySelector('[data-pagina-mvp="pessoas"]');
  if (!pagina) return;

  const { obterEstado, atualizarEstado, escaparHtml, anunciarStatus } = core;

  const lista = pagina.querySelector('[data-participantes]');
  const secaoConvites = pagina.querySelector('[data-secao-convites]');
  const listaConvites = pagina.querySelector('[data-convites-lista]');
  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const dialogoEnviado = document.getElementById('dialogo-convite-enviado');
  const formConvite = pagina.querySelector('[data-formulario-mvp="convite"]');
  const erroConvite = pagina.querySelector('[data-erro-convite]');

  const obterConvites = () => obterEstado().convites || [];

  const montarItemPessoa = pessoa => {
    const imagem = pessoa.foto
      ? `<img class="avatar" src="${escaparHtml(pessoa.foto)}" alt="">`
      : pessoa.avatar
        ? `<img class="avatar" src="assets/media/mascotes/${escaparHtml(pessoa.avatar)}" alt="">`
        : '<span class="painel__icone" aria-hidden="true"><i class="fa-regular fa-envelope"></i></span>';
    const acao = pessoa.perfil
      ? `<a class="botao botao--secundario" href="${escaparHtml(pessoa.perfil)}">Ver perfil</a>`
      : pessoa.pendente
        ? `<div class="painel__acoes"><button type="button" class="botao botao--secundario" data-aceitar-convite="${escaparHtml(pessoa.nome)}">Simular aceite</button><button type="button" class="botao botao--secundario" data-recusar-convite="${escaparHtml(pessoa.nome)}">Simular recusa</button><button type="button" class="botao botao--perigo botao--pequeno" data-cancelar-convite="${escaparHtml(pessoa.nome)}">Cancelar convite</button></div>`
        : `<button type="button" class="botao botao--secundario" disabled>Ver perfil</button>`;
    const situacao = pessoa.pendente
      ? `<span class="selo selo--atencao">${escaparHtml(pessoa.situacao)}</span>`
      : pessoa.perfil
        ? `<span>${escaparHtml(pessoa.situacao)}</span>`
        : '';
    return `<li class="painel__item">
      ${imagem}
      <span class="painel__texto"><strong>${escaparHtml(pessoa.nome)}</strong><span>Vínculo: ${escaparHtml(pessoa.vinculo || 'Não informado')} · Papel: ${escaparHtml(pessoa.papel)}</span>${situacao}</span>
      ${acao}
    </li>`;
  };

  const renderizar = () => {
    const participantes = core.obterParticipantesRede().map(pessoa => ({
      ...pessoa,
      situacao: pessoa.ehUsuarioAtual ? 'Você' : 'Ativo na rede'
    }));
    const convites = obterConvites().map(convite => ({
      nome: convite.email,
      vinculo: convite.vinculo,
      papel: convite.papel,
      situacao: 'Convite simulado',
      pendente: true
    }));

    lista.innerHTML = participantes.map(montarItemPessoa).join('');
    if (!participantes.some(pessoa => !pessoa.ehUsuarioAtual)) {
      lista.insertAdjacentHTML('beforeend', '<li class="estado-vazio">A rede ainda não tem outros participantes. Use “Convidar alguém” para incluir uma pessoa.</li>');
    }
    if (secaoConvites && listaConvites) {
      secaoConvites.hidden = convites.length === 0;
      listaConvites.innerHTML = convites.map(montarItemPessoa).join('');
    }
  };

  pagina.addEventListener('click', async evento => {
    const botao = evento.target.closest('[data-fechar-dialogo]');
    if (botao) {
      botao.closest('dialog')?.close();
      return;
    }

    const decisao = evento.target.closest('[data-aceitar-convite], [data-recusar-convite]');
    if (decisao) {
      const aceitar = decisao.hasAttribute('data-aceitar-convite');
      core.resolverConvite(decisao.dataset.aceitarConvite || decisao.dataset.recusarConvite, aceitar);
      renderizar();
      anunciarStatus(elementoStatus, aceitar ? 'Aceite simulado: participante adicionado à rede e aos seletores.' : 'Recusa simulada: convite encerrado.');
      secaoConvites?.querySelector('button')?.focus();
      return;
    }

    const cancelar = evento.target.closest('[data-cancelar-convite]');
    if (cancelar) {
      const emailAlvo = cancelar.dataset.cancelarConvite;
      const confirmado = await core.confirmarAcao({
        titulo: 'Cancelar convite',
        descricao: `Deseja cancelar o convite de demonstração para ${emailAlvo}?`,
        confirmarTexto: 'Cancelar convite'
      });
      if (!confirmado) return;
      atualizarEstado(estado => ({
        ...estado,
        convites: (estado.convites || []).filter(c => c.email !== emailAlvo)
      }));
      anunciarStatus(elementoStatus, `Convite para ${emailAlvo} cancelado.`);
      renderizar();
    }
  });

  formConvite?.addEventListener('submit', evento => {
    evento.preventDefault();
    const campos = Object.fromEntries(new FormData(formConvite));
    const email = (campos.email || '').trim().toLowerCase();
    const vinculo = (campos.vinculo || '').trim();
    const emailCampo = formConvite.elements.email;
    const vinculoCampo = formConvite.elements.vinculo;

    core.limparErrosFormulario?.(formConvite);
    if (!email || !emailCampo.checkValidity()) {
      core.marcarErroFormulario?.(formConvite, emailCampo, 'Informe um e-mail válido para o convite.');
      return;
    }
    if (!vinculo) {
      core.marcarErroFormulario?.(formConvite, vinculoCampo, 'Informe o parentesco ou vínculo com a pessoa.');
      return;
    }

    if (obterConvites().some(convite => convite.email === email) || (obterEstado().participantesExtras || []).some(pessoa => pessoa.email === email)) {
      core.marcarErroFormulario?.(formConvite, emailCampo, 'Já existe um convite de demonstração para este e-mail.');
      return;
    }

    atualizarEstado(estado => ({
      ...estado,
      convites: [...(estado.convites || []), { email, vinculo, papel: campos.papel }]
    }));

    formConvite.reset();
    formConvite.closest('dialog')?.close();
    dialogoEnviado.querySelector('[data-convite-resumo]').textContent = `${email} foi registrado nesta demonstração. Nenhum convite foi enviado.`;
    dialogoEnviado.showModal();
    renderizar();
  });

  renderizar();
});
