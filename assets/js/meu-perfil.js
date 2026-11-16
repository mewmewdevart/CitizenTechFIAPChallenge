(() => {
  const pagina = document.querySelector('[data-pagina-mvp="meu-perfil"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const { obterEstado, atualizarEstado, anunciarStatus } = core;

  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const grupoHumor = pagina.querySelector('[data-cuidar-humor]');
  const retorno = pagina.querySelector('[data-cuidar-retorno]');
  const retornoTitulo = pagina.querySelector('[data-cuidar-retorno-titulo]');
  const retornoTexto = pagina.querySelector('[data-cuidar-retorno-texto]');
  const avisoFamilia = pagina.querySelector('[data-cuidar-aviso-familia]');
  const dialogoRecado = document.getElementById('dialogo-recado');
  const formRecado = pagina.querySelector('[data-formulario-mvp="recado"]');
  const formPerfil = pagina.querySelector('[data-formulario-mvp="perfil"]');

  const RETORNOS_HUMOR = {
    bem: ['Que bom saber', 'Se a semana pesar, é só marcar de novo.'],
    cansado: ['Obrigado por contar', 'Cinco noites seguidas cansam mesmo. Que tal pedir para alguém ficar numa delas?'],
    sobrecarregado: ['Obrigado por contar', 'Você não precisa dar conta de tudo sozinho. Peça uma folga ou converse com alguém da família.']
  };

  const CUIDAR_INICIAL = {
    humor: 'cansado',
    preferencias: { avisarFamilia: false, pausa: true, apoio: true, agradecer: false }
  };

  const obterCuidar = () => {
    const salvo = obterEstado().cuidar || {};
    return { ...CUIDAR_INICIAL, ...salvo, preferencias: { ...CUIDAR_INICIAL.preferencias, ...(salvo.preferencias || {}) } };
  };

  const salvarCuidar = alteracao => {
    atualizarEstado(estado => {
      const atual = estado.cuidar || CUIDAR_INICIAL;
      return { ...estado, cuidar: { ...atual, ...alteracao(atual) } };
    });
  };

  const renderizarHumor = humor => {
    const mensagem = RETORNOS_HUMOR[humor];
    retorno.hidden = !mensagem;
    if (!mensagem) return;
    [retornoTitulo.textContent, retornoTexto.textContent] = mensagem;
  };

  const renderizarAvisoFamilia = ligado => {
    avisoFamilia.textContent = ligado
      ? 'Ligado. A família recebe um aviso se você marcar “sobrecarregado”.'
      : 'Desligado. Você decide se e quando contar.';
  };

  const renderizarPerfil = () => {
    const perfil = obterEstado().perfilUsuario;
    if (!perfil) return;
    pagina.querySelector('[data-perfil-nome]').textContent = `${perfil.nome}${perfil.apelido ? ` (${perfil.apelido})` : ''}`;
    for (const campo of ['nome', 'email', 'telefone']) {
      const destino = pagina.querySelector(`[data-perfil-campo="${campo}"]`);
      if (destino && perfil[campo]) destino.textContent = perfil[campo];
      if (formPerfil?.elements[campo]) formPerfil.elements[campo].value = perfil[campo] || '';
    }
    if (formPerfil?.elements.apelido) formPerfil.elements.apelido.value = perfil.apelido || '';
  };

  const iniciar = () => {
    const cuidar = obterCuidar();
    const opcao = grupoHumor.querySelector(`input[value="${cuidar.humor}"]`);
    if (opcao) opcao.checked = true;
    renderizarHumor(cuidar.humor);
    for (const chave of pagina.querySelectorAll('[data-cuidar-preferencia]')) {
      chave.checked = Boolean(cuidar.preferencias[chave.dataset.cuidarPreferencia]);
    }
    renderizarAvisoFamilia(cuidar.preferencias.avisarFamilia);
    renderizarPerfil();
  };

  grupoHumor.addEventListener('change', evento => {
    const humor = evento.target.value;
    renderizarHumor(humor);
    salvarCuidar(() => ({ humor }));
    if (humor === 'sobrecarregado' && obterCuidar().preferencias.avisarFamilia) {
      anunciarStatus(elementoStatus, 'A família foi avisada de que você está sobrecarregado.');
    }
  });

  for (const chave of pagina.querySelectorAll('[data-cuidar-preferencia]')) {
    chave.addEventListener('change', () => {
      const nome = chave.dataset.cuidarPreferencia;
      salvarCuidar(atual => ({ preferencias: { ...CUIDAR_INICIAL.preferencias, ...(atual.preferencias || {}), [nome]: chave.checked } }));
      if (nome === 'avisarFamilia') renderizarAvisoFamilia(chave.checked);
    });
  }

  const abrirRecado = para => {
    if (!dialogoRecado || !formRecado) return;
    if (para) {
      const opcao = formRecado.querySelector(`input[name="para"][value="${para}"]`);
      if (opcao) opcao.checked = true;
      if (para !== 'Aninha') formRecado.elements.recado.value = '';
    }
    dialogoRecado.showModal();
  };

  pagina.addEventListener('click', evento => {
    const botao = evento.target.closest('button');
    if (!botao) return;

    if (botao.hasAttribute('data-fechar-dialogo')) {
      botao.closest('dialog')?.close();
      return;
    }
    if (botao.hasAttribute('data-abrir-recado')) {
      abrirRecado(botao.dataset.abrirRecado);
      return;
    }
    if (botao.hasAttribute('data-ideia-recado')) {
      const campo = formRecado.elements.recado;
      campo.value = botao.textContent.trim();
      campo.focus();
    }
  });

  formRecado?.addEventListener('submit', evento => {
    evento.preventDefault();
    const para = formRecado.elements.para.value;
    const texto = formRecado.elements.recado.value.trim();
    if (!texto) return;
    atualizarEstado(estado => ({
      ...estado,
      recadosEnviados: [...(estado.recadosEnviados || []), { para, texto, em: new Date().toISOString() }]
    }));
    dialogoRecado.close();
    anunciarStatus(elementoStatus, `Recado enviado para ${para}.`);
  });

  pagina.querySelector('[data-formulario-mvp="folga"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const turno = form.elements.turno.value;
    atualizarEstado(estado => ({
      ...estado,
      pedidosFolga: [...(estado.pedidosFolga || []), { turno, recado: form.elements.recado.value.trim() }]
    }));
    form.closest('dialog')?.close();
    anunciarStatus(elementoStatus, `Pedido de folga enviado: ${turno}. Você será avisado quando alguém aceitar.`);
  });

  formPerfil?.addEventListener('submit', evento => {
    evento.preventDefault();
    const campos = Object.fromEntries(new FormData(formPerfil));
    const nome = (campos.nome || '').trim();
    if (!nome) return;
    atualizarEstado(estado => ({
      ...estado,
      perfilUsuario: {
        nome,
        apelido: (campos.apelido || '').trim(),
        email: (campos.email || '').trim(),
        telefone: (campos.telefone || '').trim()
      }
    }));
    formPerfil.closest('dialog')?.close();
    renderizarPerfil();
    anunciarStatus(elementoStatus, 'Alterações salvas.');
  });

  iniciar();
})();
