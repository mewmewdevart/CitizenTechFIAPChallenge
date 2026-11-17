(() => {
  const CHAVE_ESTADO = 'mutirao-mvp-estado-v1';
  const HOJE = '2026-11-10';

  const EQUIPE_CUIDADO = [
    { nome: 'Ana da Silva (Aninha)', avatar: 'icone-mascote-espeto.svg' },
    { nome: 'Beatriz da Silva (Bea)', avatar: 'icone-mascote-trevo.svg' },
    { nome: 'Paulo da Silva (Paul)', avatar: 'icone-mascote-pingo.svg' },
    { nome: 'Zé da Manga', avatar: 'icone-mascote-cubado.svg' }
  ];

  const LACUNAS_TURNO = {
    '2026-11-10': ['12h–13h', 'Descoberto'],
    '2026-11-11': ['00h–24h', 'Descoberto'],
    '2026-11-12': ['08h–14h', 'Parcial'],
    '2026-11-13': ['14h–18h', 'Parcial']
  };

  const ESCALAS_FIXAS = {
    '2026-11-09': [
      { horario: '00h–07h', pessoa: EQUIPE_CUIDADO[0] },
      { horario: '07h–13h', pessoa: EQUIPE_CUIDADO[1] },
      { horario: '13h–19h', pessoa: EQUIPE_CUIDADO[2] },
      { horario: '19h–24h', pessoa: EQUIPE_CUIDADO[3] }
    ],
    '2026-11-10': [
      { horario: '00h–07h', pessoa: EQUIPE_CUIDADO[0] },
      { horario: '07h–12h', pessoa: EQUIPE_CUIDADO[1] },
      { horario: '12h–13h', pessoa: null, lacuna: true },
      { horario: '13h–19h', pessoa: EQUIPE_CUIDADO[2] },
      { horario: '19h–24h', pessoa: EQUIPE_CUIDADO[3] }
    ],
    '2026-11-11': [
      { horario: '00h–24h', pessoa: null, lacuna: true }
    ],
    '2026-11-12': [
      { horario: '00h–08h', pessoa: EQUIPE_CUIDADO[0] },
      { horario: '08h–14h', pessoa: null, lacuna: true },
      { horario: '14h–19h', pessoa: EQUIPE_CUIDADO[2] },
      { horario: '19h–24h', pessoa: EQUIPE_CUIDADO[3] }
    ],
    '2026-11-13': [
      { horario: '00h–07h', pessoa: EQUIPE_CUIDADO[1] },
      { horario: '07h–14h', pessoa: EQUIPE_CUIDADO[0] },
      { horario: '14h–18h', pessoa: null, lacuna: true },
      { horario: '18h–24h', pessoa: EQUIPE_CUIDADO[3] }
    ],
    '2026-11-14': [
      { horario: '00h–07h', pessoa: EQUIPE_CUIDADO[0] },
      { horario: '07h–13h', pessoa: EQUIPE_CUIDADO[1] },
      { horario: '13h–19h', pessoa: EQUIPE_CUIDADO[2] },
      { horario: '19h–24h', pessoa: EQUIPE_CUIDADO[3] }
    ],
    '2026-11-15': [
      { horario: '00h–07h', pessoa: EQUIPE_CUIDADO[2] },
      { horario: '07h–13h', pessoa: EQUIPE_CUIDADO[1] },
      { horario: '13h–19h', pessoa: EQUIPE_CUIDADO[0] },
      { horario: '19h–24h', pessoa: EQUIPE_CUIDADO[3] }
    ]
  };

  function criarEstadoInicial() {
    return {
      person: {
        nome: 'Maria das Dores',
        apelido: 'Mari',
        nascimento: '1947-05-18',
        cpf: '123.456.789-00',
        rg: '12.345.678-9',
        email: 'maria.dores@example.com',
        telefoneFixo: '(11) XXXX-0140',
        celular: '(11) 9XXXX-0142',
        endereco: 'Rua das Acácias, 120 · Vila Aurora · São Paulo/SP',
        convenio: 'Convênio Vida Plena · Plano Familiar (fictício)',
        carteira: '4128 9910 3304 2048',
        alergias: 'Dipirona',
        condicoes: 'Epilepsia, Diabetes tipo 2, Asma, Hipertensão arterial',
        medicamentos: 'Losartana · 08h, Metformina · 08h e 20h',
        historicoSaude: 'Cirurgia na perna esquerda (2021) · Placa e parafusos após fratura.<br>Histórico de trombose venosa profunda (2022).',
        referencia: 'Ana da Silva (Aninha) · Filha · +55 (11) 9XXXX-0186',
        alternativo: 'Paulo da Silva (Paul) · Neto · +55 (11) 9XXXX-0193',
        cobertura: '24 horas por dia',
        preferencias: 'Prefere consultas à tarde e gosta de conferir a agenda com a família.',
        foto: 'assets/media/fotos/foto-perfil-maria.png',
        mascote: 'assets/media/mascotes/icone-mascote-minhoca.svg'
      },
      events: [
        {
          id: 'evt-caminhada-09',
          dia: '2026-11-09',
          hora: '15:30',
          titulo: 'Caminhada leve no quintal e hidratação',
          local: 'Casa · Turno 13h–19h',
          acompanhante: 'Paulo da Silva (Paul)',
          criadoPor: 'Paulo da Silva (Paul)'
        },
        {
          id: 'evt-ubs-10',
          dia: HOJE,
          hora: '14:00',
          titulo: 'Consulta na UBS',
          local: 'UBS do bairro',
          acompanhante: 'Ana da Silva (Aninha)',
          preparacao: [
            'Levar a pasta da consulta · Ana da Silva (Aninha)',
            'Volta combinada · Paulo da Silva (Paul)'
          ]
        },
        {
          id: 'evt-geriatria-18',
          dia: '2026-11-18',
          hora: '14:00',
          titulo: 'Geriatria',
          local: 'Consultório de Geriatria',
          acompanhante: 'Ana da Silva (Aninha)'
        },
        {
          id: 'evt-hemoglobina-21',
          dia: '2026-11-21',
          hora: '08:00',
          titulo: 'Hemoglobina glicada',
          local: 'Coleta · UBS do bairro',
          acompanhante: ''
        }
      ],
      covered: {},
      shiftEdits: {},
      tasks: [
        {
          id: 'tarefa-ontem-06-08',
          dia: '2026-11-09',
          titulo: '06h e 08h · Medicações da manhã administradas',
          descricao: 'Café da manhã completo, pressão 12x8 · Beatriz da Silva (Bea) · Turno 07h–13h',
          icone: 'bi bi-capsule',
          concluida: true,
          href: 'ficha.html#diario',
          rotuloAcao: 'Ver no Diário'
        },
        {
          id: 'tarefa-ontem-otorrino',
          dia: '2026-11-09',
          titulo: '08h10 · Passagem registrada: agendar otorrino',
          descricao: 'Verificar cobertura do Convênio Vida Plena antes de marcar · Beatriz da Silva (Bea)',
          icone: 'icone-receita.svg',
          concluida: true,
          href: 'index.html#passagem-cuidado',
          rotuloAcao: 'Ver passagem'
        },
        {
          id: 'tarefa-ontem-retorno-ubs',
          dia: '2026-11-09',
          titulo: '16h · Retorno da consulta de terça combinado',
          descricao: 'Paulo da Silva (Paul) confirmou buscar Mari e Ana na UBS após as 14h · Turno 13h–19h',
          icone: 'icone-receita.svg',
          concluida: true,
          href: 'agenda.html?dia=2026-11-10',
          rotuloAcao: 'Ver dia 10/11'
        },
        {
          id: 'tarefa-ontem-20h-docs',
          dia: '2026-11-09',
          titulo: '20h · Metformina e separação de documentos',
          descricao: 'Administrada por Zé da Manga (Zé) · RG e carteirinha separados para a UBS · Turno 19h–24h',
          icone: 'bi bi-capsule',
          concluida: true,
          href: 'documentos.html',
          rotuloAcao: 'Ver Documentos'
        },
        {
          id: 'tarefa-ubs-retirada',
          dia: HOJE,
          titulo: 'Retirar medicamento na UBS',
          descricao: 'Após a consulta · Ana da Silva (Aninha) · Receita vinculada',
          icone: 'icone-receita.svg',
          concluida: false,
          dialogo: 'dialogo-tarefa-ubs'
        },
        {
          id: 'tarefa-metformina-08',
          dia: HOJE,
          titulo: '08h · Metformina',
          descricao: 'Não administrada · Ocorrência registrada por Bea',
          icone: 'bi bi-capsule',
          concluida: false,
          href: 'medicamentos.html',
          rotuloAcao: 'Registrar administração'
        },
        {
          id: 'tarefa-metformina-20',
          dia: HOJE,
          titulo: '20h · Metformina',
          descricao: 'Prevista para 20h · Turno de Zé da Manga (Zé)',
          icone: 'bi bi-capsule',
          concluida: false,
          href: 'medicamentos.html',
          rotuloAcao: 'Registrar administração'
        },
        {
          id: 'tarefa-hoje-jejum-06',
          dia: HOJE,
          titulo: '06h · Medicações em jejum administradas',
          descricao: '3 doses administradas por Aninha (06h10 e 06h12) · Turno de Ana da Silva (Aninha)',
          icone: 'bi bi-capsule',
          concluida: true,
          href: 'medicamentos.html#registros-de-hoje',
          rotuloAcao: 'Ver registros'
        }
      ],
      reports: {
        [HOJE]: [
          [
            'Beatriz da Silva (Bea)',
            'Cuidadora · Turno 07h–12h',
            'Tarefa relacionada · Retirar medicamento na UBS · Ocorrência · Metformina das 08h não administrada',
            'Confirmei a consulta das 14h. A metformina das 08h não foi administrada e o motivo não foi informado.',
            'A agendar consulta com otorrinolaringologista. Antes de agendar, confirme se o convênio cobre a consulta.'
          ],
          [
            'Ana da Silva (Aninha)',
            'Filha · Contato de referência · Turno 00h–07h',
            'Tarefa relacionada · Levar a pasta da consulta',
            'Separei os documentos e deixei a pasta na bolsa azul.',
            'Levar a pasta para a consulta das 14h.'
          ]
        ],
        '2026-11-09': [
          [
            'Zé da Manga',
            'Administrador · Turno 19h–24h',
            'Tarefa relacionada · Conferir medicações da noite',
            'Maria jantou sopa de legumes e tomou a metformina das 20h sem intercorrências. Foi dormir por volta das 22h30.',
            'Deixei o RG e a carteirinha do convênio separados em cima da cômoda para a consulta de amanhã.'
          ],
          [
            'Paulo da Silva (Paul)',
            'Neto · Contato alternativo · Turno 13h–19h',
            'Tarefa relacionada · Combinar retorno da consulta de terça',
            'Fizemos uma caminhada leve no quintal à tarde e mantivemos boa hidratação. Sem queixas de dor.',
            'Confirmado que busco a Maria e a Ana na UBS amanhã após a consulta das 14h.'
          ],
          [
            'Beatriz da Silva (Bea)',
            'Cuidadora · Turno 07h–13h',
            'Tarefa relacionada · Administrar medicamentos da manhã',
            'Café da manhã completo. Losartana e metformina das 08h administradas corretamente; pressão arterial estável (12x8).',
            'Lembrar de oferecer água ao longo da tarde.'
          ],
          [
            'Ana da Silva (Aninha)',
            'Filha · Contato de referência · Turno 00h–07h',
            'Tarefa relacionada · Acompanhar repouso noturno',
            'Noite tranquila, dormiu sem despertares e acordou bem-disposta às 06h40.',
            'Receita da medicação de uso contínuo ficou na pasta azul.'
          ]
        ]
      },
      documents: [
        {
          id: 'doc-receita-ubs',
          titulo: 'Receita para retirada na UBS',
          categoria: 'Receita',
          dia: '2026-11-10',
          autor: 'Ana da Silva (Aninha)',
          compromissoId: 'evt-ubs-10',
          vinculo: 'Consulta na UBS de 10 nov.',
          localOriginal: 'Pasta azul da Mari (sala) · cópia no WhatsApp da Aninha',
          observacoes: 'Receita para retirada de medicamento após a consulta das 14h na UBS do bairro.'
        },
        {
          id: 'doc-hemograma',
          titulo: 'Hemograma',
          categoria: 'Exame',
          dia: '2026-11-04',
          autor: 'Paulo da Silva (Paul)',
          vinculo: 'Exame cadastrado em 4 nov.',
          localOriginal: 'Pasta de exames (gaveta do quarto) · PDF com o Paul',
          observacoes: 'Resultado completo do hemograma realizado em 4 de novembro de 2026.'
        },
        {
          id: 'doc-ficha-atendimento',
          titulo: 'Ficha de atendimento',
          categoria: 'Documento',
          dia: '2026-11-06',
          autor: 'Beatriz da Silva (Bea)',
          vinculo: 'Documento geral',
          localOriginal: 'Pasta azul da Mari (sala)',
          observacoes: 'Registro de atendimento ambulatorial e orientações da equipe.'
        }
      ]
    };
  }

  function migrarRegistrosDose(anterior) {
    const registros = { ...anterior };
    const chaveAnterior = '18h|Metformina';
    const chaveAtual = '20h|Metformina';
    if (registros[chaveAnterior] && !registros[chaveAtual]) {
      registros[chaveAtual] = registros[chaveAnterior];
      delete registros[chaveAnterior];
    }
    return registros;
  }

  function carregarEstado() {
    const base = criarEstadoInicial();
    try {
      const salvo = sessionStorage.getItem(CHAVE_ESTADO);
      if (!salvo) return base;
      const dados = JSON.parse(salvo);
      return {
        ...base,
        ...dados,
        registrosDose: migrarRegistrosDose(dados?.registrosDose),
        person: { ...base.person, ...(dados?.person || {}) },
        events: Array.isArray(dados?.events) ? dados.events : base.events,
        covered: dados?.covered && typeof dados.covered === 'object' ? dados.covered : {},
        shiftEdits: dados?.shiftEdits && typeof dados.shiftEdits === 'object' ? dados.shiftEdits : {},
        tasks: Array.isArray(dados?.tasks) ? dados.tasks : base.tasks,
        reports: dados?.reports && typeof dados.reports === 'object' ? dados.reports : base.reports,
        documents: Array.isArray(dados?.documents) ? dados.documents : base.documents
      };
    } catch {
      return base;
    }
  }

  let estadoAtual = carregarEstado();

  function persistirEstado() {
    try {
      sessionStorage.setItem(CHAVE_ESTADO, JSON.stringify(estadoAtual));
    } catch {
      // Ignora caso o navegador restrinja sessionStorage
    }
  }

  function atualizarEstado(transformador) {
    estadoAtual = typeof transformador === 'function' ? transformador(estadoAtual) : { ...estadoAtual, ...transformador };
    persistirEstado();
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
    return {
      nome,
      apelido,
      nomeComApelido,
      vinculo: (perfil.vinculo || 'Neto').trim(),
      papel: (perfil.papel || 'Administrador').trim(),
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

  const obterCompromissos = (estado = estadoAtual) =>
    [...estado.events].sort((a, b) => `${a.dia}T${a.hora}`.localeCompare(`${b.dia}T${b.hora}`));

  const obterCompromissosFuturos = (estado = estadoAtual) =>
    obterCompromissos(estado).filter(item => `${item.dia}T${item.hora}` >= `${HOJE}T11:58`);

  const obterProximoCompromisso = () => obterCompromissosFuturos()[0];

  const obterParticipantesRede = (estado = estadoAtual) => {
    const usuario = obterUsuarioAtual(estado);
    const lista = EQUIPE_CUIDADO.map(pessoa => {
      if (pessoa.nome === 'Zé da Manga') {
        return {
          nome: usuario.nomeComApelido,
          nomeBase: usuario.nome,
          avatar: usuario.avatarArquivo,
          foto: usuario.foto
        };
      }
      return {
        nome: pessoa.nome,
        nomeBase: pessoa.nome.split(' (')[0].trim(),
        avatar: pessoa.avatar,
        foto: ''
      };
    });
    return lista.filter(pessoa => !/maria das dores|\(mari\)/i.test(pessoa.nome));
  };

  const resolverPessoaRede = (nome, estado = estadoAtual) => {
    const participantes = obterParticipantesRede(estado);
    const alvo = normalizarBusca(nome);
    const usuario = obterUsuarioAtual(estado);
    let encontrada = participantes.find(pessoa =>
      normalizarBusca(pessoa.nome) === alvo || normalizarBusca(pessoa.nomeBase) === alvo
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
      return { sincronizarTodos: () => {}, limparTodos: () => {} };
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

  const obterLacunasDia = (dia, estado = estadoAtual) => {
    const escala = obterEscalaDia(dia);
    const lacunas = [];

    for (const item of escala) {
      const slot = extrairHorasTurno(item.horario);
      const chave = `${dia}|${item.horario}`;
      const edicao = estado.shiftEdits?.[chave];

      if (item.lacuna) {
        const cobertos = normalizarIntervalos(estado.covered?.[dia], slot.inicio, slot.fim);
        let cursor = slot.inicio;
        for (const cob of cobertos) {
          if (cob.inicio > cursor) {
            lacunas.push({ inicio: cursor, fim: cob.inicio, horario: formatarIntervaloTurno(cursor, cob.inicio - cursor) });
          }
          cursor = Math.max(cursor, cob.fim);
        }
        if (cursor < slot.fim) {
          lacunas.push({ inicio: cursor, fim: slot.fim, horario: formatarIntervaloTurno(cursor, slot.fim - cursor) });
        }
      } else if (edicao?.cancelado) {
        lacunas.push({ inicio: slot.inicio, fim: slot.fim, horario: item.horario });
      } else if (edicao && typeof edicao.inicio === 'number' && typeof edicao.duracao === 'number') {
        if (edicao.inicio > slot.inicio) {
          lacunas.push({ inicio: slot.inicio, fim: edicao.inicio, horario: formatarIntervaloTurno(slot.inicio, edicao.inicio - slot.inicio) });
        }
        const fimEdicao = edicao.inicio + edicao.duracao;
        if (fimEdicao < slot.fim) {
          lacunas.push({ inicio: fimEdicao, fim: slot.fim, horario: formatarIntervaloTurno(fimEdicao, slot.fim - fimEdicao) });
        }
      }
    }

    return normalizarIntervalos(lacunas, 0, 24).map(l => ({
      inicio: l.inicio,
      fim: l.fim,
      horario: formatarIntervaloTurno(l.inicio, l.fim - l.inicio)
    }));
  };

  const construirLinhaDoTempoDia = (dia, estado = estadoAtual) => {
    const escala = obterEscalaDia(dia);
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
      } else if (item.pessoa?.nome === 'Zé da Manga') {
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

    const mesclados = [];
    for (const seg of segmentos) {
      const ultimo = mesclados[mesclados.length - 1];
      const mesmoTurnoZe = ultimo
        && ultimo.tipo === 'turno'
        && seg.tipo === 'turno'
        && (ultimo.pessoa?.ehUsuarioAtual || ultimo.pessoa?.nome === 'Zé da Manga')
        && (seg.pessoa?.ehUsuarioAtual || seg.pessoa?.nome === 'Zé da Manga')
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

    return mesclados.map((seg, idx) => {
      const anterior = mesclados[idx - 1];
      const proximo = mesclados[idx + 1];
      const janelaMin = anterior?.tipo === 'lacuna' ? anterior.inicio : seg.inicio;
      const janelaMax = proximo?.tipo === 'lacuna' ? proximo.fim : seg.fim;
      return {
        ...seg,
        horario: formatarIntervaloTurno(seg.inicio, seg.fim - seg.inicio),
        janelaMin,
        janelaMax
      };
    });
  };

  const aplicarIntervaloZe = (estado, dia, janelaMin, janelaMax, novoInicio, novoFim) => {
    const escala = obterEscalaDia(dia);
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
        const existentes = normalizarIntervalos(covered[dia], slot.inicio, slot.fim);
        const restantes = [];
        for (const c of existentes) {
          if (c.inicio < janelaMin) restantes.push({ inicio: c.inicio, fim: Math.min(c.fim, janelaMin) });
          if (c.fim > janelaMax) restantes.push({ inicio: Math.max(c.inicio, janelaMax), fim: c.fim });
        }
        if (covA < covB) {
          restantes.push({ inicio: covA, fim: covB });
        }
        const atualizados = normalizarIntervalos(restantes, slot.inicio, slot.fim);
        if (atualizados.length) {
          covered[dia] = atualizados;
        } else {
          delete covered[dia];
        }
      } else if (item.pessoa?.nome === 'Zé da Manga') {
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

    return { ...estado, covered, shiftEdits };
  };

  const possuiLacuna = (dia, estado = estadoAtual) =>
    obterLacunasDia(dia, estado).length > 0;

  const obterRotuloLacuna = (dia, estado = estadoAtual) => {
    const lacunas = obterLacunasDia(dia, estado);
    if (!lacunas.length) return 'Coberto';
    const totalHoras = lacunas.reduce((soma, l) => soma + (l.fim - l.inicio), 0);
    if (totalHoras >= 24) return 'Descoberto';
    if (LACUNAS_TURNO[dia]?.[1] === 'Descoberto' && !estado.covered?.[dia]) return 'Descoberto';
    return 'Parcial';
  };

  function obterEscalaDia(dia) {
    if (ESCALAS_FIXAS[dia]) return ESCALAS_FIXAS[dia];
    const indiceBase = Number(dia.slice(-2)) || 1;
    return [
      { horario: '00h–07h', pessoa: EQUIPE_CUIDADO[indiceBase % 4] },
      { horario: '07h–13h', pessoa: EQUIPE_CUIDADO[(indiceBase + 1) % 4] },
      { horario: '13h–19h', pessoa: EQUIPE_CUIDADO[(indiceBase + 2) % 4] },
      { horario: '19h–24h', pessoa: EQUIPE_CUIDADO[(indiceBase + 3) % 4] }
    ];
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
      conteudo += `<button type="button" data-selecionar-dia="${chave}" aria-pressed="${chave === diaSelecionado}" aria-label="${escaparHtml(rotulo)}">${dia}${indicadoresHtml ? `<small class="calendario-mensal__indicadores" aria-hidden="true">${indicadoresHtml}</small>` : ''}</button>`;
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
          if (retorno) retorno.textContent = 'Selecione e copie a mensagem para compartilhar.';
        }
      } catch (erro) {
        if (erro.name === 'AbortError') return;
        previa.focus();
        previa.select();
        if (retorno) retorno.textContent = 'Selecione e copie a mensagem manualmente.';
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

  const PORTA_REMEDIOS = [
    {
      hora: '6h',
      momento: 'passado',
      responsavel: 'Ana da Silva (Aninha)',
      itens: [
        ['Levotiroxina', { estado: 'administrado', quem: 'Aninha', horario: '06:10' }],
        ['Carbamazepina', { estado: 'administrado', quem: 'Aninha', horario: '06:10' }],
        ['Bombinha', { estado: 'administrado', quem: 'Aninha', horario: '06:12' }]
      ]
    },
    {
      hora: '8h',
      momento: 'passado',
      responsavel: 'Beatriz da Silva (Bea)',
      itens: [
        ['Losartana', { estado: 'administrado', quem: 'Bea', horario: '08:15' }],
        ['Metformina', { estado: 'nao-administrado', quem: 'Bea', motivo: 'Motivo não informado' }],
        ['Hidroclorotiazida', { estado: 'administrado', quem: 'Bea', horario: '08:15' }],
        ['Cálcio + vit. D', { estado: 'administrado', quem: 'Bea', horario: '08:16' }],
        ['Ácido fólico', { estado: 'administrado', quem: 'Bea', horario: '08:16' }]
      ]
    },
    { hora: '12h', momento: 'agora', responsavel: 'Zé da Manga (Zé)', itens: [['Omeprazol'], ['Metformina'], ['AAS'], ['Vitamina B12']] },
    { hora: '14h', momento: 'depois', responsavel: 'Paulo da Silva (Paul)', itens: [['Carbamazepina'], ['Colírio']] },
    { hora: '18h', momento: 'depois', responsavel: 'Paulo da Silva (Paul)', itens: [['Losartana'], ['Bombinha']] },
    { hora: '20h', momento: 'depois', responsavel: 'Zé da Manga (Zé)', itens: [['Metformina']] },
    { hora: '22h', momento: 'depois', responsavel: 'Zé da Manga (Zé)', itens: [['Sinvastatina'], ['Carbamazepina'], ['Pomada']] }
  ];

  const ESTOQUE_INICIAL = { Metformina: 4, Fraldas: 23 };

  const chaveDose = (hora, nome) => `${hora}|${nome}`;

  const normalizarHoraPorta = hora => {
    const num = parseInt(String(hora || ''), 10);
    return Number.isFinite(num) ? `${num}h` : '';
  };

  const obterGruposPortaRemedios = (estado = estadoAtual) => {
    const editados = estado.itensEditados || {};
    const registros = estado.registrosDose || {};
    const grupos = PORTA_REMEDIOS.map(g => ({
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
        grupo = { hora, momento: horaNum < 12 ? 'passado' : horaNum === 12 ? 'agora' : 'depois',
          responsavel: usuario.nomeComApelido, itens: [] };
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

  const registrarDose = (chave, registro) => atualizarEstado(estado => ({
    ...estado,
    registrosDose: { ...(estado.registrosDose || {}), [chave]: registro }
  }));

  const desfazerDose = chave => atualizarEstado(estado => {
    const registros = { ...(estado.registrosDose || {}) };
    delete registros[chave];
    return { ...estado, registrosDose: registros };
  });

  const contarUnidadesUsadas = (id, estado) => Object.entries(estado.registrosDose || {})
    .filter(([chave, registro]) => chave.split('|')[1] === id && registro.estado === 'administrado').length;

  const obterEstoque = (id, estado = estadoAtual) => {
    const nomeAnterior = estado.itensEditados?.[id]?.nome
      || estado.itensExtras?.find(item => item.chave === id)?.nome;
    const base = estado.estoqueBase?.[id] ?? estado.estoqueBase?.[nomeAnterior] ?? ESTOQUE_INICIAL[id];
    return base === undefined ? null : Math.max(0, base - contarUnidadesUsadas(id, estado));
  };

  const definirSaldoEstoque = (estado, id, quantidade) => ({
    ...estado.estoqueBase, [id]: quantidade + contarUnidadesUsadas(id, estado)
  });

  const reporEstoque = (id, quantidade, observacao = '') => {
    if (!Number.isInteger(quantidade) || quantidade < 1) return estadoAtual;
    return atualizarEstado(estado => {
      const anotacao = { quantidade, autor: obterUsuarioAtual(estado).nomeComApelido,
        dia: HOJE, observacao: observacao.trim() };
      return {
        ...estado,
        estoqueBase: definirSaldoEstoque(estado, id, (obterEstoque(id, estado) ?? 0) + quantidade),
        reposicoesEstoque: { ...estado.reposicoesEstoque,
          [id]: [anotacao, ...(estado.reposicoesEstoque?.[id] || [])] }
      };
    });
  };

  window.addEventListener('pageshow', evento => {
    if (!evento.persisted) return;
    if (JSON.stringify(carregarEstado()) !== JSON.stringify(estadoAtual)) location.reload();
  });

  window.MutiraoCuidado = {
    HOJE,
    EQUIPE_CUIDADO,
    LACUNAS_TURNO,
    obterEstado: () => estadoAtual,
    atualizarEstado,
    obterUsuarioAtual,
    nomePessoaAcompanhada,
    obterCompromissos,
    obterCompromissosFuturos,
    obterProximoCompromisso,
    obterParticipantesRede,
    resolverPessoaRede,
    normalizarBusca,
    vincularFiltro,
    escaparHtml,
    sanitizarHtmlEditor,
    inicializarEditoresRicos,
    gerarChaveData,
    formatarData,
    formatarDataCurta,
    capitalizarPrimeira,
    possuiLacuna,
    obterLacunasDia,
    obterRotuloLacuna,
    construirLinhaDoTempoDia,
    aplicarIntervaloZe,
    normalizarIntervalos,
    formatarIntervaloTurno,
    extrairHorasTurno,
    obterEscalaDia,
    renderizarCalendarioMensal,
    inicializarCompartilhamento,
    confirmarAcao,
    anunciarStatus,
    chaveDose,
    obterDoses,
    obterCompartimentos,
    registrarDose,
    desfazerDose,
    obterEstoque,
    definirSaldoEstoque,
    reporEstoque
  };
})();
