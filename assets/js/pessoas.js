window.MutiraoCuidadoPronto.then(core => {
  if (!core) return;
  const pagina = document.querySelector('[data-pagina-mvp="pessoas"]');
  if (!pagina) return;

  const { obterEstado, escaparHtml, anunciarStatus } = core;

  const lista = pagina.querySelector('[data-participantes]');
  const secaoConvites = pagina.querySelector('[data-secao-convites]');
  const listaConvites = pagina.querySelector('[data-convites-lista]');
  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const dialogoRegistrado = document.getElementById('dialogo-convite-registrado');
  const botaoConvidar = pagina.querySelector('[data-dialogo="dialogo-convidar"]');
  const formConvite = pagina.querySelector('[data-formulario-mvp="convite"]');
  const erroConvite = pagina.querySelector('[data-erro-convite]');

  const podeConvidar = () => core.obterUsuarioAtual().papel === 'Administrador';

  const montarItemPessoa = pessoa => {
    const mascote = pessoa.avatar || 'icone-mascote-cubado.svg';
    const imagem = pessoa.foto
      ? `<img class="avatar" src="${escaparHtml(pessoa.foto)}" width="36" height="36" alt="" data-avatar-alternativo="assets/media/mascotes/${escaparHtml(mascote)}">`
      : pessoa.avatar
        ? `<img class="avatar" src="assets/media/mascotes/${escaparHtml(pessoa.avatar)}" alt="">`
        : '<span class="painel__icone" aria-hidden="true"><i class="fa-regular fa-envelope"></i></span>';
    const acao = pessoa.perfil
      ? `<a class="botao botao--secundario" href="${escaparHtml(pessoa.perfil)}">Ver perfil</a>`
      : '';
    const situacao = pessoa.situacao ? `<span>${escaparHtml(pessoa.situacao)}</span>` : '';
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
    const { convites, historicoConvites } = obterEstado();
    const podeGerenciar = podeConvidar();
    botaoConvidar.hidden = !podeGerenciar;
    const registros = [...convites.map(item => ({ ...item, status: 'Pendente' })), ...[...historicoConvites].reverse()];

    lista.innerHTML = participantes.map(montarItemPessoa).join('');
    if (!participantes.some(pessoa => !pessoa.ehUsuarioAtual)) {
      lista.insertAdjacentHTML('beforeend', '<li class="estado-vazio">A rede ainda não tem outros participantes. Convites pendentes aparecem na seção Convites da rede.</li>');
    }
    if (secaoConvites && listaConvites) {
      secaoConvites.hidden = !registros.length;
      listaConvites.innerHTML = registros.map(item => `
        <li class="painel__item">
          <span class="painel__icone" aria-hidden="true"><i class="fa-regular fa-envelope"></i></span>
          <span class="painel__texto">
            <strong>${escaparHtml(item.nome || item.email)}</strong>
            <span>${escaparHtml(item.vinculo || 'Vínculo não informado')} · ${escaparHtml(item.papel || 'Participante')}</span>
            <span class="selo ${item.status === 'Pendente' ? 'selo--atencao' : 'selo--neutro'}">${escaparHtml(item.status)}</span>
          </span>
          ${item.status === 'Pendente' && podeGerenciar ? `
            <button type="button" class="botao botao--secundario" data-cancelar-convite="${escaparHtml(item.email)}">Cancelar convite</button>` : ''}
        </li>`).join('');
    }
  };

  pagina.addEventListener('click', async evento => {
    const botao = evento.target.closest('[data-fechar-dialogo]');
    if (botao) {
      botao.closest('dialog')?.close();
      return;
    }

    const cancelar = evento.target.closest('[data-cancelar-convite]');
    if (cancelar) {
      const emailAlvo = cancelar.dataset.cancelarConvite;
      const confirmado = await core.confirmarAcao({
        titulo: 'Cancelar convite',
        descricao: `Deseja cancelar o convite para ${emailAlvo}?`,
        confirmarTexto: 'Cancelar convite'
      });
      if (!confirmado) return;
      try {
        core.cancelarConvite(emailAlvo);
        anunciarStatus(elementoStatus, `Convite para ${emailAlvo} cancelado.`);
        renderizar();
        (listaConvites.querySelector('[data-cancelar-convite]') || botaoConvidar).focus();
      } catch (erro) {
        anunciarStatus(elementoStatus, erro.message);
      }
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

    try {
      core.registrarConvite(email, vinculo);
    } catch (erro) {
      core.marcarErroFormulario?.(formConvite, emailCampo, erro.message);
      return;
    }

    formConvite.reset();
    formConvite.closest('dialog')?.close();
    dialogoRegistrado.querySelector('[data-convite-resumo]').textContent = `O convite para ${email} ficou pendente nesta aba. Nenhum e-mail foi enviado.`;
    dialogoRegistrado.showModal();
    renderizar();
  });

  renderizar();
});
