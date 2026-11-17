(() => {
  const pagina = document.querySelector('[data-pagina-mvp="meu-perfil"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const {
    HOJE,
    obterEstado,
    atualizarEstado,
    obterUsuarioAtual,
    construirLinhaDoTempoDia,
    formatarDataCurta,
    escaparHtml,
    anunciarStatus
  } = core;

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
      ? 'Ligado. Um aviso será simulado nesta aba.'
      : 'Desligado. Você decide se e quando contar.';
  };

  const MASCOTE_PADRAO = 'assets/media/mascotes/icone-mascote-cubado.svg';
  const CPF_MASCARADO = '***.***.***-00';
  const CPF_EXEMPLO = '123.456.789-00';
  const RECADO_TITULO_PADRAO = 'Prefiro mensagens';
  const RECADO_TEXTO_PADRAO = 'Para combinar trocas de turno, me mande uma mensagem antes de ligar.';

  const mascararCpf = valor => {
    const digitos = String(valor || '').replace(/\D/g, '');
    const finais = digitos.length >= 2 ? digitos.slice(-2) : '00';
    return `***.***.***-${finais}`;
  };

  const formatarNascimento = valor => {
    if (!valor) return '';
    const [ano, mes, dia] = valor.split('-').map(Number);
    if (!ano || !mes || !dia) return valor;
    const data = new Date(ano, mes - 1, dia);
    const dataTexto = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(data);
    const hoje = new Date(`${HOJE}T12:00:00`);
    let idade = hoje.getFullYear() - ano;
    if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade -= 1;
    return `${dataTexto} · ${idade} anos`;
  };

  const renderizarMascotesForm = caminhoSelecionado => {
    if (!formPerfil) return;
    if (formPerfil.elements.mascote) formPerfil.elements.mascote.value = caminhoSelecionado;
    for (const cartao of formPerfil.querySelectorAll('[data-mascote]')) {
      const ativo = cartao.dataset.mascote === caminhoSelecionado;
      cartao.setAttribute('aria-pressed', String(ativo));
      const rotulo = cartao.querySelector('span');
      if (rotulo) rotulo.textContent = ativo ? 'Selecionado' : 'Selecionar';
    }
  };

  const renderizarFotoForm = (foto, mascote) => {
    if (!formPerfil) return;
    const previa = formPerfil.querySelector('[data-foto-previa]');
    const botaoRemover = formPerfil.querySelector('[data-remover-foto]');
    const imagem = foto || mascote || MASCOTE_PADRAO;
    if (previa) previa.src = imagem;
    if (botaoRemover) botaoRemover.hidden = !foto;
  };

  const atualizarContadoresRecado = () => {
    if (!formPerfil) return;
    for (const [campo, limite] of [['recadoTitulo', 20], ['recadoTexto', 70]]) {
      const input = formPerfil.elements[campo];
      const contador = formPerfil.querySelector(`[data-contador="${campo}"]`);
      if (input && contador) contador.textContent = `${input.value.length}/${limite} caracteres`;
    }
  };

  const renderizarPerfil = () => {
    const perfil = obterEstado().perfilUsuario;
    if (!perfil) {
      atualizarContadoresRecado();
      return;
    }
    const mascote = perfil.mascote || MASCOTE_PADRAO;
    const avatarExibido = perfil.foto || mascote;

    const nomeCabecalho = pagina.querySelector('[data-perfil-nome]');
    if (nomeCabecalho) nomeCabecalho.textContent = `${perfil.nome}${perfil.apelido ? ` (${perfil.apelido})` : ''}`;

    const avatarPrincipal = pagina.querySelector('[data-perfil-avatar]');
    if (avatarPrincipal) avatarPrincipal.src = avatarExibido;

    const mascoteMiniatura = pagina.querySelector('[data-perfil-mascote]');
    if (mascoteMiniatura) {
      mascoteMiniatura.src = mascote;
      mascoteMiniatura.hidden = !perfil.foto;
    }

    const avatarRecado = pagina.querySelector('.perfil__recado-mascote');
    if (avatarRecado) avatarRecado.src = mascote;

    for (const campo of ['nome', 'email', 'telefone', 'endereco']) {
      const destino = pagina.querySelector(`[data-perfil-campo="${campo}"]`);
      if (destino && perfil[campo]) destino.textContent = perfil[campo];
      if (formPerfil?.elements[campo]) formPerfil.elements[campo].value = perfil[campo] || '';
    }
    const campoCpf = pagina.querySelector('[data-perfil-campo="cpf"]');
    const cpfMascarado = mascararCpf(perfil.cpf);
    if (campoCpf) campoCpf.textContent = cpfMascarado;
    if (formPerfil?.elements.cpf) formPerfil.elements.cpf.value = cpfMascarado;
    const campoNasc = pagina.querySelector('[data-perfil-campo="nascimento"]');
    if (campoNasc && perfil.nascimento) campoNasc.textContent = formatarNascimento(perfil.nascimento);
    if (formPerfil?.elements.nascimento && perfil.nascimento) formPerfil.elements.nascimento.value = perfil.nascimento;
    if (formPerfil?.elements.apelido) formPerfil.elements.apelido.value = perfil.apelido || '';

    const tituloRecado = (perfil.recadoTitulo || RECADO_TITULO_PADRAO).slice(0, 20);
    const tituloRecadoEl = pagina.querySelector('[data-perfil-recado-titulo]');
    if (tituloRecadoEl) tituloRecadoEl.textContent = tituloRecado;
    if (formPerfil?.elements.recadoTitulo) formPerfil.elements.recadoTitulo.value = tituloRecado;

    const textoRecado = (perfil.recadoTexto || RECADO_TEXTO_PADRAO).slice(0, 70);
    const textoRecadoEl = pagina.querySelector('[data-perfil-recado-texto]');
    if (textoRecadoEl) textoRecadoEl.textContent = textoRecado;
    if (formPerfil?.elements.recadoTexto) formPerfil.elements.recadoTexto.value = textoRecado;

    renderizarMascotesForm(mascote);
    renderizarFotoForm(perfil.foto || '', mascote);
    atualizarContadoresRecado();
  };

  const renderizarRecadosEnviados = () => {
    const container = pagina.querySelector('[data-recados-enviados]');
    if (!container) return;
    const enviados = obterEstado().recadosEnviados || [];
    container.hidden = enviados.length === 0;
    if (!enviados.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `<ul class="painel__lista">${[...enviados].reverse().map(item => `
      <li class="painel__item">
        <span class="painel__icone" aria-hidden="true"><i class="fa-regular fa-paper-plane"></i></span>
        <span class="painel__texto"><strong>Recado registrado para ${escaparHtml(item.para)}</strong><span>${escaparHtml(item.texto)}</span></span>
      </li>
    `).join('')}</ul>`;
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
    renderizarRecadosEnviados();
  };

  grupoHumor.addEventListener('change', evento => {
    const humor = evento.target.value;
    renderizarHumor(humor);
    salvarCuidar(() => ({ humor }));
    if (humor === 'sobrecarregado' && obterCuidar().preferencias.avisarFamilia) {
      anunciarStatus(elementoStatus, 'Aviso de sobrecarga simulado. A família não recebeu uma mensagem.');
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
      return;
    }
    if (botao.hasAttribute('data-mascote')) {
      const novoMascote = botao.dataset.mascote;
      renderizarMascotesForm(novoMascote);
      const previa = formPerfil?.querySelector('[data-foto-previa]');
      const botaoRemover = formPerfil?.querySelector('[data-remover-foto]');
      if (previa && (!botaoRemover || botaoRemover.hidden)) previa.src = novoMascote;
      return;
    }
    if (botao.hasAttribute('data-botao-foto')) {
      formPerfil?.querySelector('[data-input-foto]')?.click();
      return;
    }
    if (botao.hasAttribute('data-remover-foto')) {
      if (formPerfil) {
        formPerfil.dataset.fotoTemp = '';
        renderizarFotoForm('', formPerfil.elements.mascote?.value || MASCOTE_PADRAO);
      }
      return;
    }
    if (botao.dataset.alternarOculto === 'cpf' && formPerfil?.elements.cpf) {
      const visivel = botao.getAttribute('aria-pressed') === 'true';
      botao.setAttribute('aria-pressed', String(!visivel));
      botao.setAttribute('aria-label', visivel ? 'Mostrar CPF' : 'Ocultar CPF');
      const salvo = obterEstado().perfilUsuario?.cpfReal || CPF_EXEMPLO;
      formPerfil.elements.cpf.value = visivel ? mascararCpf(salvo) : salvo;
    }
  });

  formPerfil?.querySelector('[data-input-foto]')?.addEventListener('change', evento => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    const tipoValido = arquivo.type === 'image/jpeg' || arquivo.type === 'image/png';
    const nomeValido = /\.(jpe?g|png)$/i.test(arquivo.name);
    if (!tipoValido && !nomeValido) {
      evento.target.value = '';
      anunciarStatus(elementoStatus, 'Envie apenas fotos no formato PNG ou JPG.');
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = typeof leitor.result === 'string' ? leitor.result : '';
      if (!resultado) return;
      formPerfil.dataset.fotoTemp = resultado;
      renderizarFotoForm(resultado, formPerfil.elements.mascote?.value || MASCOTE_PADRAO);
    };
    leitor.readAsDataURL(arquivo);
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
    renderizarRecadosEnviados();
    anunciarStatus(elementoStatus, `Recado registrado para ${para}.`);
  });

  pagina.querySelector('[data-formulario-mvp="folga"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const valor = form.querySelector('[name="turno"]:checked')?.value;
    if (!valor) { anunciarStatus(elementoStatus, 'Não há turno seu disponível para este pedido.'); return; }
    const [dia, inicioTexto, fimTexto] = valor.split('|');
    const inicio = Number(inicioTexto), fim = Number(fimTexto);
    if ((obterEstado().pedidosFolga || []).some(item => item.status === 'Pendente' && item.dia === dia && item.inicio === inicio && item.fim === fim)) {
      anunciarStatus(elementoStatus, 'Já existe um pedido pendente para este turno.'); return;
    }
    const turno = `${formatarDataCurta(dia)} · ${core.formatarIntervaloTurno(inicio, fim - inicio)}`;
    const recado = form.elements.recado.value.trim();
    const data = formatarDataCurta(HOJE);
    atualizarEstado(estado => ({
      ...estado,
      pedidosFolga: [...(estado.pedidosFolga || []), { id: `folga-${Date.now()}`, dia, inicio, fim, turno, recado, data, status: 'Pendente', criadoEm: new Date().toISOString() }]
    }));
    form.reset();
    form.closest('dialog')?.close();
    renderizarPedidosFolga();
    anunciarStatus(elementoStatus, `Pedido de folga registrado nesta demonstração: ${turno}.`);
  });

  const SEMANA_ATUAL = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];

  const renderizarPedidosFolga = () => {
    const bloco = pagina.querySelector('[data-pedidos-folga]');
    const lista = pagina.querySelector('[data-pedidos-folga-lista]');
    if (!bloco || !lista) return;
    const pedidos = [...(obterEstado().pedidosFolga || [])].reverse();
    bloco.hidden = pedidos.length === 0;
    lista.innerHTML = pedidos.map(item => `
      <li class="painel__item">
        <span class="painel__icone" aria-hidden="true"><i class="fa-regular fa-calendar-check"></i></span>
        <span class="painel__texto">
          <strong>${escaparHtml(item.turno)}</strong>
          <span>${escaparHtml([item.data ? `Registrado em ${item.data}` : 'Registrado nesta sessão', item.recado].filter(Boolean).join(' · '))}</span>
        </span>
        <div class="painel__acoes"><span class="selo selo--info">${escaparHtml(item.status || 'Pedido antigo sem vínculo de turno')}</span>
        ${item.status === 'Pendente' ? `<label>Substituto na simulação<select data-substituto-folga="${escaparHtml(item.id)}">${core.obterParticipantesRede().filter(p => p.nome !== obterUsuarioAtual().nomeComApelido && core.pessoaDisponivel(p.nome, item.dia, item.inicio, item.fim)).map(p => `<option value="${escaparHtml(p.nome)}">${escaparHtml(p.nome)}</option>`).join('')}</select></label><button type="button" class="botao botao--secundario" data-decidir-folga="Aceita" data-id="${escaparHtml(item.id)}">Simular aceite e transferir</button><button type="button" class="botao botao--secundario" data-decidir-folga="Recusada" data-id="${escaparHtml(item.id)}">Simular recusa</button><button type="button" class="botao botao--secundario" data-decidir-folga="Cancelada" data-id="${escaparHtml(item.id)}">Cancelar pedido</button>` : item.responsavel ? `<span>Responsável: ${escaparHtml(item.responsavel)}</span>` : ''}</div>
      </li>
    `).join('');
  };

  pagina.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-decidir-folga]');
    if (!botao) return;
    const id = botao.dataset.id;
    const select = [...pagina.querySelectorAll('[data-substituto-folga]')].find(el => el.dataset.substitutoFolga === id);
    try {
      core.resolverFolga(id, botao.dataset.decidirFolga, select?.value || '');
      renderizarPedidosFolga(); renderizarSemanaCuidar();
      anunciarStatus(elementoStatus, 'Pedido atualizado. Confira a responsabilidade na Agenda.');
    } catch (erro) { anunciarStatus(elementoStatus, erro.message); }
  });

  document.querySelector('[data-dialogo="dialogo-pedir-folga"]')?.addEventListener('click', () => {
    const turnos = SEMANA_ATUAL.filter(dia => dia >= HOJE).flatMap(dia => construirLinhaDoTempoDia(dia)
      .filter(seg => seg.tipo === 'turno' && seg.pessoa.ehUsuarioAtual)
      .map(seg => ({ ...seg, dia })));
    const opcoes = pagina.querySelector('[data-opcoes-folga]');
    opcoes.innerHTML = '<legend>Qual turno você quer passar?</legend>' + (turnos.map((seg, i) =>
      `<label><input type="radio" name="turno" required ${i === 0 ? 'checked' : ''} value="${seg.dia}|${seg.inicio}|${seg.fim}"> ${escaparHtml(formatarDataCurta(seg.dia))} · ${core.formatarIntervaloTurno(seg.inicio, seg.fim - seg.inicio)}</label>`).join('') || '<p>Você não possui turnos futuros nesta semana.</p>');
  });

  const renderizarSemanaCuidar = () => {
    const estado = obterEstado();
    const usuario = obterUsuarioAtual(estado);
    const resumoPorPessoa = new Map();

    for (const dia of SEMANA_ATUAL) {
      for (const seg of construirLinhaDoTempoDia(dia, estado)) {
        if (seg.tipo !== 'turno' || !seg.pessoa) continue;
        const ehZe = Boolean(seg.pessoa.ehUsuarioAtual || seg.pessoa.nome === 'Zé da Manga');
        const chave = ehZe ? 'ze' : seg.pessoa.nome;
        const atual = resumoPorPessoa.get(chave) || {
          chave,
          nome: ehZe ? 'Você' : (seg.pessoa.apelido || seg.pessoa.nome),
          nomeCompleto: seg.pessoa.nome,
          ehZe,
          papel: seg.pessoa.papel || '',
          avatar: ehZe
            ? (usuario.foto || usuario.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg')
            : (seg.pessoa.foto || `assets/media/mascotes/${seg.pessoa.avatar || 'icone-mascote-cubado.svg'}`),
          horas: 0,
          turnos: 0,
          madrugadas: 0,
          noites: 0,
          tardes: 0,
          diasMadrugada: []
        };
        const duracao = Math.max(0, seg.fim - seg.inicio);
        atual.horas += duracao;
        atual.turnos += 1;
        if (seg.inicio === 0) {
          atual.madrugadas += 1;
          atual.diasMadrugada.push(dia);
        } else if (seg.inicio >= 19) {
          atual.noites += 1;
        } else if (seg.inicio >= 12) {
          atual.tardes += 1;
        }
        resumoPorPessoa.set(chave, atual);
      }
    }

    const listaPessoas = [...resumoPorPessoa.values()].sort((a, b) => b.horas - a.horas);
    const maxHoras = Math.max(1, ...listaPessoas.map(p => p.horas));
    const dadosZe = resumoPorPessoa.get('ze');

    const totalEl = pagina.querySelector('[data-semana-total]');
    if (totalEl && dadosZe) {
      const rotuloTurno = dadosZe.noites === dadosZe.turnos
        ? `${dadosZe.noites} ${dadosZe.noites === 1 ? 'noite' : 'noites'}`
        : `${dadosZe.turnos} ${dadosZe.turnos === 1 ? 'turno' : 'turnos'}`;
      totalEl.innerHTML = `<strong>${dadosZe.horas} horas</strong><span>em ${rotuloTurno} na escala desta semana</span>`;
    }

    const listaHorasEl = pagina.querySelector('[data-horas-semana]');
    if (listaHorasEl) {
      listaHorasEl.innerHTML = listaPessoas.map(p => {
        const detalhe = p.madrugadas >= 4
          ? `${p.madrugadas} madrugadas`
          : p.papel === 'Cuidadora'
            ? 'contratada'
            : p.noites > 0
              ? `${p.noites} ${p.noites === 1 ? 'noite' : 'noites'}`
              : `${p.tardes || p.turnos} ${(p.tardes || p.turnos) === 1 ? 'turno' : 'turnos'}`;
        const titulo = p.papel === 'Cuidadora' ? `${p.nome} · cuidadora` : p.nome;
        const pct = Math.round((p.horas / maxHoras) * 100);
        const alertaBarra = p.madrugadas >= 5 ? ' horas__barra--alerta' : '';
        return `<li><img class="avatar" src="${escaparHtml(p.avatar)}" alt="">
          <p><strong>${escaparHtml(titulo)}</strong> ${p.horas} h · ${escaparHtml(detalhe)}</p>
          <span class="horas__barra${alertaBarra}" style="--horas: ${pct}%"><span></span></span>
        </li>`;
      }).join('');
    }

    const alertaEl = pagina.querySelector('[data-cuidar-alerta]');
    const sobrecarregada = listaPessoas.find(p => !p.ehZe && p.madrugadas >= 4);
    if (alertaEl) {
      alertaEl.hidden = !sobrecarregada;
      if (sobrecarregada) {
        const tituloAlerta = alertaEl.querySelector('[data-cuidar-alerta-titulo]');
        const botaoRecado = alertaEl.querySelector('[data-cuidar-alerta-recado]');
        const linkMadrugada = alertaEl.querySelector('[data-link-madrugada]');
        const diaAlvo = sobrecarregada.diasMadrugada.find(d => d >= HOJE) || sobrecarregada.diasMadrugada[0] || HOJE;
        if (tituloAlerta) {
          tituloAlerta.textContent = `${sobrecarregada.nome} fez ${sobrecarregada.madrugadas} madrugadas na semana.`;
        }
        if (botaoRecado) botaoRecado.dataset.abrirRecado = sobrecarregada.nome;
        if (linkMadrugada) linkMadrugada.href = `agenda.html?dia=${encodeURIComponent(diaAlvo)}#escala`;
      }
    }
  };

  formPerfil?.addEventListener('input', evento => {
    if (evento.target.name === 'recadoTitulo' || evento.target.name === 'recadoTexto') {
      atualizarContadoresRecado();
    }
  });

  formPerfil?.addEventListener('submit', evento => {
    evento.preventDefault();
    const campos = Object.fromEntries(new FormData(formPerfil));
    const nome = (campos.nome || '').trim();
    if (!nome) return;
    const fotoAtual = 'fotoTemp' in formPerfil.dataset
      ? formPerfil.dataset.fotoTemp
      : (obterEstado().perfilUsuario?.foto || '');
    const cpfInformado = (campos.cpf || '').trim();
    const cpfDigitos = cpfInformado.replace(/\D/g, '');
    const cpfReal = cpfDigitos.length === 11
      ? cpfInformado
      : (obterEstado().perfilUsuario?.cpfReal || CPF_EXEMPLO);
    atualizarEstado(estado => ({
      ...estado,
      perfilUsuario: {
        ...(estado.perfilUsuario || {}),
        nome,
        apelido: (campos.apelido || '').trim(),
        nascimento: (campos.nascimento || '').trim(),
        cpf: mascararCpf(cpfReal),
        cpfReal,
        email: (campos.email || '').trim(),
        telefone: (campos.telefone || '').trim(),
        endereco: (campos.endereco || '').trim(),
        recadoTitulo: (campos.recadoTitulo || '').trim().slice(0, 20),
        recadoTexto: (campos.recadoTexto || '').trim().slice(0, 70),
        mascote: (campos.mascote || MASCOTE_PADRAO).trim(),
        foto: fotoAtual
      }
    }));
    delete formPerfil.dataset.fotoTemp;
    formPerfil.closest('dialog')?.close();
    renderizarPerfil();
    window.dispatchEvent(new CustomEvent('mutirao:perfil-atualizado'));
    anunciarStatus(elementoStatus, 'Alterações salvas.');
  });

  const abasPerfil = [...pagina.querySelectorAll('.perfil__abas [role="tab"]')];
  const paineisPerfil = [...pagina.querySelectorAll('.perfil__painel[role="tabpanel"]')];

  const ativarAbaPerfil = aba => {
    const painelId = aba.getAttribute('aria-controls');
    const cuidar = aba.dataset.areaPerfil === 'cuidar';
    for (const item of abasPerfil) {
      const ativa = item === aba;
      item.setAttribute('aria-selected', String(ativa));
      item.tabIndex = ativa ? 0 : -1;
    }
    for (const painel of paineisPerfil) {
      painel.hidden = painel.id !== painelId;
    }
    const editar = pagina.querySelector('[data-dialogo="dialogo-editar-perfil"]');
    if (editar) editar.hidden = cuidar;
  };

  abasPerfil.forEach((aba, indice) => {
    aba.addEventListener('click', () => ativarAbaPerfil(aba));
    aba.addEventListener('keydown', evento => {
      let proximo = null;
      if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') {
        proximo = abasPerfil[(indice + 1) % abasPerfil.length];
      } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') {
        proximo = abasPerfil[(indice - 1 + abasPerfil.length) % abasPerfil.length];
      } else if (evento.key === 'Home') {
        proximo = abasPerfil[0];
      } else if (evento.key === 'End') {
        proximo = abasPerfil[abasPerfil.length - 1];
      }
      if (proximo) {
        evento.preventDefault();
        ativarAbaPerfil(proximo);
        proximo.focus();
      }
    });
  });

  renderizarPedidosFolga();
  renderizarSemanaCuidar();
  iniciar();
})();
