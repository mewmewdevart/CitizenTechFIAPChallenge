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
        foto: 'assets/media/foto-perfil-maria.png',
        mascote: 'assets/media/mascotes/icone-mascote-minhoca.svg'
      },
      events: [
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
          icone: 'icone-medicamento.svg',
          concluida: false,
          href: 'medicamentos.html',
          rotuloAcao: 'Registrar administração'
        },
        {
          id: 'tarefa-metformina-20',
          dia: HOJE,
          titulo: '20h · Metformina',
          descricao: 'Prevista para 20h',
          icone: 'icone-medicamento.svg',
          concluida: false,
          href: 'medicamentos.html',
          rotuloAcao: 'Registrar administração'
        }
      ],
      reports: {
        [HOJE]: [
          [
            'Beatriz da Silva (Bea)',
            'Cuidadora · Turno 07h–12h',
            'Tarefa relacionada · Retirar medicamento na UBS · Ocorrência · Metformina das 08h não administrada',
            'Confirmei a consulta das 14h. A metformina das 08h não foi administrada e o motivo não foi informado. Caso não apareça ninguém para assumir o turno seguinte, posso estender meu turno até 13h.',
            'Ana leva a pasta e retira o medicamento na UBS. A volta está combinada com Paulo.\nA agendar consulta com otorrinolaringologista. Antes de agendar, confirme se o convênio cobre a consulta.'
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
          vinculo: 'Consulta na UBS de 10 nov.',
          observacoes: 'Receita para retirada de medicamento após a consulta das 14h na UBS do bairro.'
        },
        {
          id: 'doc-hemograma',
          titulo: 'Hemograma',
          categoria: 'Exame',
          dia: '2026-11-04',
          autor: 'Paulo da Silva (Paul)',
          vinculo: 'Exame cadastrado em 4 nov.',
          observacoes: 'Resultado completo do hemograma realizado em 4 de novembro de 2026.'
        },
        {
          id: 'doc-ficha-atendimento',
          titulo: 'Ficha de atendimento',
          categoria: 'Documento',
          dia: '2026-11-06',
          autor: 'Beatriz da Silva (Bea)',
          vinculo: 'Documento geral',
          observacoes: 'Registro de atendimento ambulatorial e orientações da equipe.'
        }
      ]
    };
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
    return estadoAtual;
  }

  const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caractere]);

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
            pessoa: EQUIPE_CUIDADO[3],
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
            pessoa: item.pessoa,
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
            pessoa: item.pessoa,
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
        && ultimo.pessoa?.nome === 'Zé da Manga'
        && seg.pessoa?.nome === 'Zé da Manga'
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

  let timerStatus = null;
  function anunciarStatus(elementoStatus, mensagem) {
    if (!elementoStatus) return;
    clearTimeout(timerStatus);
    elementoStatus.textContent = '';
    requestAnimationFrame(() => {
      elementoStatus.textContent = mensagem;
    });
    timerStatus = setTimeout(() => {
      elementoStatus.textContent = '';
    }, 5000);
  }

  window.MutiraoCuidado = {
    HOJE,
    EQUIPE_CUIDADO,
    LACUNAS_TURNO,
    obterEstado: () => estadoAtual,
    atualizarEstado,
    escaparHtml,
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
    anunciarStatus
  };
})();
