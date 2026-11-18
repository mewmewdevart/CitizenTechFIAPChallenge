window.MutiraoCuidadoPronto = (async () => {
  const HOJE = '2026-11-10';
  const HORA_REFERENCIA = 11;
  const main = document.querySelector('main');
  const seletor = document.querySelector('.seletor-pessoa');
  const status = document.createElement('div');
  status.className = 'cartao cuidado-status-inicial';
  status.setAttribute('data-status-inicial-cuidado', '');
  status.setAttribute('role', 'status');
  status.textContent = 'Carregando a ficha de cuidado…';
  main?.before(status);
  if (main) {
    main.hidden = true;
    main.setAttribute('aria-busy', 'true');
  }
  if (seletor) seletor.inert = true;

  let banco;
  try {
    const { carregarBaseCuidado, criarBancoCuidado } = await import('./estado-cuidado.mjs');
    banco = criarBancoCuidado(await carregarBaseCuidado(), {
      getItem: chave => sessionStorage.getItem(chave),
      setItem: (chave, valor) => sessionStorage.setItem(chave, valor)
    });
  } catch {
    status.setAttribute('role', 'alert');
    status.textContent = 'Não foi possível carregar as fichas de cuidado. Abra o Mutirão pelo endereço do site ou por um servidor local.';
    const tentar = document.createElement('button');
    tentar.type = 'button';
    tentar.className = 'botao botao--secundario';
    tentar.textContent = 'Tentar novamente';
    tentar.addEventListener('click', () => location.reload());
    status.append(tentar);
    main?.removeAttribute('aria-busy');
    return null;
  }

  let estadoAtual = banco.obterEstado();

  function alterarComAviso(operacao) {
    try {
      const resultado = operacao();
      document.getElementById('erro-persistencia-mutirao')?.remove();
      return resultado;
    } catch (causa) {
      let aviso = document.getElementById('erro-persistencia-mutirao');
      if (!aviso) {
        aviso = document.createElement('p');
        aviso.id = 'erro-persistencia-mutirao';
        aviso.className = 'faixa-alerta faixa-alerta--atencao';
        aviso.setAttribute('role', 'alert');
        aviso.tabIndex = -1;
        main?.prepend(aviso);
      }
      aviso.textContent = 'Não foi possível salvar a alteração. Mantenha esta tela aberta e tente novamente.';
      throw causa;
    }
  }

  function atualizarEstado(transformar) {
    estadoAtual = alterarComAviso(() => banco.atualizar(transformar));
    window.dispatchEvent(new Event('mutirao:cuidado-atualizado'));
    return estadoAtual;
  }

  const obterUsuarioAtual = (estado = estadoAtual) => {
    const perfil = estado?.perfilUsuario || {};
    const nome = (perfil.nome ?? 'Zé da Manga').trim() || 'Zé da Manga';
    const apelido = (perfil.apelido ?? 'Zé').trim();
    const nomeComApelido = apelido ? `${nome} (${apelido})` : nome;
    const mascote = perfil.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg';
    const foto = perfil.foto || '';
    const integrante = estado.equipeCuidado.find(pessoa =>
      pessoa.nome === 'Zé da Manga' || pessoa.nome === nomeComApelido);
    return {
      nome,
      apelido,
      nomeComApelido,
      vinculo: integrante?.vinculo?.trim() || '',
      papel: estado.administradorRede ? 'Participante' : (perfil.papel || 'Administrador').trim(),
      mascote,
      foto,
      avatar: foto || mascote,
      avatarArquivo: mascote.split('/').pop()
    };
  };

  const nomePessoaAcompanhada = (estado = estadoAtual) => {
    const { nome, apelido } = estado.person;
    return apelido ? `${nome} (${apelido})` : nome;
  };

  const obterPerfisAcompanhados = () => banco.obterPerfis().map(perfil => ({
    id: perfil.id,
    nomeCompleto: nomePessoaAcompanhada(perfil),
    administrador: perfil.administradorRede || obterUsuarioAtual().nomeComApelido,
    ativo: perfil.id === estadoAtual.perfilAtivoId
  }));

  const selecionarPerfilAcompanhado = id => {
    if (!alterarComAviso(() => banco.selecionar(id))) return false;
    estadoAtual = banco.obterEstado();
    return true;
  };

  const obterCompromissos = (estado = estadoAtual) =>
    [...estado.events].sort((a, b) => `${a.dia}T${a.hora}`.localeCompare(`${b.dia}T${b.hora}`));

  const obterCompromissosFuturos = (estado = estadoAtual) =>
    obterCompromissos(estado).filter(item => `${item.dia}T${item.hora}` >= `${HOJE}T11:58`);

  const obterProximoCompromisso = () => obterCompromissosFuturos()[0];

  const obterParticipantesRede = (estado = estadoAtual) => {
    const usuario = obterUsuarioAtual(estado);
    const equipe = Array.isArray(estado.equipeCuidado) ? estado.equipeCuidado : [];
    const ehUsuario = pessoa => pessoa.nome === 'Zé da Manga' || pessoa.nome === usuario.nomeComApelido;
    const adminItem = {
      nome: usuario.nomeComApelido,
      nomeBase: usuario.nome,
      vinculo: usuario.vinculo,
      papel: usuario.papel,
      avatar: usuario.avatarArquivo,
      foto: usuario.foto,
      ehUsuarioAtual: true,
      perfil: 'meu-perfil.html'
    };
    const lista = [
      ...(equipe.some(ehUsuario) ? [] : [adminItem]),
      ...equipe.map(pessoa => {
        if (ehUsuario(pessoa)) return adminItem;
        return {
          nome: pessoa.nome,
          nomeBase: pessoa.nome.split(' (')[0].trim(),
          vinculo: pessoa.vinculo || '',
          papel: estado.administradorRede === pessoa.nome ? 'Administrador' : pessoa.papel || 'Participante',
          perfil: pessoa.perfil,
          avatar: pessoa.avatar,
          foto: ''
        };
      })
    ];
    return [...lista, ...estado.participantesExtras.map(pessoa => ({
      ...pessoa,
      papel: estado.administradorRede === pessoa.nome ? 'Administrador' : pessoa.papel
    }))];
  };

  const resolverConvite = (email, aceitar) => atualizarEstado(estado => {
    const convite = (estado.convites || []).find(item => item.email === email);
    if (!convite) throw new Error('Este convite já foi respondido.');
    const participantesExtras = [...(estado.participantesExtras || [])];
    if (aceitar && !participantesExtras.some(item => item.email === email)) {
      participantesExtras.push({ ...convite, nome: email, nomeBase: email,
        avatar: 'icone-mascote-cubado.svg', foto: '' });
    }
    return { ...estado, participantesExtras,
      convites: estado.convites.filter(item => item.email !== email),
      historicoConvites: [...(estado.historicoConvites || []), { ...convite, status: aceitar ? 'Aceito' : 'Recusado' }] };
  });

  const atualizarSeletoresRede = () => {
    const participantes = obterParticipantesRede();
    const admin = obterUsuarioAtual();
    const nomes = [...new Set([admin.nomeComApelido, ...participantes.map(pessoa => pessoa.nome)])];
    document.querySelectorAll('select[data-opcoes-rede]').forEach(select => {
      const anterior = select.value;
      select.querySelectorAll('option[data-opcao-rede]').forEach(opcao => opcao.remove());
      for (const nome of nomes) {
        const opcao = new Option(nome, nome);
        opcao.dataset.opcaoRede = '';
        select.add(opcao);
      }
      if ([...select.options].some(opcao => opcao.value === anterior)) select.value = anterior;
    });
  };
  window.addEventListener('mutirao:cuidado-atualizado', atualizarSeletoresRede);

  const resolverPessoaRede = (nome, estado = estadoAtual) => {
    const participantes = obterParticipantesRede(estado);
    const alvo = normalizarBusca(nome);
    const usuario = obterUsuarioAtual(estado);
    let encontrada = alvo && participantes.find(pessoa =>
      normalizarBusca(pessoa.nome) === alvo || normalizarBusca(pessoa.nomeBase) === alvo ||
      normalizarBusca(pessoa.nome.match(/\(([^)]+)\)/)?.[1]) === alvo
    );
    if (!encontrada && alvo && (alvo.includes('ze da manga') || alvo === normalizarBusca(usuario.apelido))) {
      encontrada = participantes.find(pessoa => normalizarBusca(pessoa.nome) === normalizarBusca(usuario.nomeComApelido));
    }
    const avatar = encontrada?.avatar || 'icone-mascote-cubado.svg';
    const foto = encontrada?.foto || '';
    return {
      nome: encontrada?.nome || nome || usuario.nomeComApelido,
      avatar,
      foto,
      ehUsuarioAtual: Boolean(encontrada?.ehUsuarioAtual),
      src: foto || `assets/media/mascotes/${avatar}`
    };
  };

  const normalizarBusca = valor => String(valor ?? '').normalize('NFD')
    .replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim();

  function vincularFiltro(grupo, seletor, selecionar) {
    grupo?.addEventListener('click', evento => {
      const botao = evento.target.closest(seletor);
      if (!botao || !grupo.contains(botao)) return;
      grupo.querySelectorAll(seletor).forEach(item => {
        item.setAttribute('aria-pressed', String(item === botao));
      });
      selecionar(botao);
    });
  }

  const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caractere]);

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

  const inicializarEditoresRicos = raiz => {
    if (!raiz) {
      return { sincronizarTodos: () => { }, limparTodos: () => { } };
    }

    const sincronizarEditor = editor => {
      if (!editor) return;
      const area = editor.querySelector('[data-editor-alvo]');
      if (!area) return;
      const chave = area.dataset.editorAlvo;
      const inputOculto = raiz.querySelector(`[data-input-editor="${chave}"]`);
      if (inputOculto) {
        inputOculto.value = sanitizarHtmlEditor(area.innerHTML);
      }
      editor.querySelectorAll('[data-comando-editor]').forEach(botao => {
        try {
          botao.setAttribute('aria-pressed', String(document.queryCommandState(botao.dataset.comandoEditor)));
        } catch {
          botao.setAttribute('aria-pressed', 'false');
        }
      });
    };

    raiz.addEventListener('mousedown', evento => {
      if (evento.target.closest('[data-comando-editor]')) {
        evento.preventDefault();
      }
    });

    raiz.addEventListener('click', evento => {
      const botao = evento.target.closest('[data-comando-editor]');
      if (!botao) return;
      const editor = botao.closest('[data-editor-rico]');
      const area = editor?.querySelector('[data-editor-alvo]');
      if (!area) return;
      area.focus();
      document.execCommand(botao.dataset.comandoEditor, false, null);
      sincronizarEditor(editor);
    });

    document.addEventListener('selectionchange', () => {
      const areaEditor = document.activeElement?.closest?.('[data-editor-alvo]');
      if (areaEditor && raiz.contains(areaEditor)) {
        sincronizarEditor(areaEditor.closest('[data-editor-rico]'));
      }
    });

    ['input', 'keyup', 'mouseup'].forEach(tipoEvento => {
      raiz.addEventListener(tipoEvento, evento => {
        const areaEditor = evento.target.closest('[data-editor-alvo]');
        if (areaEditor) sincronizarEditor(areaEditor.closest('[data-editor-rico]'));
      });
    });

    return {
      sincronizarTodos: (container = raiz) => {
        container.querySelectorAll('[data-editor-rico]').forEach(sincronizarEditor);
      },
      limparTodos: (container = raiz) => {
        container.querySelectorAll('[data-editor-rico]').forEach(editor => {
          const area = editor.querySelector('[data-editor-alvo]');
          if (area) area.innerHTML = '';
          sincronizarEditor(editor);
        });
      }
    };
  };

  const gerarChaveData = (ano, mes, dia) => [
    ano,
    String(mes + 1).padStart(2, '0'),
    String(dia).padStart(2, '0')
  ].join('-');

  const obterSemanaDe = (chave = HOJE) => {
    const base = new Date(`${chave}T12:00:00`);
    const deslocamentoSegunda = (base.getDay() + 6) % 7;
    const segunda = new Date(base);
    segunda.setDate(base.getDate() - deslocamentoSegunda);
    return Array.from({ length: 7 }, (_, indice) => {
      const data = new Date(segunda);
      data.setDate(segunda.getDate() + indice);
      return gerarChaveData(data.getFullYear(), data.getMonth(), data.getDate());
    });
  };

  const formatarData = (chave, opcoes) =>
    new Intl.DateTimeFormat('pt-BR', opcoes).format(new Date(`${chave}T12:00:00`));

  const capitalizarPrimeira = texto => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '');

  const formatarDataCurta = (chave, mesLongo = false) =>
    capitalizarPrimeira(formatarData(chave, {
      weekday: 'long',
      day: 'numeric',
      month: mesLongo ? 'long' : 'short'
    }));

  const extrairHorasTurno = horario => {
    const match = String(horario || '').match(/(\d{1,2})h[–-](\d{1,2})h/);
    if (!match) return { inicio: 0, fim: 24, duracao: 24 };
    const inicio = Number(match[1]);
    const fim = Number(match[2]);
    const duracao = fim > inicio ? fim - inicio : 24 - inicio + fim;
    return { inicio, fim: inicio + duracao, duracao };
  };

  const formatarIntervaloTurno = (inicio, duracao) => {
    const fim = (inicio + duracao) % 24 || 24;
    return `${String(inicio).padStart(2, '0')}h–${String(fim).padStart(2, '0')}h`;
  };

  const normalizarIntervalos = (valor, slotInicio, slotFim) => {
    if (!valor) return [];
    if (valor === true) return [{ inicio: slotInicio, fim: slotFim }];
    const lista = Array.isArray(valor) ? valor : [valor];
    const ordenados = lista
      .filter(i => i && Number.isFinite(i.inicio) && Number.isFinite(i.fim) && i.fim > i.inicio)
      .map(i => ({ inicio: Math.max(slotInicio, i.inicio), fim: Math.min(slotFim, i.fim) }))
      .filter(i => i.fim > i.inicio)
      .sort((a, b) => a.inicio - b.inicio);

    const mesclados = [];
    for (const atual of ordenados) {
      const ultimo = mesclados[mesclados.length - 1];
      if (ultimo && atual.inicio <= ultimo.fim) {
        ultimo.fim = Math.max(ultimo.fim, atual.fim);
      } else {
        mesclados.push({ ...atual });
      }
    }
    return mesclados;
  };

  const ACOMPANHAMENTO = Object.freeze({
    naoInformado: '',
    eventual: 'Sem acompanhamento regular',
    integral: '24 horas por dia',
    parcial: '12 horas por dia',
    diario: 'Horário diário combinado'
  });

  const obterNecessidadeAcompanhamento = (estado = estadoAtual) => {
    const valor = estado.person?.cobertura;
    return Object.values(ACOMPANHAMENTO).includes(valor) ? valor : ACOMPANHAMENTO.naoInformado;
  };

  // Escopo escolhido ao adicionar um turno: só a data, o mesmo dia da semana ou todos os dias.
  const ESCOPO_TURNO = Object.freeze({ pontual: 'pontual', semanal: 'semanal', diario: 'diario' });
  const NOMES_DIA_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const obterDiaSemana = dia => new Date(`${dia}T12:00:00`).getDay();
  const descreverDiaSemana = diaSemana => `${diaSemana === 0 || diaSemana === 6 ? 'Todo' : 'Toda'} ${NOMES_DIA_SEMANA[diaSemana]}`;

  const obterRotinasSemanais = (estado = estadoAtual) => (Array.isArray(estado.rotinasSemanais) ? estado.rotinasSemanais : [])
    .filter(rotina => Number.isInteger(rotina?.diaSemana) && rotina.fim > rotina.inicio);

  const descreverRotinaSemanal = rotina =>
    `${descreverDiaSemana(rotina.diaSemana)}, ${formatarIntervaloTurno(rotina.inicio, rotina.fim - rotina.inicio)}`;

  const obterDescricaoAcompanhamento = (estado = estadoAtual) => {
    const necessidade = obterNecessidadeAcompanhamento(estado);
    const janela = estado.janelaAcompanhamento;
    const semanais = necessidade === ACOMPANHAMENTO.integral ? [] : obterRotinasSemanais(estado).map(descreverRotinaSemanal);
    if (necessidade === ACOMPANHAMENTO.diario && janela) {
      return [`Todos os dias, ${formatarIntervaloTurno(janela.inicio, janela.fim - janela.inicio)}`, ...semanais].join(' · ');
    }
    if (necessidade) return [necessidade, ...semanais].join(' · ');
    return semanais.length ? semanais.join(' · ') : 'Não informada';
  };

  // Fonte única da expectativa de cuidado: quais faixas do dia precisam de alguém.
  // Sem faixa esperada, o dia só mostra turnos combinados e nunca vira alerta.
  const obterJanelasObrigatorias = (dia, estado = estadoAtual) => {
    const necessidade = obterNecessidadeAcompanhamento(estado);
    if (necessidade === ACOMPANHAMENTO.integral) return [{ inicio: 0, fim: 24 }];
    const janelas = [];
    const janela = estado.janelaAcompanhamento;
    if (necessidade === ACOMPANHAMENTO.diario && janela && dia >= janela.desde) janelas.push(janela);
    const diaSemana = obterDiaSemana(dia);
    for (const rotina of obterRotinasSemanais(estado)) {
      if (rotina.diaSemana === diaSemana && dia >= rotina.desde) janelas.push(rotina);
    }
    return normalizarIntervalos(janelas, 0, 24);
  };

  const podeDefinirRotina = (estado = estadoAtual) => {
    const necessidade = obterNecessidadeAcompanhamento(estado);
    return necessidade === ACOMPANHAMENTO.naoInformado || necessidade === ACOMPANHAMENTO.eventual;
  };

  const podeDefinirRotinaSemanal = (estado = estadoAtual) =>
    obterNecessidadeAcompanhamento(estado) !== ACOMPANHAMENTO.integral;

  const normalizarEscopoTurno = escopo => {
    if (escopo === true) return ESCOPO_TURNO.diario;
    return Object.values(ESCOPO_TURNO).includes(escopo) ? escopo : ESCOPO_TURNO.pontual;
  };

  const definirRotinaTurno = (estado, dia, inicio, fim, escopoInformado, responsavel = null) => {
    const escopo = normalizarEscopoTurno(escopoInformado);
    if (escopo === ESCOPO_TURNO.pontual || dia < HOJE || !(fim > inicio)) return estado;
    if (escopo === ESCOPO_TURNO.diario) {
      if (!podeDefinirRotina(estado)) return estado;
      return {
        ...estado,
        person: { ...estado.person, cobertura: ACOMPANHAMENTO.diario },
        janelaAcompanhamento: { desde: dia, inicio, fim, ...(responsavel ? { responsavel } : {}) }
      };
    }
    if (!podeDefinirRotinaSemanal(estado)) return estado;
    const diaSemana = obterDiaSemana(dia);
    const existentes = obterRotinasSemanais(estado);
    const idxRepetida = existentes.findIndex(rotina => rotina.diaSemana === diaSemana && rotina.inicio === inicio && rotina.fim === fim);
    const necessidade = obterNecessidadeAcompanhamento(estado);
    const novaRotina = {
      id: `rotina-${diaSemana}-${inicio}-${fim}`,
      diaSemana,
      desde: dia,
      inicio,
      fim,
      ...(responsavel ? { responsavel } : {})
    };
    const rotinasAtualizadas = idxRepetida === -1
      ? [...existentes, novaRotina]
      : existentes.map((rotina, idx) => (idx === idxRepetida && responsavel ? { ...rotina, responsavel } : rotina));
    return {
      ...estado,
      // Uma rotina semanal torna a escala visível no Início sem fingir acompanhamento diário.
      person: necessidade === ACOMPANHAMENTO.naoInformado
        ? { ...estado.person, cobertura: ACOMPANHAMENTO.eventual }
        : estado.person,
      rotinasSemanais: rotinasAtualizadas
    };
  };

  const removerRotinaSemanal = (estado, id) => ({
    ...estado,
    rotinasSemanais: obterRotinasSemanais(estado).filter(rotina => rotina.id !== id)
  });

  const contarParticipacoesUsuario = (estado = estadoAtual) => {
    const datas = new Set([
      ...obterSemanaDe(HOJE),
      ...Object.keys(estado.escalasFixas || {}),
      ...Object.keys(estado.covered || {})
    ]);
    const temRecorrencia = Boolean(
      estado.janelaAcompanhamento?.responsavel
      || obterRotinasSemanais(estado).some(rotina => rotina.responsavel)
    );
    if (temRecorrencia) {
      const base = new Date(`${HOJE}T12:00:00`);
      for (let i = 0; i < 28; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        datas.add(gerarChaveData(d.getFullYear(), d.getMonth(), d.getDate()));
      }
    }
    let total = 0;
    for (const dia of datas) {
      total += construirLinhaDoTempoDia(dia, estado)
        .filter(seg => seg.tipo === 'turno' && seg.pessoa?.ehUsuarioAtual)
        .length;
    }
    return total;
  };

  const cancelarTodasParticipacoesUsuario = (estado = estadoAtual) => {
    const rotinasSemanais = obterRotinasSemanais(estado).map(rotina => {
      if (!rotina.responsavel || !resolverPessoaRede(rotina.responsavel, estado).ehUsuarioAtual) return rotina;
      const { responsavel, ...resto } = rotina;
      return resto;
    });
    const janela = estado.janelaAcompanhamento;
    const janelaAcompanhamento = janela?.responsavel && resolverPessoaRede(janela.responsavel, estado).ehUsuarioAtual
      ? (({ responsavel, ...resto }) => resto)(janela)
      : janela;
    const estadoSemRecorrencia = {
      ...estado,
      rotinasSemanais,
      ...(janelaAcompanhamento !== undefined ? { janelaAcompanhamento } : {})
    };
    const shiftEdits = { ...(estado.shiftEdits || {}) };
    const datas = new Set([
      ...obterSemanaDe(HOJE),
      ...Object.keys(estado.escalasFixas || {}),
      ...Object.keys(estado.covered || {})
    ]);
    for (const dia of datas) {
      for (const item of obterEscalaDia(dia, estadoSemRecorrencia)) {
        if (resolverPessoaRede(item.pessoa?.nome, estado).ehUsuarioAtual) {
          shiftEdits[`${dia}|${item.horario}`] = { cancelado: true };
        }
      }
    }
    return {
      ...estadoSemRecorrencia,
      covered: {},
      shiftEdits,
      coberturasRede: (estado.coberturasRede || []).filter(c => !resolverPessoaRede(c.responsavel, estado).ehUsuarioAtual)
    };
  };

  const popularOpcoesHorario = (select, min, max, selecionado) => {
    select.replaceChildren(...Array.from({ length: max - min + 1 }, (_, i) => {
      const hora = min + i;
      return new Option(`${String(hora).padStart(2, '0')}h00`, hora, false, hora === selecionado);
    }));
  };

  const parsearFaixasTurno = horario => {
    const faixas = String(horario || '')
      .split(',')
      .map(parte => parte.trim())
      .filter(Boolean)
      .map(extrairHorasTurno)
      .filter(faixa => faixa.fim > faixa.inicio);
    return faixas.length ? faixas : [extrairHorasTurno(horario)];
  };

  const obterIntervaloFormularioTurno = (form, horario) => {
    const faixas = parsearFaixasTurno(horario);
    if (form.elements.cobrirTudo.checked) {
      const faixa = faixas[0];
      return { ...faixa, gapInicio: faixa.inicio, gapFim: faixa.fim };
    }
    const inicio = Number(form.elements.inicio.value);
    const fim = Number(form.elements.fim.value);
    const faixaAtiva = faixas.find(f => f.inicio <= inicio && inicio < f.fim) || faixas[0];
    return { inicio, fim, duracao: fim - inicio, gapInicio: faixaAtiva.inicio, gapFim: faixaAtiva.fim };
  };

  const atualizarPreviaTurno = (dialogo, horario) => {
    const form = dialogo.querySelector('[data-formulario-mvp="cobertura"]');
    const faixas = parsearFaixasTurno(horario);
    const { inicio, fim, gapFim } = obterIntervaloFormularioTurno(form, horario);
    const fimValido = fim > inicio && fim <= gapFim ? fim : Math.min(gapFim, inicio + 1);
    popularOpcoesHorario(form.elements.fim, inicio + 1, gapFim, fimValido);
    form.querySelector('[data-horarios-cobertura]').hidden = form.elements.cobrirTudo.checked;
    const duracao = fimValido - inicio;
    const horarioEscolhido = `${formatarIntervaloTurno(inicio, duracao)} (${duracao} ${duracao === 1 ? 'hora' : 'horas'})`;
    const dia = dialogo.dataset.diaTurno || HOJE;
    const escopo = form.elements.escopoTurno.disabled ? ESCOPO_TURNO.pontual : normalizarEscopoTurno(form.elements.escopoTurno.value);
    const explicacoes = {
      [ESCOPO_TURNO.diario]: `Vale todos os dias a partir de ${formatarDataCurta(dia)} com você na escala. Se precisar faltar em algum dia, basta editar ou cancelar só aquela data.`,
      [ESCOPO_TURNO.semanal]: `${descreverDiaSemana(obterDiaSemana(dia))} a partir de ${formatarDataCurta(dia)} com você na escala. Se precisar faltar em alguma data, é só editar aquele dia.`,
      [ESCOPO_TURNO.pontual]: dialogo.dataset.turnoPontual === 'true'
        ? `Vale só para ${formatarDataCurta(dia)}. Os outros dias continuam como estão.`
        : duracao >= faixas[0].duracao
          ? 'Você assume todo este horário.'
          : 'O restante do horário previsto continua na escala.'
    };
    form.querySelector('[data-previa-nova-cobertura]').textContent = `${horarioEscolhido} · ${explicacoes[escopo]}`;
  };

  const prepararFormularioTurno = (dialogo, dia, horario, pontual) => {
    const form = dialogo.querySelector('[data-formulario-mvp="cobertura"]');
    const faixas = parsearFaixasTurno(horario);
    const horasInicio = faixas.flatMap(faixa => Array.from({ length: faixa.fim - faixa.inicio }, (_, i) => faixa.inicio + i));
    const unicaFaixaCurta = faixas.length === 1 && faixas[0].fim - faixas[0].inicio === 1;
    const ocultarCobrirTudo = faixas.length > 1 || unicaFaixaCurta;
    dialogo.dataset.turnoPontual = String(pontual);
    dialogo.dataset.diaTurno = dia;
    dialogo.querySelector('h2').textContent = pontual ? 'Adicionar turno' : 'Ficar nesse horário';
    dialogo.querySelector('[data-contexto-turno]').textContent = `${formatarDataCurta(dia)} · ${horario}`;
    const escopo = form.elements.escopoTurno;
    const opcoes = [new Option('Só nesta data', ESCOPO_TURNO.pontual)];
    if (pontual && dia >= HOJE && podeDefinirRotinaSemanal()) {
      opcoes.push(new Option(`Repetir ${descreverDiaSemana(obterDiaSemana(dia)).toLocaleLowerCase('pt-BR')}`, ESCOPO_TURNO.semanal));
    }
    if (pontual && dia >= HOJE && podeDefinirRotina()) {
      opcoes.push(new Option('Repetir todos os dias', ESCOPO_TURNO.diario));
    }
    escopo.replaceChildren(...opcoes);
    escopo.value = ESCOPO_TURNO.pontual;
    escopo.closest('label').hidden = opcoes.length === 1;
    escopo.disabled = escopo.closest('label').hidden;
    form.elements.cobrirTudo.checked = !pontual || unicaFaixaCurta;
    const opcoesCobertura = form.elements.cobrirTudo.closest('.dialogo-mvp__opcoes');
    if (opcoesCobertura) opcoesCobertura.hidden = ocultarCobrirTudo;
    form.elements.cobrirTudo.closest('label').hidden = ocultarCobrirTudo;
    const sugestao = pontual && dia === HOJE
      ? (horasInicio.find(h => h >= HORA_REFERENCIA) ?? horasInicio[horasInicio.length - 1] ?? 0)
      : (horasInicio[0] ?? 0);
    const faixaSugestao = faixas.find(f => f.inicio <= sugestao && sugestao < f.fim) || faixas[0];
    form.elements.inicio.replaceChildren(...horasInicio.map(hora =>
      new Option(`${String(hora).padStart(2, '0')}h00`, hora, false, hora === sugestao)));
    popularOpcoesHorario(form.elements.fim, sugestao + 1, faixaSugestao.fim, pontual ? sugestao + 1 : faixaSugestao.fim);
    atualizarPreviaTurno(dialogo, horario);
  };

  const obterLacunasDia = (dia, estado = estadoAtual) => construirLinhaDoTempoDia(dia, estado)
    .filter(item => item.tipo === 'lacuna')
    .map(({ inicio, fim }) => ({ inicio, fim, horario: formatarIntervaloTurno(inicio, fim - inicio) }));

  const construirLinhaDoTempoDia = (dia, estado = estadoAtual, incluirHorariosLivres = false) => {
    const escala = obterEscalaComHorariosLivres(dia, estado);
    const usuario = obterUsuarioAtual(estado);
    const pessoaUsuario = { nome: usuario.nomeComApelido, avatar: usuario.avatarArquivo, foto: usuario.foto, ehUsuarioAtual: true };
    const segmentos = [];

    for (const item of escala) {
      const slot = extrairHorasTurno(item.horario);
      const chave = `${dia}|${item.horario}`;
      const edicao = estado.shiftEdits?.[chave];

      if (item.lacuna) {
        const cobertos = normalizarIntervalos(estado.covered?.[dia], slot.inicio, slot.fim);
        let cursor = slot.inicio;
        for (const cob of cobertos) {
          if (cob.inicio > cursor) {
            segmentos.push({ tipo: 'lacuna', inicio: cursor, fim: cob.inicio, isLacunaOriginal: true });
          }
          segmentos.push({
            tipo: 'turno',
            inicio: cob.inicio,
            fim: cob.fim,
            pessoa: pessoaUsuario,
            temCobertura: true
          });
          cursor = Math.max(cursor, cob.fim);
        }
        if (cursor < slot.fim) {
          segmentos.push({ tipo: 'lacuna', inicio: cursor, fim: slot.fim, isLacunaOriginal: true });
        }
      } else if (resolverPessoaRede(item.pessoa?.nome, estado).ehUsuarioAtual) {
        if (edicao?.cancelado) {
          segmentos.push({ tipo: 'lacuna', inicio: slot.inicio, fim: slot.fim, isLacunaOriginal: false });
        } else if (edicao && typeof edicao.inicio === 'number' && typeof edicao.duracao === 'number') {
          const fimEdicao = edicao.inicio + edicao.duracao;
          if (edicao.inicio > slot.inicio) {
            segmentos.push({ tipo: 'lacuna', inicio: slot.inicio, fim: edicao.inicio, isLacunaOriginal: false });
          }
          segmentos.push({
            tipo: 'turno',
            inicio: edicao.inicio,
            fim: fimEdicao,
            pessoa: pessoaUsuario,
            temCobertura: false
          });
          if (fimEdicao < slot.fim) {
            segmentos.push({ tipo: 'lacuna', inicio: fimEdicao, fim: slot.fim, isLacunaOriginal: false });
          }
        } else {
          segmentos.push({
            tipo: 'turno',
            inicio: slot.inicio,
            fim: slot.fim,
            pessoa: pessoaUsuario,
            temCobertura: false
          });
        }
      } else {
        segmentos.push({
          tipo: 'turno',
          inicio: slot.inicio,
          fim: slot.fim,
          pessoa: item.pessoa,
          temCobertura: false
        });
      }
    }

    let linha = segmentos;
    for (const cobertura of (estado.coberturasRede || []).filter(item => item.dia === dia)) {
      linha = linha.flatMap(seg => {
        const inicio = Math.max(seg.inicio, cobertura.inicio);
        const fim = Math.min(seg.fim, cobertura.fim);
        if (inicio >= fim) return [seg];
        return [
          ...(seg.inicio < inicio ? [{ ...seg, fim: inicio }] : []),
          { tipo: 'turno', inicio, fim, pessoa: resolverPessoaRede(cobertura.responsavel, estado), temCobertura: false },
          ...(fim < seg.fim ? [{ ...seg, inicio: fim }] : [])
        ];
      });
    }
    const mesclados = [];
    for (const seg of linha) {
      const ultimo = mesclados[mesclados.length - 1];
      const mesmoTurnoZe = ultimo
        && ultimo.tipo === 'turno'
        && seg.tipo === 'turno'
        && ultimo.pessoa?.ehUsuarioAtual
        && seg.pessoa?.ehUsuarioAtual
        && ultimo.fim === seg.inicio;
      const mesmaLacuna = ultimo
        && ultimo.tipo === 'lacuna'
        && seg.tipo === 'lacuna'
        && ultimo.fim === seg.inicio;

      if (mesmoTurnoZe) {
        ultimo.fim = seg.fim;
        ultimo.temCobertura = ultimo.temCobertura || seg.temCobertura;
      } else if (mesmaLacuna) {
        ultimo.fim = seg.fim;
        ultimo.isLacunaOriginal = ultimo.isLacunaOriginal || seg.isLacunaOriginal;
      } else {
        mesclados.push({ ...seg });
      }
    }

    const janelas = obterJanelasObrigatorias(dia, estado);
    const manterLacunasDaEscala = obterNecessidadeAcompanhamento(estado) === ACOMPANHAMENTO.parcial;
    return mesclados.flatMap((seg, idx) => {
      const anterior = mesclados[idx - 1];
      const proximo = mesclados[idx + 1];
      const formato = (tipo, inicio, fim) => ({
        ...seg, tipo, inicio, fim,
        horario: formatarIntervaloTurno(inicio, fim - inicio),
        janelaMin: anterior?.tipo === 'lacuna' ? anterior.inicio : seg.inicio,
        janelaMax: proximo?.tipo === 'lacuna' ? proximo.fim : seg.fim
      });
      if (seg.tipo === 'turno') return [formato('turno', seg.inicio, seg.fim)];
      if (incluirHorariosLivres) return [formato('livre', seg.inicio, seg.fim)];
      const faixasEsperadas = manterLacunasDaEscala
        ? normalizarIntervalos([...obterEscalaDia(dia, estado).map(item => extrairHorasTurno(item.horario)), ...janelas], 0, 24)
        : janelas;
      return faixasEsperadas
        .map(faixa => ({ inicio: Math.max(seg.inicio, faixa.inicio), fim: Math.min(seg.fim, faixa.fim) }))
        .filter(({ inicio, fim }) => inicio < fim)
        .map(({ inicio, fim }) => formato('lacuna', inicio, fim));
    });
  };

  const obterHorariosLivres = (dia, estado = estadoAtual) =>
    construirLinhaDoTempoDia(dia, estado, true).filter(seg => seg.tipo === 'livre');

  const obterPedidosForaDaRotina = (dia, estado = estadoAtual) => {
    const lacunas = obterLacunasDia(dia, estado);
    return Object.entries(estado.atribuicoesTurno || {}).filter(([, pedido]) => {
      if (pedido.dia !== dia) return false;
      const { inicio, fim } = extrairHorasTurno(pedido.horario);
      return !lacunas.some(lacuna => lacuna.inicio <= inicio && fim <= lacuna.fim);
    });
  };

  // Compromisso com hora marcada fora de qualquer turno, apenas quando a ficha prevê
  // acompanhamento naquele horário (ex.: rotina 24h, diária ou semanal).
  const obterSugestaoTurnoCompromisso = (compromisso, estado = estadoAtual) => {
    const horaTexto = String(compromisso?.hora || '').trim();
    if (!compromisso?.dia || !/^\d{2}:\d{2}$/.test(horaTexto) || compromisso.dia < HOJE) return null;
    const hora = Number(horaTexto.slice(0, 2));
    const esperaCobertura = obterJanelasObrigatorias(compromisso.dia, estado)
      .some(janela => janela.inicio <= hora && hora < janela.fim);
    if (!esperaCobertura) return null;
    const trecho = construirLinhaDoTempoDia(compromisso.dia, estado, true)
      .find(seg => seg.inicio <= hora && hora < seg.fim);
    if (!trecho || trecho.tipo === 'turno') return null;
    const inicio = Math.max(trecho.inicio, hora - 1);
    const fim = Math.min(trecho.fim, hora + 2);
    return { dia: compromisso.dia, horario: formatarIntervaloTurno(inicio, fim - inicio) };
  };

  const renderizarAdicionarTurnos = (dia, estado, linha) => {
    const lacunas = linha.filter(seg => seg.tipo === 'lacuna');
    const livres = obterHorariosLivres(dia, estado).flatMap(faixa => {
      let cursor = faixa.inicio;
      const partes = [];
      for (const lacuna of lacunas.filter(item => item.inicio < faixa.fim && item.fim > faixa.inicio)) {
        if (cursor < lacuna.inicio) partes.push({ inicio: cursor, fim: lacuna.inicio });
        cursor = Math.max(cursor, lacuna.fim);
      }
      if (cursor < faixa.fim) partes.push({ inicio: cursor, fim: faixa.fim });
      return partes;
    });
    if (!livres.length) return '';

    const necessidade = obterNecessidadeAcompanhamento(estado);
    const rotuloLivre = necessidade === ACOMPANHAMENTO.diario || necessidade === ACOMPANHAMENTO.parcial
      ? 'Horário fora da rotina prevista'
      : necessidade === ACOMPANHAMENTO.eventual
        ? 'Horário livre'
        : 'Horário sem turno';
    const descricaoLivre = necessidade === ACOMPANHAMENTO.diario || necessidade === ACOMPANHAMENTO.parcial
      ? 'Fora do horário habitual combinado. Adicione um turno extra se precisar.'
      : necessidade === ACOMPANHAMENTO.eventual
        ? 'Sem acompanhamento regular previsto. Adicione um turno pontual ou recorrente.'
        : 'Nenhum acompanhamento obrigatório configurado. Adicione um turno se alguém for cuidar.';

    return livres.map(({ inicio, fim }) => {
      const horario = formatarIntervaloTurno(inicio, fim - inicio);
      return `<div class="agenda__lacuna">
      <span class="agenda__icone-descoberto" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>
      <div>
        <strong>${escaparHtml(horario)} · ${rotuloLivre}</strong>
        <p>${descricaoLivre}</p>
      </div>
      <button type="button" class="botao botao--secundario" data-dialogo-dinamico="dialogo-cobrir-horario" data-adicionar-turno data-dia="${dia}" data-horario="${escaparHtml(horario)}">Adicionar turno</button>
    </div>`;
    }).join('');
  };

  const aplicarIntervaloZe = (estado, dia, janelaMin, janelaMax, novoInicio, novoFim) => {
    const escala = obterEscalaComHorariosLivres(dia, estado);
    const covered = { ...estado.covered };
    const shiftEdits = { ...estado.shiftEdits };

    for (const item of escala) {
      const slot = extrairHorasTurno(item.horario);
      const ovMin = Math.max(slot.inicio, janelaMin);
      const ovMax = Math.min(slot.fim, janelaMax);
      if (ovMin >= ovMax) continue;

      const covA = Math.max(ovMin, novoInicio);
      const covB = Math.min(ovMax, novoFim);

      if (item.lacuna) {
        const existentes = normalizarIntervalos(covered[dia], 0, 24);
        const restantes = [];
        for (const c of existentes) {
          if (c.inicio < ovMin) restantes.push({ inicio: c.inicio, fim: Math.min(c.fim, ovMin) });
          if (c.fim > ovMax) restantes.push({ inicio: Math.max(c.inicio, ovMax), fim: c.fim });
        }
        if (covA < covB) {
          restantes.push({ inicio: covA, fim: covB });
        }
        const atualizados = normalizarIntervalos(restantes, 0, 24);
        if (atualizados.length) {
          covered[dia] = atualizados;
        } else {
          delete covered[dia];
        }
      } else if (resolverPessoaRede(item.pessoa?.nome, estado).ehUsuarioAtual) {
        const chave = `${dia}|${item.horario}`;
        if (covA >= covB) {
          shiftEdits[chave] = { cancelado: true };
        } else if (covA === slot.inicio && covB === slot.fim) {
          delete shiftEdits[chave];
        } else {
          shiftEdits[chave] = { inicio: covA, duracao: covB - covA, cancelado: false };
        }
      }
    }

    let atribuicoesTurno = estado.atribuicoesTurno ? { ...estado.atribuicoesTurno } : {};
    if (novoInicio < novoFim) {
      const novasAtribuicoes = {};
      for (const [chave, item] of Object.entries(atribuicoesTurno)) {
        if (!item || item.dia !== dia) {
          novasAtribuicoes[chave] = item;
          continue;
        }
        const seg = extrairHorasTurno(item.horario);
        if (!(seg.inicio < novoFim && seg.fim > novoInicio)) {
          novasAtribuicoes[chave] = item;
          continue;
        }
        const partesRestantes = [];
        if (seg.inicio < novoInicio) partesRestantes.push({ inicio: seg.inicio, fim: novoInicio });
        if (seg.fim > novoFim) partesRestantes.push({ inicio: novoFim, fim: seg.fim });
        for (const parte of partesRestantes) {
          const horarioParte = formatarIntervaloTurno(parte.inicio, parte.fim - parte.inicio);
          novasAtribuicoes[`${dia}|${horarioParte}`] = {
            ...item,
            horario: horarioParte
          };
        }
      }
      atribuicoesTurno = novasAtribuicoes;
    }

    return { ...estado, covered, shiftEdits, atribuicoesTurno };
  };

  const pessoaDisponivel = (nome, dia, inicio, fim, estado = estadoAtual) => !construirLinhaDoTempoDia(dia, estado)
    .some(seg => seg.tipo === 'turno' && seg.pessoa.nome === nome && seg.inicio < fim && seg.fim > inicio);

  const resolverAtribuicao = (chave, aceitar) => atualizarEstado(estado => {
    const item = estado.atribuicoesTurno?.[chave];
    if (!item) throw new Error('Este pedido já foi respondido.');
    const { inicio, fim } = extrairHorasTurno(item.horario);
    if (aceitar && (!obterHorariosLivres(item.dia, estado).some(l => l.inicio <= inicio && l.fim >= fim)
      || !pessoaDisponivel(item.responsavel, item.dia, inicio, fim, estado))) {
      throw new Error('O turno mudou ou a pessoa não está disponível. Atualize a escala.');
    }
    const atribuicoesTurno = { ...estado.atribuicoesTurno };
    delete atribuicoesTurno[chave];
    return { ...estado, atribuicoesTurno,
      coberturasRede: [...(estado.coberturasRede || []), ...(aceitar ? [{ dia: item.dia, inicio, fim, responsavel: item.responsavel }] : [])],
      historicoAtribuicoes: [...(estado.historicoAtribuicoes || []), { ...item, status: aceitar ? 'Aceita' : 'Recusada ou cancelada' }] };
  });

  const resolverFolga = (id, status, responsavel = '') => atualizarEstado(estado => {
    const pedido = (estado.pedidosFolga || []).find(item => item.id === id);
    if (!pedido || pedido.status !== 'Pendente') throw new Error('Este pedido já foi respondido.');
    if (status === 'Aceita') {
      const turnoAtual = construirLinhaDoTempoDia(pedido.dia, estado).find(seg => seg.tipo === 'turno'
        && seg.pessoa.ehUsuarioAtual && seg.inicio <= pedido.inicio && seg.fim >= pedido.fim);
      if (!turnoAtual || !obterParticipantesRede(estado).some(p => p.nome === responsavel)
        || !pessoaDisponivel(responsavel, pedido.dia, pedido.inicio, pedido.fim, estado)) {
        throw new Error('Escala alterada ou substituto indisponível. Revise o pedido.');
      }
    }
    return { ...estado,
      pedidosFolga: estado.pedidosFolga.map(item => item.id === id ? { ...item, status, responsavel } : item),
      coberturasRede: [...(estado.coberturasRede || []), ...(status === 'Aceita' ? [{ dia: pedido.dia, inicio: pedido.inicio, fim: pedido.fim, responsavel }] : [])] };
  });

  const sairDaRede = responsavel => atualizarEstado(estado => {
    const usuario = obterUsuarioAtual(estado);
    if (usuario.papel !== 'Administrador') throw new Error('Apenas o administrador pode transferir a rede.');
    if (!obterParticipantesRede(estado).some(p => p.nome === responsavel && !p.ehUsuarioAtual)) {
      throw new Error('Escolha outro participante ativo.');
    }
    const dias = [...new Set([...Object.keys(estado.escalasFixas || {}), ...Object.keys(estado.covered || {}), ...Object.keys(estado.shiftEdits || {}).map(k => k.split('|')[0])])].filter(dia => dia >= HOJE);
    const transferencias = dias.flatMap(dia => construirLinhaDoTempoDia(dia, estado)
      .filter(seg => seg.tipo === 'turno' && seg.pessoa.ehUsuarioAtual)
      .map(seg => ({ dia, inicio: seg.inicio, fim: seg.fim, responsavel })));
    if (transferencias.some(seg => !pessoaDisponivel(responsavel, seg.dia, seg.inicio, seg.fim, estado))) throw new Error('O substituto possui conflito de horários. Escolha outra pessoa.');
    return { ...estado, redeSaiu: true, administradorRede: responsavel,
      coberturasRede: [...(estado.coberturasRede || []), ...transferencias],
      pedidosFolga: (estado.pedidosFolga || []).map(item => item.status === 'Pendente' ? { ...item, status: 'Cancelada pela saída' } : item) };
  });

  const mostrarSaidaRede = () => {
    if (!estadoAtual.redeSaiu) return;
    let dialogo = document.getElementById('dialogo-rede-encerrada');
    if (!dialogo) {
      dialogo = document.createElement('dialog'); dialogo.id = 'dialogo-rede-encerrada';
      dialogo.className = 'dialogo-mvp'; dialogo.setAttribute('aria-labelledby', 'titulo-rede-encerrada');
      dialogo.innerHTML = '<h2 id="titulo-rede-encerrada">Você saiu da rede nesta simulação</h2><p>A administração e seus turnos futuros foram transferidos. A rotina permanece preservada nesta sessão.</p><button type="button" class="botao botao--primario">Voltar à demonstração como participante</button>';
      dialogo.addEventListener('cancel', evento => evento.preventDefault());
      dialogo.querySelector('button').addEventListener('click', () => {
        atualizarEstado(estado => ({ ...estado, redeSaiu: false })); location.href = 'home.html';
      });
      document.body.append(dialogo);
    }
    if (!dialogo.open) dialogo.showModal();
  };

  const executarLembretes = (ate, preferencias = {}) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(ate) || !Number.isFinite(Date.parse(ate))) throw new Error('Informe uma data e hora válidas.');
    const estado = estadoAtual;
    const desde = estado.relogioLembretes || `${HOJE}T00:00`;
    if (ate < desde) throw new Error('O relógio deve avançar.');
    const novos = [];
    const existentes = new Set((estado.lembretesExecutados || []).map(item => item.id));
    const incluir = (id, quando, texto) => {
      if (quando > desde && quando <= ate && !existentes.has(id)) novos.push({ id, quando, texto, canal: preferencias.canalNotificacao || 'app-email' });
    };
    if (preferencias.notificacoesMedicacao !== false) {
      for (const dose of obterDoses(estado).filter(item => item.estado === 'prevista')) {
        const minutos = Number(preferencias.antecedenciaMedicacao || 30);
        const data = new Date(`${HOJE}T${String(parseInt(dose.hora, 10)).padStart(2, '0')}:00:00Z`);
        data.setUTCMinutes(data.getUTCMinutes() - minutos);
        incluir(`dose-${HOJE}-${dose.chave}`, data.toISOString().slice(0, 16), `Horário do remédio: ${dose.nome} · ${dose.hora}`);
      }
    }
    const cuidar = { pausa: true, apoio: true, agradecer: false, ...estado.cuidar?.preferencias };
    const usuario = obterUsuarioAtual(estado);
    const primeiro = new Date(`${desde.slice(0, 10)}T00:00:00Z`);
    const ultimo = new Date(`${ate.slice(0, 10)}T00:00:00Z`);
    if ((ultimo - primeiro) / 86400000 > 366) throw new Error('Avance no máximo um ano por vez.');
    for (let data = primeiro; data <= ultimo; data.setUTCDate(data.getUTCDate() + 1)) {
      const dia = data.toISOString().slice(0, 10);
      if (cuidar.pausa) for (const turno of construirLinhaDoTempoDia(dia, estado)) {
        if (turno.tipo === 'turno' && turno.pessoa.nome === usuario.nomeComApelido && turno.fim - turno.inicio > 5) {
          incluir(`pausa-${dia}-${turno.inicio}`, `${dia}T${String(turno.inicio + 5).padStart(2, '0')}:00`, 'Seu turno passou de cinco horas. Combine uma pausa com a rede.');
        }
      }
      if (data.getUTCDay() === 0) {
        if (cuidar.apoio) incluir(`apoio-${dia}`, `${dia}T18:00`, 'Cuidar cansa. Pedir ajuda também é cuidar.');
        if (cuidar.agradecer) incluir(`agradecer-${dia}`, `${dia}T18:00`, 'Que tal agradecer alguém da rede nesta semana?');
      }
    }
    atualizarEstado(atual => ({ ...atual, relogioLembretes: ate, lembretesExecutados: [...(atual.lembretesExecutados || []), ...novos] }));
    return novos;
  };

  const obterTurnoAtual = (estado = estadoAtual) =>
    construirLinhaDoTempoDia(HOJE, estado)
      .find(seg => seg.tipo === 'turno' && seg.inicio <= HORA_REFERENCIA && seg.fim > HORA_REFERENCIA);

  const obterLacunaAtual = (estado = estadoAtual) => obterLacunasDia(HOJE, estado)
    .find(seg => seg.inicio <= HORA_REFERENCIA && seg.fim > HORA_REFERENCIA);

  const popularTurnosRelato = (select, turnoSelecionado = '') => {
    if (!select) return;
    const turnos = construirLinhaDoTempoDia(HOJE).filter(seg => seg.tipo === 'turno');
    select.replaceChildren(new Option('Sem turno (anotação geral)', ''));
    for (const turno of turnos) {
      select.add(new Option(turno.horario, 'Turno ' + turno.horario));
    }
    if ([...select.options].some(opcao => opcao.value === turnoSelecionado)) select.value = turnoSelecionado;
  };

  const possuiLacuna = (dia, estado = estadoAtual) =>
    obterLacunasDia(dia, estado).length > 0;

  const obterRotuloLacuna = (dia, estado = estadoAtual) => {
    const linha = construirLinhaDoTempoDia(dia, estado);
    if (!linha.length) return 'Sem turnos';
    const lacunas = linha.filter(item => item.tipo === 'lacuna');
    if (!lacunas.length) return 'Coberto';
    return linha.some(item => item.tipo === 'turno') ? 'Parcial' : 'Descoberto';
  };

  // Preenche a linha de edição. Só a necessidade cadastrada transforma esses espaços em lacunas.
  const obterEscalaComHorariosLivres = (dia, estado) => {
    const escala = obterEscalaDia(dia, estado);
    const itens = [];
    let cursor = 0;
    const adicionarFaixaLivre = (inicio, fim) => {
      if (inicio < fim) itens.push({ horario: formatarIntervaloTurno(inicio, fim - inicio), lacuna: true });
    };
    for (const item of escala) {
      const faixa = extrairHorasTurno(item.horario);
      adicionarFaixaLivre(cursor, faixa.inicio);
      itens.push(item);
      cursor = Math.max(cursor, faixa.fim);
    }
    adicionarFaixaLivre(cursor, 24);
    return itens;
  };

  function obterEscalaDia(dia, estado = estadoAtual) {
    const fixas = estado?.escalasFixas;
    if (fixas?.[dia]) return fixas[dia];
    const equipe = estado?.equipeCuidado || [];
    if (estado.escalaDemonstracao && equipe.length >= 4 &&
        obterNecessidadeAcompanhamento(estado) === ACOMPANHAMENTO.integral) {
      const indiceBase = Number(dia.slice(-2)) || 1;
      return [
        { horario: '00h–07h', pessoa: equipe[indiceBase % 4] },
        { horario: '07h–13h', pessoa: equipe[(indiceBase + 1) % 4] },
        { horario: '13h–19h', pessoa: equipe[(indiceBase + 2) % 4] },
        { horario: '19h–24h', pessoa: equipe[(indiceBase + 3) % 4] }
      ];
    }

    const recorrentes = [];
    const janela = estado.janelaAcompanhamento;
    if (obterNecessidadeAcompanhamento(estado) === ACOMPANHAMENTO.diario && janela && dia >= janela.desde && janela.responsavel) {
      recorrentes.push({ inicio: janela.inicio, fim: janela.fim, responsavel: janela.responsavel });
    }
    const diaSemana = obterDiaSemana(dia);
    for (const rotina of obterRotinasSemanais(estado)) {
      if (rotina.diaSemana === diaSemana && dia >= rotina.desde && rotina.responsavel) {
        recorrentes.push({ inicio: rotina.inicio, fim: rotina.fim, responsavel: rotina.responsavel });
      }
    }
    return recorrentes
      .sort((a, b) => a.inicio - b.inicio)
      .map(item => ({
        horario: formatarIntervaloTurno(item.inicio, item.fim - item.inicio),
        pessoa: resolverPessoaRede(item.responsavel, estado)
      }));
  }

  function renderizarCalendarioMensal(container, { ano, mes, diaSelecionado, obterMetaDia }) {
    if (!container) return;
    const titulo = container.querySelector('[data-titulo-mes]');
    if (titulo) {
      titulo.textContent = capitalizarPrimeira(formatarData(
        gerarChaveData(ano, mes, 1),
        { month: 'long', year: 'numeric' }
      ));
    }

    const gradeDias = container.querySelector('.calendario-mensal__dias');
    if (!gradeDias) return;

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    let conteudo = '<span aria-hidden="true"></span>'.repeat(primeiroDiaSemana);

    const totalDias = new Date(ano, mes + 1, 0).getDate();
    for (let dia = 1; dia <= totalDias; dia++) {
      const chave = gerarChaveData(ano, mes, dia);
      const meta = obterMetaDia(chave);
      const indicadoresHtml = (meta.indicadores || []).join('');
      const rotulo = `${formatarDataCurta(chave, true)}${meta.sufixoRotulo || ''}`;
      const classes = (meta.classes || []).filter(Boolean).join(' ');
      conteudo += `<button type="button"${classes ? ` class="${escaparHtml(classes)}"` : ''} data-selecionar-dia="${chave}" aria-pressed="${chave === diaSelecionado}" aria-label="${escaparHtml(rotulo)}">${dia}${indicadoresHtml ? `<small class="calendario-mensal__indicadores" aria-hidden="true">${indicadoresHtml}</small>` : ''}</button>`;
    }

    gradeDias.innerHTML = conteudo;
  }

  function inicializarCompartilhamento(dialogo, { gerarSecoes, assuntoEmail }) {
    if (!dialogo) return null;
    const previa = dialogo.querySelector('textarea');
    const retorno = dialogo.querySelector('[data-status-compartilhar]');
    const botaoNativo = dialogo.querySelector('[data-compartilhar="native"]');

    if (botaoNativo && !navigator.share) {
      botaoNativo.hidden = true;
    }

    const atualizarPrevia = () => {
      const secoes = gerarSecoes();
      previa.value = [...dialogo.querySelectorAll('input:checked')]
        .map(input => {
          const conteudo = secoes[input.value]?.();
          return conteudo ? `${input.value}\n${conteudo}` : '';
        })
        .filter(Boolean)
        .join('\n\n');
      dialogo.querySelectorAll('[data-compartilhar]').forEach(botao => {
        botao.disabled = !previa.value;
      });
      if (retorno) retorno.textContent = '';
    };

    document.querySelector(`[data-dialogo="${dialogo.id}"]`)?.addEventListener('click', atualizarPrevia);
    dialogo.addEventListener('change', atualizarPrevia);
    dialogo.addEventListener('click', async evento => {
      const modo = evento.target.closest('[data-compartilhar]')?.dataset.compartilhar;
      if (!modo || !previa.value) return;

      try {
        if (modo === 'whatsapp') {
          window.open(`https://wa.me/?text=${encodeURIComponent(previa.value)}`, '_blank', 'noopener,noreferrer');
        } else if (modo === 'email') {
          window.location.href = `mailto:?subject=${encodeURIComponent(assuntoEmail)}&body=${encodeURIComponent(previa.value)}`;
        } else if (modo === 'native' && navigator.share) {
          await navigator.share({ text: previa.value });
          if (retorno) retorno.textContent = 'Compartilhamento concluído.';
        } else if (modo === 'copy' && navigator.clipboard) {
          await navigator.clipboard.writeText(previa.value);
          if (retorno) retorno.textContent = 'Mensagem copiada.';
        } else {
          previa.focus();
          previa.select();
          if (retorno) retorno.textContent = 'Selecione e copie a mensagem para mandar.';
        }
      } catch (erro) {
        if (erro.name === 'AbortError') return;
        previa.focus();
        previa.select();
        if (retorno) retorno.textContent = 'Selecione e copie a mensagem.';
      }
    });

    return atualizarPrevia;
  }

  function confirmarAcao({
    titulo = 'Confirmar ação',
    descricao = '',
    confirmarTexto = 'Confirmar',
    cancelarTexto = 'Voltar',
    perigoso = true
  } = {}) {
    return new Promise(resolve => {
      let dialogo = document.getElementById('dialogo-confirmacao-mvp');
      if (!dialogo) {
        dialogo = document.createElement('dialog');
        dialogo.id = 'dialogo-confirmacao-mvp';
        dialogo.className = 'dialogo-mvp dialogo-mvp--compacto';
        dialogo.setAttribute('aria-labelledby', 'titulo-confirmacao-mvp');
        dialogo.innerHTML = `
          <div class="dialogo-mvp__cabecalho">
            <h2 id="titulo-confirmacao-mvp"></h2>
          </div>
          <p data-confirmacao-descricao></p>
          <div class="dialogo-mvp__acoes">
            <button type="button" class="botao botao--secundario" data-confirmacao-cancelar></button>
            <button type="button" class="botao" data-confirmacao-ok></button>
          </div>
        `;
        document.body.appendChild(dialogo);
      }

      const tituloEl = dialogo.querySelector('#titulo-confirmacao-mvp');
      const descEl = dialogo.querySelector('[data-confirmacao-descricao]');
      const btnCancelar = dialogo.querySelector('[data-confirmacao-cancelar]');
      const btnOk = dialogo.querySelector('[data-confirmacao-ok]');

      tituloEl.textContent = titulo;
      descEl.textContent = descricao;
      descEl.hidden = !descricao;
      btnCancelar.textContent = cancelarTexto;
      btnOk.textContent = confirmarTexto;
      btnOk.className = `botao ${perigoso ? 'botao--perigo' : 'botao--primario'}`;

      let resolvido = false;
      const finalizar = resultado => {
        if (resolvido) return;
        resolvido = true;
        btnCancelar.removeEventListener('click', aoCancelar);
        btnOk.removeEventListener('click', aoConfirmar);
        dialogo.removeEventListener('close', aoFechar);
        if (dialogo.open) dialogo.close();
        resolve(resultado);
      };

      const aoCancelar = () => finalizar(false);
      const aoConfirmar = () => finalizar(true);
      const aoFechar = () => finalizar(false);

      btnCancelar.addEventListener('click', aoCancelar);
      btnOk.addEventListener('click', aoConfirmar);
      dialogo.addEventListener('close', aoFechar);
      dialogo.showModal();
      btnCancelar.focus();
    });
  }

  let timerStatus = null;
  function anunciarStatus(elementoStatus, mensagem, opcoes = {}) {
    if (!elementoStatus) return;
    clearTimeout(timerStatus);

    const dados = typeof mensagem === 'object' && mensagem !== null
      ? mensagem
      : { titulo: opcoes.titulo || '', descricao: mensagem, ...opcoes };

    const titulo = String(dados.titulo || '').trim();
    const descricao = String(dados.descricao || '').trim();
    if (!titulo && !descricao) {
      elementoStatus.innerHTML = '';
      elementoStatus.removeAttribute('data-mvp-status');
      elementoStatus.setAttribute('data-mvp-status', '');
      return;
    }

    const limpar = () => {
      clearTimeout(timerStatus);
      elementoStatus.innerHTML = '';
      elementoStatus.setAttribute('data-mvp-status', '');
    };

    const avatarHtml = dados.avatar
      ? `<img class="status-mvp__avatar" src="${escaparHtml(dados.avatar)}" alt="" aria-hidden="true">`
      : '';
    const tituloHtml = titulo ? `<strong>${escaparHtml(titulo)}</strong>` : '';
    const descricaoHtml = descricao
      ? (titulo ? `<span>${escaparHtml(descricao)}</span>` : `<strong>${escaparHtml(descricao)}</strong>`)
      : '';

    elementoStatus.setAttribute('data-mvp-status', dados.tipo || '');
    elementoStatus.innerHTML = '';
    requestAnimationFrame(() => {
      elementoStatus.innerHTML = `
        ${avatarHtml}
        <div class="status-mvp__conteudo">${tituloHtml}${descricaoHtml}</div>
        <button type="button" class="botao botao--secundario botao--pequeno status-mvp__fechar">Fechar</button>
      `;
      elementoStatus.querySelector('.status-mvp__fechar')?.addEventListener('click', limpar);
    });

    timerStatus = setTimeout(limpar, 6000);
  }

  const chaveDose = (hora, nome) => `${hora}|${nome}`;

  const normalizarHoraPorta = hora => {
    const num = parseInt(String(hora || ''), 10);
    return Number.isFinite(num) ? `${num}h` : '';
  };

  const obterGruposPortaRemedios = (estado = estadoAtual) => {
    const editados = estado.itensEditados || {};
    const registros = estado.registrosDose || {};
    const basePorta = Array.isArray(estado.portaRemedios) ? estado.portaRemedios : [];
    const grupos = basePorta.map(g => ({
      ...g,
      itens: g.itens.filter(([id, inicial]) => {
        const edicao = editados[id];
        return inicial || registros[chaveDose(g.hora, id)]
          || (edicao?.tipo !== 'Insumo' && (!edicao?.horarioDefinido || edicao.horarioDefinido === g.hora));
      }).map(item => [...item])
    }));
    const excluidos = new Set(estado.itensExcluidos || []);
    const usuario = obterUsuarioAtual(estado);

    const reagendados = Object.entries(editados).filter(([, item]) => item.horarioDefinido)
      .map(([chave, item]) => ({ ...item, chave, horarios: item.horarioDefinido }));
    for (const extra of [...(estado.itensExtras || []), ...reagendados]) {
      if (extra?.tipo !== 'Medicamento' || !extra.horarios || excluidos.has(extra.chave || extra.nome)) continue;
      const hora = normalizarHoraPorta(extra.horarios);
      if (!hora) continue;
      let grupo = grupos.find(g => g.hora === hora);
      if (!grupo) {
        const horaNum = parseInt(hora, 10);
        grupo = {
          hora,
          momento: horaNum < 12 ? 'passado' : horaNum === 12 ? 'agora' : 'depois',
          responsavel: usuario.nomeComApelido,
          itens: []
        };
        grupos.push(grupo);
      }
      const id = extra.chave || extra.nome;
      if (!grupo.itens.some(([chave]) => chave === id)) {
        grupo.itens.push([id]);
      }
    }

    for (const [chaveRegistro] of Object.entries(registros)) {
      const [hora, id] = chaveRegistro.split('|');
      const origem = editados[id] || estado.itensExtras?.find(item => (item.chave || item.nome) === id);
      if (!origem || excluidos.has(id) || !/^\d{1,2}h$/.test(hora)) continue;
      let grupo = grupos.find(item => item.hora === hora);
      if (!grupo) {
        const horaNum = parseInt(hora, 10);
        grupo = {
          hora, momento: horaNum < 12 ? 'passado' : horaNum === 12 ? 'agora' : 'depois',
          responsavel: usuario.nomeComApelido, itens: []
        };
        grupos.push(grupo);
      }
      if (!grupo.itens.some(([chave]) => chave === id)) grupo.itens.push([id]);
    }

    return grupos
      .map(g => ({ ...g, itens: g.itens.filter(([nome]) => !excluidos.has(nome)) }))
      .filter(g => g.itens.length > 0)
      .sort((a, b) => parseInt(a.hora, 10) - parseInt(b.hora, 10));
  };

  const obterDoses = (estado = estadoAtual) => {
    const registros = estado.registrosDose || {};
    return obterGruposPortaRemedios(estado).flatMap(grupo => grupo.itens.map(([nome, base]) => {
      const itemId = nome;
      const chave = chaveDose(grupo.hora, itemId);
      const nomeExibido = estado.itensEditados?.[itemId]?.nome
        || estado.itensExtras?.find(item => (item.chave || item.nome) === itemId)?.nome || itemId;
      const meu = registros[chave];
      const registro = meu || base || { estado: 'prevista' };
      return {
        chave,
        itemId,
        nome: nomeExibido,
        hora: grupo.hora,
        momento: grupo.momento,
        responsavel: grupo.responsavel,
        estado: registro.estado,
        quem: registro.quem || '',
        horario: registro.horario || '',
        motivo: registro.motivo || '',
        origemExterna: registro.origemExterna || '',
        meu: Boolean(meu)
      };
    }));
  };

  const obterCompartimentos = (estado = estadoAtual) => {
    const doses = obterDoses(estado);
    const escala = construirLinhaDoTempoDia(HOJE, estado);
    return obterGruposPortaRemedios(estado).map(grupo => {
      const hora = parseInt(grupo.hora, 10);
      const turno = escala.find(item => item.tipo === 'turno' && hora >= item.inicio && hora < item.fim);
      const responsavel = turno?.pessoa?.nome || '';
      const itens = doses.filter(dose => dose.hora === grupo.hora);
      const faltam = itens.filter(dose => dose.estado !== 'administrado').length;
      const naoDados = itens.filter(dose => dose.estado === 'nao-administrado').length;
      const situacao = faltam === 0 ? 'dado' : naoDados || grupo.momento === 'passado' ? 'falta' : grupo.momento;
      return { hora: grupo.hora, responsavel, momento: grupo.momento, itens, faltam, completo: faltam === 0, situacao };
    });
  };

  const prepararOrigemEstoque = (form, dose) => {
    if (!form || !dose) return;
    let campo = form.querySelector('[data-origem-estoque]');
    if (!campo) {
      campo = document.createElement('label');
      campo.dataset.origemEstoque = '';
      campo.textContent = 'Acabou o remédio em casa. Se você já deu, diga de onde veio (não vai sair do que tem em casa):';
      const input = document.createElement('textarea');
      input.name = 'origemExterna'; input.maxLength = 300; input.rows = 2;
      campo.append(input);
      form.prepend(campo);
    }
    const semSaldo = obterEstoque(dose.itemId) === 0 && dose.estado !== 'administrado';
    campo.hidden = !semSaldo;
    campo.querySelector('textarea').required = semSaldo;
    campo.querySelector('textarea').value = '';
  };

  const registrarDose = (chave, registro) => atualizarEstado(estado => {
    const dose = obterDoses(estado).find(item => item.chave === chave);
    if (!dose) throw new Error('Dose não encontrada. Atualize a rotina.');
    if (registro.estado === 'administrado' && dose.estado !== 'administrado' && obterEstoque(dose.itemId, estado) === 0 && !registro.origemExterna?.trim()) {
      throw new Error('Estoque zerado. Reponha o saldo ou informe a origem externa da unidade utilizada.');
    }
    return { ...estado, registrosDose: { ...(estado.registrosDose || {}), [chave]: registro } };
  });

  const desfazerDose = chave => atualizarEstado(estado => {
    const registros = { ...(estado.registrosDose || {}) };
    delete registros[chave];
    return { ...estado, registrosDose: registros };
  });

  const contarUnidadesUsadas = (id, estado) => Object.entries(estado.registrosDose || {})
    .filter(([chave, registro]) => chave.split('|')[1] === id && registro.estado === 'administrado' && !registro.origemExterna).length;

  const obterEstoque = (id, estado = estadoAtual) => {
    const nomeAnterior = estado.itensEditados?.[id]?.nome
      || estado.itensExtras?.find(item => item.chave === id)?.nome;
    const base = estado.estoqueBase?.[id] ?? estado.estoqueBase?.[nomeAnterior] ?? estado.estoqueInicial?.[id];
    return Number.isFinite(base) ? Math.max(0, base - contarUnidadesUsadas(id, estado)) : null;
  };

  const definirSaldoEstoque = (estado, id, quantidade) => ({
    ...estado.estoqueBase, [id]: quantidade + contarUnidadesUsadas(id, estado)
  });

  const reporEstoque = (id, quantidade, observacao = '') => {
    if (!Number.isInteger(quantidade) || quantidade < 1) return estadoAtual;
    return atualizarEstado(estado => {
      const anotacao = {
        quantidade, autor: obterUsuarioAtual(estado).nomeComApelido,
        dia: HOJE, observacao: observacao.trim()
      };
      return {
        ...estado,
        estoqueBase: definirSaldoEstoque(estado, id, (obterEstoque(id, estado) ?? 0) + quantidade),
        reposicoesEstoque: {
          ...estado.reposicoesEstoque,
          [id]: [anotacao, ...(estado.reposicoesEstoque?.[id] || [])]
        }
      };
    });
  };

  window.addEventListener('pageshow', evento => {
    if (!evento.persisted) return;
    if (banco.mudouNoHistorico()) location.reload();
  });

  window.MutiraoCuidado = {
    HOJE,
    obterEstado: () => estadoAtual,
    obterPreferencias: () => {
      try { return JSON.parse(sessionStorage.getItem('mutirao-configuracoes-sessao-v1') || '{}'); }
      catch { return {}; }
    },
    atualizarEstado,
    obterUsuarioAtual,
    obterPerfisAcompanhados,
    obterPerfilAtivoId: () => estadoAtual.perfilAtivoId,
    selecionarPerfilAcompanhado,
    nomePessoaAcompanhada,
    obterCompromissos,
    obterCompromissosFuturos,
    obterProximoCompromisso,
    obterParticipantesRede,
    resolverConvite,
    resolverAtribuicao,
    resolverFolga,
    executarLembretes,
    sairDaRede,
    mostrarSaidaRede,
    pessoaDisponivel,
    resolverPessoaRede,
    normalizarBusca,
    vincularFiltro,
    escaparHtml,
    sanitizarHtmlEditor,
    inicializarEditoresRicos,
    gerarChaveData,
    obterSemanaDe,
    formatarData,
    formatarDataCurta,
    capitalizarPrimeira,
    possuiLacuna,
    ACOMPANHAMENTO,
    obterNecessidadeAcompanhamento,
    obterDescricaoAcompanhamento,
    obterPedidosForaDaRotina,
    obterHorariosLivres,
    renderizarAdicionarTurnos,
    prepararFormularioTurno,
    atualizarPreviaTurno,
    obterIntervaloFormularioTurno,
    definirRotinaTurno,
    removerRotinaSemanal,
    contarParticipacoesUsuario,
    cancelarTodasParticipacoesUsuario,
    obterRotinasSemanais,
    descreverRotinaSemanal,
    obterJanelasObrigatorias,
    obterSugestaoTurnoCompromisso,
    ESCOPO_TURNO,
    obterLacunasDia,
    obterRotuloLacuna,
    construirLinhaDoTempoDia,
    aplicarIntervaloZe,
    normalizarIntervalos,
    formatarIntervaloTurno,
    extrairHorasTurno,
    obterEscalaDia,
    obterTurnoAtual,
    obterLacunaAtual,
    popularOpcoesHorario,
    popularTurnosRelato,
    renderizarCalendarioMensal,
    inicializarCompartilhamento,
    confirmarAcao,
    anunciarStatus,
    chaveDose,
    obterDoses,
    obterResumoMedicamentos: (estado = estadoAtual) => [...new Set(obterDoses(estado).map(dose => `${dose.nome} · ${dose.hora}`))],
    obterCompartimentos,
    registrarDose,
    prepararOrigemEstoque,
    desfazerDose,
    obterEstoque,
    definirSaldoEstoque,
    reporEstoque
  };
  atualizarSeletoresRede();
  mostrarSaidaRede();
  if (seletor) seletor.inert = false;
  if (main) {
    main.hidden = false;
    main.removeAttribute('aria-busy');
  }
  status.remove();
  window.dispatchEvent(new Event('mutirao:cuidado-pronto'));
  return window.MutiraoCuidado;
})();
