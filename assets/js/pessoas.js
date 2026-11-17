(() => {
  const pagina = document.querySelector('[data-pagina-mvp="pessoas"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const { obterEstado, atualizarEstado, escaparHtml } = core;

  const lista = pagina.querySelector('[data-participantes]');
  const dialogoEnviado = document.getElementById('dialogo-convite-enviado');
  const formConvite = pagina.querySelector('[data-formulario-mvp="convite"]');
  const erroConvite = pagina.querySelector('[data-erro-convite]');

  const PARTICIPANTES = [
    { nome: 'Zé da Manga (Zé)', papel: 'Neto · Administrador', situacao: 'Você', avatar: 'icone-mascote-cubado.svg', perfil: 'meu-perfil.html' },
    { nome: 'Ana da Silva (Aninha)', papel: 'Filha · Contato de referência · Participante', situacao: 'Convite aceito', avatar: 'icone-mascote-espeto.svg' },
    { nome: 'Beatriz da Silva (Bea)', papel: 'Cuidadora · Participante', situacao: 'Convite aceito', avatar: 'icone-mascote-trevo.svg' },
    { nome: 'Paulo da Silva (Paul)', papel: 'Neto · Participante', situacao: 'Convite aceito', avatar: 'icone-mascote-pingo.svg' }
  ];

  const obterConvites = () => obterEstado().convites || [];

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
      papel: `${convite.vinculo} · ${convite.papel}`,
      situacao: 'Aguardando aceite',
      pendente: true
    }));

    lista.innerHTML = [...participantes, ...convites].map(pessoa => {
      const imagem = pessoa.foto
        ? `<img class="avatar" src="${escaparHtml(pessoa.foto)}" alt="">`
        : pessoa.avatar
          ? `<img class="avatar" src="assets/media/mascotes/${escaparHtml(pessoa.avatar)}" alt="">`
          : '<span class="painel__icone" aria-hidden="true"><i class="fa-regular fa-envelope"></i></span>';
      const acao = pessoa.perfil
        ? `<a class="botao botao--secundario" href="${escaparHtml(pessoa.perfil)}">Ver perfil</a>`
        : `<button type="button" class="botao botao--secundario" aria-disabled="true" aria-label="Ver perfil de ${escaparHtml(pessoa.nome)}, disponível quando a pessoa compartilhar o perfil">Ver perfil</button>`;
      const situacao = pessoa.pendente
        ? `<span class="selo selo--atencao">${escaparHtml(pessoa.situacao)}</span>`
        : `<span>${escaparHtml(pessoa.situacao)}</span>`;
      return `<li class="painel__item">
        ${imagem}
        <span class="painel__texto"><strong>${escaparHtml(pessoa.nome)}</strong><span>${escaparHtml(pessoa.papel)}</span>${situacao}</span>
        ${acao}
      </li>`;
    }).join('');
  };

  pagina.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-fechar-dialogo]');
    if (botao) botao.closest('dialog')?.close();
  });

  formConvite?.addEventListener('submit', evento => {
    evento.preventDefault();
    const campos = Object.fromEntries(new FormData(formConvite));
    const email = (campos.email || '').trim().toLowerCase();
    const emailCampo = formConvite.elements.email;

    if (obterConvites().some(convite => convite.email === email)) {
      erroConvite.textContent = 'Convite já enviado para este e-mail. Aguarde o aceite da pessoa.';
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
    dialogoEnviado.querySelector('[data-convite-resumo]').textContent = `${email} terá acesso à rede após aceitar o convite.`;
    dialogoEnviado.showModal();
    renderizar();
  });

  renderizar();
})();
