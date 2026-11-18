window.MutiraoCuidadoPronto.then(core => {
  if (!core) return;
  const pagina = document.querySelector('[data-pagina-mvp="agenda"]');
  if (!pagina) return;

  const {
    HOJE,
    obterEstado,
    atualizarEstado,
    obterUsuarioAtual,
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
    formatarIntervaloTurno,
    extrairHorasTurno,
    popularOpcoesHorario,
    renderizarCalendarioMensal,
    inicializarCompartilhamento,
    anunciarStatus
  } = core;

  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const registrarStatus = mensagem => anunciarStatus(elementoStatus, mensagem);

  const parametros = new URLSearchParams(location.search);
  const diaParam = parametros.get('dia');
  const compromissoParam = parametros.get('compromisso');
  const eventoInicial = compromissoParam ? core.obterCompromissos().find(item => item.id === compromissoParam) : null;
  const diaInicial = diaParam && /^\d{4}-\d{2}-\d{2}$/.test(diaParam)
    ? diaParam
    : (eventoInicial?.dia && /^\d{4}-\d{2}-\d{2}$/.test(eventoInicial.dia) ? eventoInicial.dia : HOJE);

  let diaSelecionado = diaInicial;
  let diaSemana = diaInicial;
  let anoAtual = Number(diaInicial.slice(0, 4));
  let mesAtual = Number(diaInicial.slice(5, 7)) - 1;
  let diaTurno = diaInicial;
  let horarioTurno = '';
  let horarioPedido = '';
  let criarRotinaComPedido = false;
  let limiteMinTurno = 0;
  let limiteMaxTurno = 24;
  let eventoEmFocoId = null;

  const obterTodosEventos = () => core.obterCompromissos();

  const obterTarefas = (dia, estado = obterEstado()) => {
    const tarefas = estado.tasks.filter(tarefa => tarefa.dia === dia);
    if (dia !== HOJE) return tarefas.filter(tarefa => !tarefa.medicacao);

    const modelos = tarefas.filter(tarefa => tarefa.medicacao);
    const tarefasDeDose = core.obterCompartimentos(estado).flatMap(grupo => {
      const modeloGrupo = modelos.find(({ medicacao }) => medicacao.hora === grupo.hora && !medicacao.itemId);
      const turno = grupo.responsavel ? ` · Turno de ${grupo.responsavel}` : '';
      const hora = grupo.hora.padStart(3, '0');
      const dados = grupo.itens.filter(dose => dose.estado === 'administrado');
      const pendentes = grupo.itens.filter(dose => dose.estado !== 'administrado');
      const resultado = [];

      if (pendentes.length) {
        const naoDados = pendentes.filter(dose => dose.estado === 'nao-administrado');
        const nomes = pendentes.map(dose => dose.nome).join(', ');
        const detalhe = pendentes.length === 1
          ? (naoDados.length ? ['Não foi dado', naoDados[0].motivo].filter(Boolean).join(' · ') : `Às ${hora}`)
          : [nomes, naoDados.length ? `${naoDados.length} sem registro` : ''].filter(Boolean).join(' · ');
        resultado.push({
          id: `med-pendente-${grupo.hora}`,
          dia,
          icone: 'icone-medicamento.svg',
          titulo: pendentes.length === 1 ? `${hora} · ${pendentes[0].nome}` : `${hora} · Remédios das ${hora}`,
          descricao: detalhe + turno,
          concluida: false,
          href: `medicamentos.html?dose=${encodeURIComponent(pendentes[0].chave)}`,
          rotuloAcao: 'Marcar como dado'
        });
      }

      if (dados.length) {
        const responsaveis = [...new Set(dados.map(dose => dose.quem).filter(Boolean))];
        const horarios = [...new Set(dados.map(dose => dose.horario).filter(Boolean))].sort();
        const nomes = dados.map(dose => dose.nome).join(', ');
        const resumoDoses = [
          `${dados.length} ${dados.length === 1 ? 'dose dada' : 'doses dadas'}`,
          responsaveis.length ? `por ${responsaveis.join(', ')}` : '',
          horarios.length ? `(${horarios.join(', ')})` : ''
        ].filter(Boolean).join(' ');
        const usarModeloGrupo = modeloGrupo && !pendentes.length;
        resultado.push({
          ...(usarModeloGrupo ? modeloGrupo : {}),
          id: (usarModeloGrupo && modeloGrupo.id) || `med-dados-${grupo.hora}`,
          dia,
          icone: (usarModeloGrupo && modeloGrupo.icone) || 'icone-medicamento.svg',
          titulo: (usarModeloGrupo && modeloGrupo.titulo) || `${hora} · Remédios dados`,
          descricao: `${nomes} · ${resumoDoses}${turno}`,
          concluida: true,
          href: 'medicamentos.html#registros-de-hoje',
          rotuloAcao: 'Ver anotações'
        });
      }

      return resultado;
    });
    return [...tarefas.filter(tarefa => !tarefa.medicacao), ...tarefasDeDose];
  };

  const obterEventosDia = dia => obterTodosEventos().filter(item => item.dia === dia);

  const obterSemanaDe = chave => {
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

  const avatarMascote = pessoa => {
    const src = typeof pessoa === 'string'
      ? `assets/media/mascotes/${escaparHtml(pessoa)}`
      : (pessoa?.foto || `assets/media/mascotes/${escaparHtml(pessoa?.avatar || 'icone-mascote-cubado.svg')}`);
    return `<img class="agenda__avatar" alt="" src="${escaparHtml(src)}" width="40" height="40">`;
  };

  const ROTULO_COBERTURA = { Coberto: 'Com alguém', Parcial: 'Falta alguém', Descoberto: 'Sem ninguém', 'Sem turnos': 'Sem turnos' };
  const ICONE_SEM_TURNOS = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>';
  const criarEtiquetaCobertura = dia => {
    const estado = obterEstado();
    const rotulo = obterRotuloLacuna(dia, estado);
    if (rotulo === 'Sem turnos') {
      return `<span class="agenda__etiqueta agenda__etiqueta--neutro">${ICONE_SEM_TURNOS}Sem turnos</span>`;
    }
    const lacuna = rotulo !== 'Coberto';
    const parcial = rotulo === 'Parcial';
    const modificador = lacuna ? (parcial ? 'agenda__etiqueta--atencao' : 'agenda__etiqueta--alerta') : 'agenda__etiqueta--sucesso';
    const icone = lacuna ? (parcial ? 'icone-atencao.svg' : 'icone-sem-cobertura.svg') : 'icone-coberto.svg';
    return `<span class="agenda__etiqueta ${modificador}"><img alt="" src="assets/media/icones/${icone}">${ROTULO_COBERTURA[rotulo] || rotulo}</span>`;
  };

  const containerMes = pagina.querySelector('[data-mes]');

  const ICONES_DIA = {
    'sem-ninguem': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/></svg>',
    parcial: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>',
    coberto: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    consulta: ''
  };
  const diaHoje = new Date(`${HOJE}T12:00:00`);
  const somarDias = dias => {
    const data = new Date(diaHoje);
    data.setDate(data.getDate() + dias);
    return data.toISOString().slice(0, 10);
  };
  const inicioSemana = somarDias(-diaHoje.getDay());
  const fimSemana = somarDias(6 - diaHoje.getDay());

  const renderizarMes = () => {
    const estado = obterEstado();
    renderizarCalendarioMensal(containerMes, {
      ano: anoAtual,
      mes: mesAtual,
      diaSelecionado,
      obterMetaDia: chave => {
        const temEvento = obterEventosDia(chave).length > 0;
        const rotuloDia = obterRotuloLacuna(chave, estado);
        const temLacuna = rotuloDia === 'Parcial' || rotuloDia === 'Descoberto';
        const parcial = rotuloDia === 'Parcial';
        const coberto = rotuloDia === 'Coberto' && chave >= inicioSemana && chave <= fimSemana;
        const situacao = temLacuna ? (parcial ? 'parcial' : 'sem-ninguem') : coberto ? 'coberto' : '';
        const textos = {
          'sem-ninguem': ', sem ninguém em algum horário',
          parcial: ', falta alguém em parte do dia',
          coberto: ', todos os horários com alguém'
        };
        return {
          classes: [situacao && `calendario-mensal__dia--${situacao}`, temEvento && 'calendario-mensal__dia--consulta'],
          indicadores: [
            situacao ? `<span class="calendario-mensal__simbolo">${ICONES_DIA[situacao]}</span>` : '',
            temEvento ? `<span class="calendario-mensal__selo-consulta">${ICONES_DIA.consulta}</span>` : ''
          ].filter(Boolean),
          sufixoRotulo: `${textos[situacao] || ''}${temEvento ? ', tem consulta ou exame' : ''}`
        };
      }
    });
  };

  const renderizarTarefasDiarias = () => {
    const containerTarefas = pagina.querySelector('[data-tarefas-diarias]');
    if (!containerTarefas) return;

    const tarefas = obterTarefas(diaSelecionado);
    containerTarefas.hidden = tarefas.length === 0;
    if (!tarefas.length) {
      containerTarefas.innerHTML = '';
      return;
    }

    const renderizarIconeTarefa = icone => {
      if (icone === 'icone-medicamento.svg') {
        return '<i class="bi bi-capsule" aria-hidden="true"></i>';
      }
      if (icone.startsWith('bi ') || icone.startsWith('fa-')) {
        return `<i class="${escaparHtml(icone)}" aria-hidden="true"></i>`;
      }
      return `<img src="assets/media/icones/${escaparHtml(icone)}" alt="" width="20" height="20">`;
    };

    const renderizarItemTarefa = tarefa => `
      <div class="agenda__tarefa ${tarefa.concluida ? 'agenda__tarefa--concluida' : ''}">
        <span class="agenda__tarefa-icone">${renderizarIconeTarefa(tarefa.icone)}</span>
        <div>
          <strong>${escaparHtml(tarefa.titulo)}</strong>
          <p>${escaparHtml(tarefa.descricao)}</p>
        </div>
        ${tarefa.dialogo ? `<button class="botao botao--secundario" type="button" data-dialogo="${escaparHtml(tarefa.dialogo)}">Ver tarefa</button>` : ''}
        ${tarefa.href ? `<a class="botao botao--secundario" href="${escaparHtml(tarefa.href)}">${escaparHtml(tarefa.rotuloAcao)}</a>` : ''}
      </div>
    `;

    const pendentes = tarefas.filter(tarefa => !tarefa.concluida);
    const concluidas = tarefas.filter(tarefa => tarefa.concluida);

    containerTarefas.innerHTML = [
      pendentes.map(renderizarItemTarefa).join(''),
      concluidas.length
        ? `<section class="agenda__tarefas-concluidas" aria-label="Tarefas feitas">
            <h4 class="agenda__tarefas-subtitulo">Tarefas feitas</h4>
            ${concluidas.map(renderizarItemTarefa).join('')}
          </section>`
        : ''
    ].filter(Boolean).join('');
  };

  const renderizarAgenda = () => {
    const estado = obterEstado();
    const itens = obterEventosDia(diaSelecionado);

    pagina.querySelector('[data-eventos]').innerHTML = itens.map(item => {
      const sugestao = core.obterSugestaoTurnoCompromisso(item, estado);
      return `
      <article class="agenda__evento">
        <div class="agenda__tarefa">
          ${avatarMascote(core.resolverPessoaRede(item.acompanhante || item.criadoPor))}
          <div>
            <strong>${escaparHtml([item.hora ? item.hora.replace(':00', 'h') : '', item.titulo].filter(Boolean).join(' · '))}</strong>
            <p>${escaparHtml([item.local, item.acompanhante].filter(Boolean).join(' · '))}</p>
            ${Array.isArray(item.preparacao) && item.preparacao.length ? `
              <div class="agenda__preparacao">
                <strong>Preparação e transporte</strong>
                ${item.preparacao.map(linha => `<p>${escaparHtml(linha)}</p>`).join('')}
              </div>
            ` : ''}
          </div>
          <button class="botao botao--secundario" type="button" data-ver-compromisso="${escaparHtml(item.id)}">Ver compromisso</button>
        </div>
        ${sugestao ? `
          <div class="agenda__aviso-compromisso">
            <p><i class="fa-regular fa-clock" aria-hidden="true"></i> Ninguém na escala às ${escaparHtml(item.hora.replace(':00', 'h'))}. Sugestão de turno: ${escaparHtml(sugestao.horario)}.</p>
            <button type="button" class="botao botao--secundario" data-dialogo-dinamico="dialogo-cobrir-horario" data-adicionar-turno data-dia="${escaparHtml(sugestao.dia)}" data-horario="${escaparHtml(sugestao.horario)}">Adicionar turno</button>
          </div>
        ` : ''}
      </article>
    `;
    }).join('') || '<p class="agenda__vazio">Nenhum compromisso nesta data.</p>';

    renderizarTarefasDiarias();

    const lacunasDia = obterLacunasDia(diaSelecionado, estado);
    const lacunaDia = lacunasDia.length > 0;
    const blocoLacuna = pagina.querySelector('[data-lacuna-dia]');
    blocoLacuna.hidden = !lacunaDia;
    if (lacunaDia) {
      pagina.querySelector('[data-titulo-lacuna]').textContent = lacunasDia.length === 1
        ? `${lacunasDia[0].horario} · Horário sem ninguém`
        : `${lacunasDia.map(l => l.horario).join(', ')} · Horários sem ninguém`;
    }

    const totalTarefasDia = obterTarefas(diaSelecionado).length;
    pagina.querySelector('[data-resumo-dia]').textContent =
      `${itens.length} ${itens.length === 1 ? 'compromisso' : 'compromissos'}` +
      (lacunaDia ? ` · ${lacunasDia.length} ${lacunasDia.length === 1 ? 'horário sem ninguém' : 'horários sem ninguém'}` : '') +
      (totalTarefasDia ? ` · ${totalTarefasDia} ${totalTarefasDia === 1 ? 'tarefa' : 'tarefas'}` : '') +
      ` · ${formatarDataCurta(diaSelecionado)}`;

    const semana = obterSemanaDe(diaSemana);
    const inicioSemana = formatarData(semana[0], { day: 'numeric', month: 'short' });
    const fimSemana = formatarData(semana[6], { day: 'numeric', month: 'short' });
    const tituloEscala = pagina.querySelector('[data-titulo-escala]');
    if (tituloEscala) {
      tituloEscala.textContent = `Quem cuida na semana · ${inicioSemana} a ${fimSemana}`;
    }
    const subtituloEscala = pagina.querySelector('[data-subtitulo-escala]');
    if (subtituloEscala) {
      subtituloEscala.textContent = `Quem cuida na semana · turnos de ${formatarDataCurta(diaSemana, true)}`;
    }

    pagina.querySelector('[data-semana]').innerHTML = semana.map(dia => `
      <button type="button" data-dia-semana="${dia}" aria-pressed="${diaSemana === dia}">
        <span>${capitalizarPrimeira(formatarData(dia, { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(',', ''))}</span>
        ${criarEtiquetaCobertura(dia)}
      </button>
    `).join('');

    const renderizarPedido = ([chave, pedido]) => `
      <div class="painel__acoes">
        <p>${escaparHtml(pedido.horario)} · Pedido para ${escaparHtml(pedido.responsavel)} · Aguardando aceite</p>
        <button type="button" class="botao botao--secundario" data-decidir-atribuicao="aceitar" data-chave="${escaparHtml(chave)}">Simular aceite</button>
        <button type="button" class="botao botao--secundario" data-decidir-atribuicao="recusar" data-chave="${escaparHtml(chave)}">Simular recusa</button>
        <button type="button" class="botao botao--secundario" data-decidir-atribuicao="cancelar" data-chave="${escaparHtml(chave)}">Cancelar pedido</button>
      </div>`;

    const linhaDescoberto = (horario, dia) => {
      const faixa = extrairHorasTurno(horario);
      const pedidos = Object.entries(estado.atribuicoesTurno || {}).filter(([, pedido]) => {
        if (pedido.dia !== dia) return false;
        const intervalo = extrairHorasTurno(pedido.horario);
        return faixa.inicio <= intervalo.inicio && intervalo.fim <= faixa.fim;
      });
      return `<div class="agenda__lacuna">
      <span class="agenda__icone-descoberto" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>
      <div>
        <strong>${escaparHtml(horario)} · Horário sem ninguém</strong>
        <p>Ainda não há uma pessoa escalada para esse horário.</p>
        ${pedidos.map(renderizarPedido).join('')}
      </div>
      <button type="button" class="botao botao--secundario" data-dialogo-dinamico="dialogo-cobrir-horario" data-dia="${dia}" data-horario="${escaparHtml(horario)}">Ficar nesse horário</button>
    </div>`;
    };

    const renderizarTurno = (seg, dia) => {
      const ehUsuario = Boolean(seg.pessoa.ehUsuarioAtual);
      return `<div class="agenda__turno">
        ${avatarMascote(seg.pessoa)}
        <div>
          <strong>${escaparHtml(seg.horario)}</strong>
          <p>${escaparHtml(seg.pessoa.nome)} · ${ehUsuario ? 'Você vai ficar nesse horário' : 'Vai ficar'}</p>
        </div>
        ${ehUsuario && dia >= HOJE ? `
          <div class="agenda__turno-acoes">
            <button type="button" class="botao botao--secundario" data-editar-cobertura data-dia="${dia}" data-horario="${escaparHtml(seg.horario)}" data-min="${seg.janelaMin}" data-max="${seg.janelaMax}" data-atual-inicio="${seg.inicio}" data-atual-fim="${seg.fim}">Editar</button>
          </div>
        ` : ''}
      </div>`;
    };

    const linhaDoDia = construirLinhaDoTempoDia(diaSemana, estado);
    const pedidos = core.obterPedidosForaDaRotina(diaSemana, estado);
    const acoes = pedidos.map(renderizarPedido).join('');
    pagina.querySelector('[data-turnos]').innerHTML = linhaDoDia.map(seg => seg.tipo === 'lacuna'
      ? linhaDescoberto(seg.horario, diaSemana)
      : renderizarTurno(seg, diaSemana)
    ).join('') + acoes + core.renderizarAdicionarTurnos(diaSemana, estado, linhaDoDia);

    const diasComLacuna = [...new Set([...semana, ...Object.keys(estado.lacunasTurno || {})])]
      .sort()
      .filter(dia => possuiLacuna(dia, estado));

    pagina.querySelector('[data-lacunas]').innerHTML = diasComLacuna
      .map(dia => {
        const lacunas = obterLacunasDia(dia, estado);
        const resumoHorarios = lacunas.map(l => l.horario).join(', ');
        return `
        <button class="agenda__link-lacuna" type="button" data-dia-semana="${dia}">
          <span>${formatarDataCurta(dia)}<small>${resumoHorarios === '00h–24h' ? 'Dia inteiro · 00h–24h' : resumoHorarios}</small></span>
          ${criarEtiquetaCobertura(dia)}
        </button>
      `;
      }).join('') || '<p>Nenhum horário previsto está sem cobertura.</p>';
  };

  const renderizar = () => {
    renderizarMes();
    renderizarAgenda();
  };

  const snapshotsEdicao = new WeakMap();

  const serializarFormularioAgenda = formulario => JSON.stringify(
    [...new FormData(formulario).entries()].map(([k, v]) => [k, String(v)])
  );

  const atualizarBotaoSalvarAgenda = formulario => {
    const botaoSalvar = formulario?.querySelector('button[type="submit"]');
    if (!botaoSalvar) return;
    const snapshot = snapshotsEdicao.get(formulario);
    const semAlteracoes = typeof snapshot === 'string' && serializarFormularioAgenda(formulario) === snapshot;
    botaoSalvar.disabled = semAlteracoes;
    botaoSalvar.setAttribute('aria-disabled', String(semAlteracoes));
  };

  pagina.querySelectorAll('[data-formulario-mvp="evento"], [data-formulario-mvp="editar-cobertura"]').forEach(form => {
    ['input', 'change'].forEach(tipoEvento => {
      form.addEventListener(tipoEvento, () => atualizarBotaoSalvarAgenda(form));
    });
  });

  const popularSelectAcompanhante = (select, valorSelecionado = '') => {
    if (!select) return;
    const usuario = core.obterUsuarioAtual();
    const opcoes = core.obterParticipantesRede().map(pessoa => pessoa.nome);
    const valorResolvido = valorSelecionado
      ? core.resolverPessoaRede(valorSelecionado).nome
      : usuario.nomeComApelido;
    if (valorResolvido && !opcoes.includes(valorResolvido)) {
      opcoes.push(valorResolvido);
    }
    select.innerHTML = opcoes
      .map(nome => `<option value="${escaparHtml(nome)}">${escaparHtml(nome)}</option>`)
      .join('');
    select.value = valorResolvido || opcoes[0] || '';
  };

  const abrirFormularioEvento = (eventoExistente = null) => {
    const dialogo = document.getElementById('dialogo-novo-compromisso');
    const formulario = dialogo?.querySelector('[data-formulario-mvp="evento"]');
    const tituloDialogo = dialogo?.querySelector('[data-titulo-dialogo-evento]');
    if (!dialogo || !formulario) return;

    formulario.reset();
    formulario.elements.id.value = eventoExistente?.id || '';
    formulario.elements.titulo.value = eventoExistente?.titulo || '';
    formulario.elements.dia.value = eventoExistente?.dia || diaSelecionado;
    formulario.elements.hora.value = eventoExistente?.hora || '';
    formulario.elements.local.value = eventoExistente?.local || '';
    popularSelectAcompanhante(formulario.elements.acompanhante, eventoExistente?.acompanhante || '');
    if (tituloDialogo) {
      tituloDialogo.textContent = eventoExistente ? 'Editar compromisso' : 'Novo compromisso';
    }
    if (eventoExistente) {
      snapshotsEdicao.set(formulario, serializarFormularioAgenda(formulario));
    } else {
      snapshotsEdicao.delete(formulario);
    }
    atualizarBotaoSalvarAgenda(formulario);
    dialogo.showModal();
  };

  const abrirDetalhesEvento = eventoId => {
    const item = obterTodosEventos().find(e => e.id === eventoId);
    const dialogo = document.getElementById('dialogo-detalhes-compromisso');
    const lista = dialogo?.querySelector('[data-detalhes-compromisso]');
    if (!item || !dialogo || !lista) return;

    eventoEmFocoId = item.id;
    const tituloEl = dialogo.querySelector('#titulo-detalhes-compromisso');
    const pessoaEl = dialogo.querySelector('[data-detalhes-compromisso-pessoa]');
    if (tituloEl) tituloEl.textContent = formatarDataCurta(item.dia, true);
    if (pessoaEl) pessoaEl.textContent = core.nomePessoaAcompanhada();
    const horaTexto = item.hora ? item.hora.replace(':', 'h').replace(/h00$/, 'h') : '';
    const linhas = [
      `${horaTexto ? `${horaTexto} · ` : ''}${item.titulo}`,
      item.local || 'Local não informado',
      `Acompanhante: ${item.acompanhante || 'Não definido'}`,
      ...(Array.isArray(item.preparacao) ? item.preparacao : [])
    ].filter(Boolean);
    lista.innerHTML = linhas.map(linha => `<span>${escaparHtml(linha)}</span>`).join('');
    const botaoDocumentos = dialogo.querySelector('[data-ver-documentos-compromisso]');
    if (botaoDocumentos) {
      const tituloLower = String(item.titulo || '').toLowerCase();
      const docsVinculados = (obterEstado().documents || []).filter(doc =>
        doc.compromissoId === item.id
      );
      botaoDocumentos.hidden = !docsVinculados.length;
      if (docsVinculados.length === 1) {
        botaoDocumentos.href = `documentos.html?documento=${encodeURIComponent(docsVinculados[0].id)}`;
      } else if (docsVinculados.length > 1) {
        botaoDocumentos.href = `documentos.html?compromisso=${encodeURIComponent(item.id)}`;
      }
    }
    dialogo.showModal();
    if (tituloEl) {
      tituloEl.setAttribute('tabindex', '-1');
      tituloEl.focus({ preventScroll: true });
    }
  };

  document.querySelector('[data-dialogo="dialogo-novo-compromisso"]')?.addEventListener('click', evento => {
    evento.stopPropagation();
    abrirFormularioEvento(null);
  });

  const dialogoEditarCobertura = document.getElementById('dialogo-editar-cobertura');
  const atualizarPreviaCobertura = (ajustarSaida = false) => {
    const form = dialogoEditarCobertura?.querySelector('[data-formulario-mvp="editar-cobertura"]');
    const previa = dialogoEditarCobertura?.querySelector('[data-previa-cobertura]');
    if (!form || !previa) return;
    const inicio = Number(form.elements.inicio.value);
    let fim = Number(form.elements.fim.value);
    if (ajustarSaida || fim <= inicio) {
      const selecionado = fim > inicio && fim <= limiteMaxTurno ? fim : Math.min(limiteMaxTurno, inicio + 1);
      popularOpcoesHorario(form.elements.fim, inicio + 1, limiteMaxTurno, selecionado);
      fim = Number(form.elements.fim.value);
    }
    const duracao = fim - inicio;
    previa.textContent = `Você vai ficar das ${String(inicio).padStart(2, '0')}h às ${String(fim).padStart(2, '0')}h (${duracao} ${duracao === 1 ? 'hora' : 'horas'} no total)`;
  };

  dialogoEditarCobertura?.addEventListener('change', evento => {
    atualizarPreviaCobertura(evento.target.name === 'inicio');
  });

  const dialogoCobrirHorario = document.getElementById('dialogo-cobrir-horario');
  dialogoCobrirHorario?.addEventListener('change', () => {
    core.atualizarPreviaTurno(dialogoCobrirHorario, horarioTurno);
  });

  pagina.addEventListener('click', async evento => {
    if (evento.target.closest('[data-ver-turno]')) {
      diaSemana = diaSelecionado;
      renderizarAgenda();
      requestAnimationFrame(() => {
        pagina.querySelector('[data-titulo-escala]')?.focus();
      });
      return;
    }

    const botao = evento.target.closest('button');
    if (!botao) return;

    if (botao.hasAttribute('data-fechar-dialogo')) {
      botao.closest('dialog')?.close();
      return;
    }

    if (botao.dataset.dialogo === 'dialogo-tarefa-ubs') {
      const dialogoTarefa = document.getElementById(botao.dataset.dialogo);
      if (dialogoTarefa && !dialogoTarefa.open) dialogoTarefa.showModal();
      return;
    }

    if (botao.dataset.verCompromisso) {
      abrirDetalhesEvento(botao.dataset.verCompromisso);
      return;
    }

    if (botao.hasAttribute('data-editar-compromisso')) {
      const item = obterTodosEventos().find(e => e.id === eventoEmFocoId);
      botao.closest('dialog')?.close();
      if (item) abrirFormularioEvento(item);
      return;
    }

    if (botao.hasAttribute('data-excluir-compromisso')) {
      const item = obterTodosEventos().find(e => e.id === eventoEmFocoId);
      if (!item) return;
      const confirmado = await core.confirmarAcao({
        titulo: 'Excluir compromisso',
        descricao: `Deseja excluir o compromisso “${item.titulo}” da Agenda?`,
        confirmarTexto: 'Excluir compromisso'
      });
      if (!confirmado) return;
      atualizarEstado(estado => ({
        ...estado,
        events: estado.events.filter(e => e.id !== item.id)
      }));
      botao.closest('dialog')?.close();
      registrarStatus(`Compromisso "${item.titulo}" removido da Agenda.`);
      renderizar();
      pagina.querySelector(`[data-selecionar-dia="${diaSelecionado}"]`)?.focus();
      return;
    }

    if (botao.hasAttribute('data-editar-cobertura')) {
      diaTurno = botao.dataset.dia;
      horarioTurno = botao.dataset.horario || '';
      const slot = extrairHorasTurno(horarioTurno);
      limiteMinTurno = Number(botao.dataset.min ?? slot.inicio);
      limiteMaxTurno = Number(botao.dataset.max ?? slot.fim);
      const atualInicio = Number(botao.dataset.atualInicio ?? slot.inicio);
      const atualFim = Number(botao.dataset.atualFim ?? slot.fim);

      if (dialogoEditarCobertura) {
        dialogoEditarCobertura.querySelector('[data-contexto-turno]').textContent =
          `${formatarDataCurta(diaTurno)} · Horário que dá para mudar: ${String(limiteMinTurno).padStart(2, '0')}h às ${String(limiteMaxTurno).padStart(2, '0')}h`;
        const form = dialogoEditarCobertura.querySelector('[data-formulario-mvp="editar-cobertura"]');
        popularOpcoesHorario(form.elements.inicio, limiteMinTurno, limiteMaxTurno - 1, atualInicio);
        popularOpcoesHorario(form.elements.fim, atualInicio + 1, limiteMaxTurno, atualFim);
        atualizarPreviaCobertura();
        snapshotsEdicao.set(form, serializarFormularioAgenda(form));
        atualizarBotaoSalvarAgenda(form);
        dialogoEditarCobertura.showModal();
      }
      return;
    }

    if (botao.hasAttribute('data-cancelar-cobertura')) {
      const confirmado = await core.confirmarAcao({
        titulo: 'Não vou mais poder ficar',
        descricao: 'Sair desse horário e deixar ele livre para outra pessoa da família?',
        confirmarTexto: 'Não vou mais poder ficar'
      });
      if (!confirmado) return;
      atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, limiteMinTurno, limiteMaxTurno, 0, 0));
      botao.closest('dialog')?.close();
      registrarStatus('Pronto, você saiu desse horário. Ele ficou livre para outra pessoa da família.');
      renderizar();
      return;
    }

    if (botao.dataset.passoMes) {
      const proximo = new Date(anoAtual, mesAtual + Number(botao.dataset.passoMes), 1);
      anoAtual = proximo.getFullYear();
      mesAtual = proximo.getMonth();
      diaSelecionado = gerarChaveData(anoAtual, mesAtual, 1);
      diaSemana = diaSelecionado;
      renderizar();
      return;
    }

    if (botao.dataset.selecionarDia) {
      diaSelecionado = botao.dataset.selecionarDia;
      diaSemana = diaSelecionado;
      renderizar();
      pagina.querySelector(`[data-selecionar-dia="${diaSelecionado}"]`)?.focus();
      return;
    }

    if (botao.dataset.diaSemana) {
      diaSemana = botao.dataset.diaSemana;
      diaSelecionado = diaSemana;
      anoAtual = Number(diaSelecionado.slice(0, 4));
      mesAtual = Number(diaSelecionado.slice(5, 7)) - 1;
      renderizar();
      pagina.querySelector(`[data-dia-semana="${diaSemana}"]`)?.focus();
      return;
    }

    if (botao.hasAttribute('data-concluir-tarefa-ubs')) {
      const tarefaAtual = obterEstado().tasks.find(t => t.id === 'tarefa-ubs-retirada');
      if (!tarefaAtual) return;
      const novaConclusao = !tarefaAtual.concluida;
      atualizarEstado(estado => ({
        ...estado,
        tasks: (estado.tasks || []).map(t => (t.id === 'tarefa-ubs-retirada'
          ? {
            ...t,
            concluida: novaConclusao,
            descricao: novaConclusao
              ? t.descricaoConcluida || t.descricao
              : t.descricaoPendente || t.descricao
          }
          : t))
      }));
      botao.closest('dialog')?.close();
      registrarStatus(novaConclusao
        ? 'Retirada de medicamento na UBS marcada como concluída.'
        : 'Pegar remédio no posto voltou para a lista do que falta fazer.');
      renderizar();
      return;
    }

    if (botao.dataset.dialogo === 'dialogo-tarefa-ubs') {
      const tarefaAtual = obterEstado().tasks.find(t => t.id === 'tarefa-ubs-retirada');
      const dialogo = document.getElementById('dialogo-tarefa-ubs');
      const concluir = dialogo.querySelector('[data-concluir-tarefa-ubs]');
      concluir.disabled = !tarefaAtual;
      concluir.textContent = tarefaAtual?.concluida ? 'Desfazer retirada' : 'Marcar como retirada';
      dialogo.querySelector('h2').textContent = tarefaAtual?.titulo || 'Tarefa indisponível';
      dialogo.querySelector('[data-tarefa-ubs-contexto]').textContent = tarefaAtual?.contexto ||
        tarefaAtual?.descricao || 'A tarefa não está cadastrada nesta ficha.';
      const link = dialogo.querySelector('[data-documento-tarefa-ubs]');
      const doc = obterEstado().documents.find(doc => doc.id === tarefaAtual?.documentoId);
      link.hidden = !doc;
      if (doc) link.href = 'documentos.html?documento=' + encodeURIComponent(doc.id);
    }

    if (botao.hasAttribute('data-abrir-atribuir-turno')) {
      const form = dialogoCobrirHorario.querySelector('[data-formulario-mvp="cobertura"]');
      const intervalo = core.obterIntervaloFormularioTurno(form, horarioTurno);
      horarioPedido = formatarIntervaloTurno(intervalo.inicio, intervalo.duracao);
      criarRotinaComPedido = form.elements.escopoTurno.disabled ? core.ESCOPO_TURNO.pontual : form.elements.escopoTurno.value;
      dialogoCobrirHorario.close();
      const dialogoAtribuir = document.getElementById('dialogo-atribuir-turno');
      if (dialogoAtribuir) {
        const ctx = dialogoAtribuir.querySelector('[data-atribuir-contexto]');
        if (ctx) ctx.textContent = `${core.nomePessoaAcompanhada()} · ${formatarDataCurta(diaTurno)} · ${horarioPedido}`;
        dialogoAtribuir.showModal();
      }
      return;
    }

    if (botao.hasAttribute('data-voltar-cobrir')) {
      botao.closest('dialog')?.close();
      dialogoCobrirHorario?.showModal();
      return;
    }

    if (botao.dataset.dialogoDinamico) {
      diaTurno = botao.dataset.dia;
      horarioTurno = botao.dataset.horario || '';
      const dialogo = document.getElementById(botao.dataset.dialogoDinamico);
      if (dialogo) {
        core.prepararFormularioTurno(dialogo, diaTurno, horarioTurno, botao.hasAttribute('data-adicionar-turno'));
        dialogo.showModal();
      }
      return;
    }

    if (botao.hasAttribute('data-agenda-exportar')) {
      const prefixoMes = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
      const eventosMes = obterTodosEventos().filter(item => item.dia.startsWith(prefixoMes));
      if (!eventosMes.length) {
        registrarStatus('Não tem nada marcado neste mês para baixar.');
        return;
      }

      const escaparIcs = valor => String(valor || '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
      const carimbo = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const calcularFim = (dia, hora) => {
        const [hh, mm] = hora.split(':').map(Number);
        const [ano, mes, data] = dia.split('-').map(Number);
        const fim = new Date(Date.UTC(ano, mes - 1, data, hh + 1, mm));
        return fim.toISOString().slice(0, 19).replace(/[-:]/g, '');
      };
      const calcularProximoDia = dia => {
        const [ano, mes, data] = dia.split('-').map(Number);
        return new Date(Date.UTC(ano, mes - 1, data + 1)).toISOString().slice(0, 10).replaceAll('-', '');
      };

      const linhas = eventosMes.flatMap((item, indice) => {
        const temHora = /^\d{2}:\d{2}$/.test(String(item.hora || '').trim());
        const dataLimpa = item.dia.replaceAll('-', '');
        return [
          'BEGIN:VEVENT',
          `UID:${item.id || `mutirao-${item.dia}-${indice}`}@mutirao.local`,
          `DTSTAMP:${carimbo}`,
          temHora ? `DTSTART;TZID=America/Sao_Paulo:${dataLimpa}T${item.hora.replace(':', '')}00` : `DTSTART;VALUE=DATE:${dataLimpa}`,
          temHora ? `DTEND;TZID=America/Sao_Paulo:${calcularFim(item.dia, item.hora)}` : `DTEND;VALUE=DATE:${calcularProximoDia(item.dia)}`,
          `SUMMARY:${escaparIcs(item.titulo)}`,
          `LOCATION:${escaparIcs(item.local)}`,
          `DESCRIPTION:${escaparIcs(item.acompanhante ? `Acompanhante: ${item.acompanhante}` : '')}`,
          'END:VEVENT'
        ];
      });
      const calendario = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mutirao//Agenda//PT-BR',
        'BEGIN:VTIMEZONE', 'TZID=America/Sao_Paulo', 'BEGIN:STANDARD', 'DTSTART:20190217T000000',
        'TZOFFSETFROM:-0200', 'TZOFFSETTO:-0300', 'TZNAME:BRT', 'END:STANDARD', 'END:VTIMEZONE',
        ...linhas, 'END:VCALENDAR', ''
      ].join('\r\n');

      const url = URL.createObjectURL(new Blob([calendario], { type: 'text/calendar;charset=utf-8' }));
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: `agenda-mutirao-${prefixoMes}.ics`
      });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      botao.closest('dialog')?.close();
      registrarStatus(`Calendário (${eventosMes.length} ${eventosMes.length === 1 ? 'compromisso' : 'compromissos'}) exportado.`);
    }
  });

  pagina.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-decidir-atribuicao]');
    if (!botao) return;
    try {
      core.resolverAtribuicao(botao.dataset.chave, botao.dataset.decidirAtribuicao === 'aceitar');
      renderizar();
      registrarStatus('Pronto. A escala foi atualizada.');
      pagina.querySelector(`[data-dia-semana="${diaSemana}"]`)?.focus();
    } catch (erro) { registrarStatus(erro.message); }
  });

  pagina.addEventListener('submit', async evento => {
    const formulario = evento.target;
    const tipoFormulario = formulario.dataset.formularioMvp;
    if (!tipoFormulario) return;

    evento.preventDefault();
    const snapshot = snapshotsEdicao.get(formulario);
    if (typeof snapshot === 'string' && serializarFormularioAgenda(formulario) === snapshot) {
      return;
    }
    const campos = Object.fromEntries(new FormData(formulario));
    let mensagem = '';

    if (tipoFormulario === 'evento') {
      const titulo = (campos.titulo || '').trim();
      const local = (campos.local || '').trim();
      const hora = (campos.hora || '').trim();
      const acompanhante = (campos.acompanhante || '').trim();
      if (!titulo || !local || !campos.dia) {
        registrarStatus('Preencha os campos que faltam.');
        return;
      }

      const idEdicao = campos.id;
      atualizarEstado(estado => {
        if (idEdicao) {
          return {
            ...estado,
            events: estado.events.map(e => (e.id === idEdicao
              ? { ...e, titulo, dia: campos.dia, hora, local, acompanhante }
              : e))
          };
        }
        return {
          ...estado,
          events: [
            ...estado.events,
            {
              id: `evt-${Date.now()}`,
              titulo,
              dia: campos.dia,
              hora,
              local,
              acompanhante,
              criadoPor: core.obterUsuarioAtual().nomeComApelido
            }
          ]
        };
      });

      diaSelecionado = campos.dia;
      diaSemana = campos.dia;
      anoAtual = Number(diaSelecionado.slice(0, 4));
      mesAtual = Number(diaSelecionado.slice(5, 7)) - 1;
      mensagem = idEdicao ? 'Compromisso alterado na Agenda.' : 'Compromisso salvo na Agenda.';
    }

    if (tipoFormulario === 'cobertura') {
      const { inicio: gapInicio, fim: gapFim } = extrairHorasTurno(horarioTurno);
      const { inicio, fim } = core.obterIntervaloFormularioTurno(formulario, horarioTurno);
      const escopoTurno = formulario.elements.escopoTurno.disabled ? core.ESCOPO_TURNO.pontual : formulario.elements.escopoTurno.value;

      if (core.obterPreferencias().assumirTurnoDireto === false && !await core.confirmarAcao({
        titulo: 'Assumir este horário?', descricao: `${diaTurno} · ${inicio}h às ${fim}h`, confirmarTexto: 'Assumir', perigoso: false
      })) return;
      atualizarEstado(estado => core.definirRotinaTurno(
        aplicarIntervaloZe(estado, diaTurno, gapInicio, gapFim, inicio, fim), diaTurno, inicio, fim, escopoTurno
      ));
      diaSemana = diaTurno;
      diaSelecionado = diaTurno;
      const usuarioAtual = obterUsuarioAtual();
      const nomeCurto = usuarioAtual.apelido || usuarioAtual.nome;
      mensagem = {
        titulo: 'Horário assumido',
        descricao: `${core.nomePessoaAcompanhada()} · ${nomeCurto} assumiu ${String(inicio).padStart(2, '0')}h–${String(fim).padStart(2, '0')}h.`,
        avatar: usuarioAtual.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg'
      };
    }

    if (tipoFormulario === 'atribuir-turno') {
      const responsavel = campos.responsavel;
      if (!core.obterParticipantesRede().some(pessoa => pessoa.nome === responsavel)) return;
      const nomeCurto = responsavel.match(/\(([^)]+)\)/)?.[1] || responsavel;
      const horarioAlvo = horarioPedido;
      const intervaloPedido = extrairHorasTurno(horarioAlvo);
      const existePedidoNoHorario = Object.values(obterEstado().atribuicoesTurno || {}).some(pedido => {
        if (pedido.dia !== diaTurno) return false;
        const outro = extrairHorasTurno(pedido.horario);
        return intervaloPedido.inicio < outro.fim && outro.inicio < intervaloPedido.fim;
      });
      if (existePedidoNoHorario) {
        formulario.closest('dialog')?.close();
        registrarStatus('Já existe um pedido para parte desse horário. Escolha outro intervalo ou cancele o pedido anterior.');
        return;
      }
      const avatar = core.resolverPessoaRede(responsavel).src;
      if (horarioAlvo) {
        atualizarEstado(estado => core.definirRotinaTurno({
          ...estado,
          atribuicoesTurno: {
            ...(estado.atribuicoesTurno || {}),
            [`${diaTurno}|${horarioAlvo}`]: {
              responsavel,
              nomeCurto,
              avatar,
              dia: diaTurno,
              horario: horarioAlvo,
              status: 'Pedido de teste · Esperando aceitar'
            }
          }
        }, diaTurno, intervaloPedido.inicio, intervaloPedido.fim, criarRotinaComPedido));
      }
      mensagem = {
        titulo: 'Pedido de teste enviado',
        descricao: `${core.nomePessoaAcompanhada()} · ${formatarDataCurta(diaTurno)}, ${horarioAlvo}. Convite simulado para ${nomeCurto} (nenhum aviso foi enviado de verdade; o horário continua sem ninguém).`,
        avatar
      };
    }

    if (tipoFormulario === 'editar-cobertura') {
      const inicio = Number(campos.inicio);
      const fim = Number(campos.fim);
      const duracao = fim - inicio;
      if (!Number.isInteger(inicio) || !Number.isInteger(fim) || duracao < 1 || inicio < limiteMinTurno || fim > limiteMaxTurno) {
        registrarStatus('Escolha um horário dentro do período livre.');
        return;
      }
      atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, limiteMinTurno, limiteMaxTurno, inicio, fim));
      mensagem = `Seu horário agora é ${formatarIntervaloTurno(inicio, duracao)}.`;
    }

    formulario.closest('dialog')?.close();
    if (tipoFormulario !== 'cobertura') formulario.reset();
    registrarStatus(mensagem);
    renderizar();
    if (tipoFormulario === 'cobertura') {
      pagina.querySelector(`[data-dia-semana="${diaSemana}"]`)?.focus();
    }
  });

  const dialogoCompartilhar = pagina.querySelector('[data-previa-compartilhar]')?.closest('dialog');
  const selectPeriodoCompartilhar = dialogoCompartilhar?.querySelector('[data-periodo-compartilhar]');

  const atualizarOpcoesPeriodoCompartilhar = () => {
    if (!selectPeriodoCompartilhar) return;
    const semana = obterSemanaDe(diaSemana);
    const inicioCurto = formatarData(semana[0], { day: 'numeric', month: 'short' });
    const fimCurto = formatarData(semana[6], { day: 'numeric', month: 'short' });
    const optSemana = selectPeriodoCompartilhar.querySelector('option[value="semana"]');
    const optDia = selectPeriodoCompartilhar.querySelector('option[value="dia"]');
    if (optSemana) optSemana.textContent = `Semana (${inicioCurto} a ${fimCurto})`;
    if (optDia) optDia.textContent = `Só o dia escolhido (${formatarDataCurta(diaSelecionado)})`;
  };

  pagina.querySelector('[data-dialogo="dialogo-compartilhar-agenda"]')?.addEventListener('click', atualizarOpcoesPeriodoCompartilhar);

  inicializarCompartilhamento(
    dialogoCompartilhar,
    {
      assuntoEmail: `Mutirão · Agenda de ${obterEstado().person?.apelido || obterEstado().person?.nome || 'cuidado'}`,
      gerarSecoes: () => {
        const estado = obterEstado();
        const semana = obterSemanaDe(diaSemana);
        const periodo = selectPeriodoCompartilhar?.value || 'semana';
        const diasAlvo = periodo === 'dia' ? [diaSelecionado] : semana;
        const rotuloPeriodo = periodo === 'dia' ? 'no dia escolhido' : 'na semana escolhida';

        return {
          'Compromissos': () => obterTodosEventos()
            .filter(item => diasAlvo.includes(item.dia))
            .map(item => `• ${formatarDataCurta(item.dia)} às ${item.hora} — ${item.titulo}${item.local ? ` (${item.local})` : ''}${item.acompanhante ? ` · Acompanhante: ${item.acompanhante}` : ''}`)
            .join('\n') || `Nenhum compromisso ${rotuloPeriodo}.`,
          'Escala de quem cuida': () => diasAlvo
            .map(dia => {
              const turnosDia = construirLinhaDoTempoDia(dia, estado)
                .map(seg => {
                  if (seg.tipo === 'lacuna') return `  ${seg.horario}: SEM NINGUÉM`;
                  const sufixo = (seg.pessoa.ehUsuarioAtual || seg.pessoa.nome === 'Zé da Manga') ? 'Você vai ficar nesse horário' : 'Vai ficar';
                  return `  ${seg.horario}: ${seg.pessoa.nome} · ${sufixo}`;
                })
                .join('\n');
              return `• ${formatarDataCurta(dia)} (${ROTULO_COBERTURA[obterRotuloLacuna(dia, estado)] || obterRotuloLacuna(dia, estado)})\n${turnosDia}`;
            })
            .join('\n'),
          'Tarefas': () => obterTarefas(diaSelecionado)
            .filter(t => diasAlvo.includes(t.dia))
            .map(t => `• ${formatarDataCurta(t.dia)} — ${t.titulo} (${t.concluida ? 'Concluída' : 'Pendente'})`)
            .join('\n') || `Nenhuma tarefa ${rotuloPeriodo}.`
        };
      }
    }
  );

  renderizar();
  if (compromissoParam) abrirDetalhesEvento(compromissoParam);
});
