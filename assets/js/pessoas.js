(() => {
  const pagina = document.querySelector('[data-pagina-mvp="pessoas"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const { obterEstado, atualizarEstado, escaparHtml, anunciarStatus } = core;

  const lista = pagina.querySelector('[data-participantes]');
  const secaoConvites = pagina.querySelector('[data-secao-convites]');
  const listaConvites = pagina.querySelector('[data-convites-lista]');
  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const dialogoEnviado = document.getElementById('dialogo-convite-enviado');
  const formConvite = pagina.querySelector('[data-formulario-mvp="convite"]');
  const erroConvite = pagina.querySelector('[data-erro-convite]');

  const PARTICIPANTES = [
    { nome: 'Zé da Manga (Zé)', vinculo: 'Neto', papel: 'Administrador', situacao: 'Você', avatar: 'icone-mascote-cubado.svg', perfil: 'meu-perfil.html' },
    { nome: 'Ana da Silva (Aninha)', vinculo: 'Filha · Contato de referência', papel: 'Participante', situacao: 'Ativo na rede', avatar: 'icone-mascote-espeto.svg' },
    { nome: 'Beatriz da Silva (Bea)', vinculo: 'Cuidadora', papel: 'Participante', situacao: 'Ativo na rede', avatar: 'icone-mascote-trevo.svg' },
    { nome: 'Paulo da Silva (Paul)', vinculo: 'Neto', papel: 'Participante', situacao: 'Ativo na rede', avatar: 'icone-mascote-pingo.svg' }
  ];

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
        ? `<button type="button" class="botao botao--perigo botao--pequeno" data-cancelar-convite="${escaparHtml(pessoa.nome)}" aria-label="Cancelar convite para ${escaparHtml(pessoa.nome)}">Cancelar convite</button>`
        : `<button type="button" class="botao botao--secundario" disabled title="Perfil disponível em breve" aria-label="Ver perfil de ${escaparHtml(pessoa.nome)} (disponível em breve)">Ver perfil</button>`;
    const situacao = pessoa.pendente
      ? `<span class="selo selo--atencao">${escaparHtml(pessoa.situacao)}</span>`
      : pessoa.perfil
        ? `<span>${escaparHtml(pessoa.situacao)}</span>`
        : '';
    return `<li class="painel__item">
      ${imagem}
      <span class="painel__texto"><strong>${escaparHtml(pessoa.nome)}</strong><span>Vínculo: ${escaparHtml(pessoa.vinculo)} · Papel: ${escaparHtml(pessoa.papel)}</span>${situacao}</span>
      ${acao}
    </li>`;
  };

  const renderizar = () => {
    const perfil = obterEstado().perfilUsuario;
    const participantes = PARTICIPANTES.map((pessoa, indice) => {
      if (indice !== 0 || !perfil) return pessoa;
      const nome = `${perfil.nome || 'Zé da Manga'}${perfil.apelido ? ` (${perfil.apelido})` : ''}`;
      return {
        ...pessoa,
        nome,
        foto: perfil.foto || '',
        avatar: perfil.mascote ? perfil.mascote.split('/').pop() : pessoa.avatar
      };
    });

    const convites = obterConvites().map(convite => ({
      nome: convite.email,
      vinculo: convite.vinculo,
      papel: convite.papel,
      situacao: 'Convite simulado',
      pendente: true
    }));

    lista.innerHTML = participantes.map(montarItemPessoa).join('');
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
    const emailCampo = formConvite.elements.email;

    if (obterConvites().some(convite => convite.email === email)) {
      erroConvite.textContent = 'Já existe um convite de demonstração para este e-mail.';
      emailCampo.setAttribute('aria-invalid', 'true');
      emailCampo.focus();
      return;
    }

    erroConvite.textContent = '';
    emailCampo.removeAttribute('aria-invalid');
    atualizarEstado(estado => ({
      ...estado,
      convites: [...(estado.convites || []), { email, vinculo: campos.vinculo.trim(), papel: campos.papel }]
    }));

    formConvite.reset();
    formConvite.closest('dialog')?.close();
    dialogoEnviado.querySelector('[data-convite-resumo]').textContent = `${email} foi registrado nesta demonstração. Nenhum convite foi enviado.`;
    dialogoEnviado.showModal();
    renderizar();
  });

  renderizar();
})();
