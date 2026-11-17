(() => {
  const pagina = document.querySelector('[data-pagina-mvp="agenda"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const {
    HOJE,
    LACUNAS_TURNO,
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
    renderizarCalendarioMensal,
    inicializarCompartilhamento,
    anunciarStatus
  } = core;

  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const registrarStatus = mensagem => anunciarStatus(elementoStatus, mensagem);

  const parametros = new URLSearchParams(location.search);
  const diaParam = parametros.get('dia');
  const diaInicial = diaParam && /^\d{4}-\d{2}-\d{2}$/.test(diaParam) ? diaParam : HOJE;

  let diaSelecionado = diaInicial;
  let diaSemana = diaInicial;
  let anoAtual = Number(diaInicial.slice(0, 4));
  let mesAtual = Number(diaInicial.slice(5, 7)) - 1;
  let diaTurno = diaInicial;
  let horarioTurno = '';
  let limiteMinTurno = 0;
  let limiteMaxTurno = 24;
  let eventoEmFocoId = null;

  const obterTodosEventos = () => core.obterCompromissos();

  const obterTarefas = () => {
    const doses = core.obterDoses();
    return obterEstado().tasks.flatMap(tarefa => {
      const hora = { 'tarefa-metformina-08': '8h', 'tarefa-metformina-20': '20h' }[tarefa.id];
      if (!hora) return [tarefa];
      const dose = doses.find(item => item.chave === core.chaveDose(hora, 'Metformina'));
      if (!dose) return [];
      const administrada = dose.estado === 'administrado';
      const naoAdministrada = dose.estado === 'nao-administrado';
      const titulo = `${hora.padStart(3, '0')} · ${dose.nome}`;
      const descricao = administrada
        ? ['Administrada', dose.horario && `às ${dose.horario}`, dose.quem && `por ${dose.quem}`].filter(Boolean).join(' ')
        : naoAdministrada ? ['Não administrada', dose.motivo].filter(Boolean).join(' · ') : `Prevista para ${hora}`;
      const href = administrada ? 'medicamentos.html#registros-de-hoje'
        : `medicamentos.html?dose=${encodeURIComponent(dose.chave)}`;
      return [{ ...tarefa, titulo, descricao, concluida: administrada, href,
        rotuloAcao: administrada ? 'Ver registros' : 'Registrar administração' }];
    });
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

  const criarEtiquetaCobertura = dia => {
    const estado = obterEstado();
    const rotulo = obterRotuloLacuna(dia, estado);
    const lacuna = rotulo !== 'Coberto';
    const parcial = rotulo === 'Parcial';
    const modificador = lacuna ? (parcial ? 'agenda__etiqueta--atencao' : 'agenda__etiqueta--alerta') : 'agenda__etiqueta--sucesso';
    const icone = lacuna ? (parcial ? 'icone-atencao.svg' : 'icone-sem-cobertura.svg') : 'icone-coberto.svg';
    return `<span class="agenda__etiqueta ${modificador}"><img alt="" src="assets/media/icones/${icone}">${rotulo}</span>`;
  };

  const containerMes = pagina.querySelector('[data-mes]');

  const renderizarMes = () => {
    const estado = obterEstado();
    renderizarCalendarioMensal(containerMes, {
      ano: anoAtual,
      mes: mesAtual,
      diaSelecionado,
      obterMetaDia: chave => {
        const temEvento = obterEventosDia(chave).length > 0;
        const temLacuna = possuiLacuna(chave, estado);
        return {
          indicadores: [
            temEvento ? '<span class="calendario-mensal__indicador--evento">●</span>' : '',
            temLacuna ? '<span class="calendario-mensal__indicador--alerta">▲</span>' : ''
          ].filter(Boolean),
          sufixoRotulo: `${temEvento ? ', compromisso' : ''}${temLacuna ? ', horário sem cobertura' : ''}`
        };
      }
    });
  };

  const renderizarTarefasDiarias = () => {
    const containerTarefas = pagina.querySelector('[data-tarefas-diarias]');
    if (!containerTarefas) return;

    const tarefas = obterTarefas().filter(t => t.dia === diaSelecionado);
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
        ? `<section class="agenda__tarefas-concluidas" aria-label="Tarefas cumpridas">
            <h4 class="agenda__tarefas-subtitulo">Tarefas cumpridas</h4>
            ${concluidas.map(renderizarItemTarefa).join('')}
          </section>`
        : ''
    ].filter(Boolean).join('');
  };

  const renderizarAgenda = () => {
    const estado = obterEstado();
    const itens = obterEventosDia(diaSelecionado);

    pagina.querySelector('[data-eventos]').innerHTML = itens.map(item => `
      <article class="agenda__evento">
        <div class="agenda__tarefa">
          ${avatarMascote(core.resolverPessoaRede(item.acompanhante || item.criadoPor))}
          <div>
            <strong>${escaparHtml(item.hora.replace(':00', 'h'))} · ${escaparHtml(item.titulo)}</strong>
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
      </article>
    `).join('') || '<p class="agenda__vazio">Nenhum compromisso nesta data.</p>';

    renderizarTarefasDiarias();

    const lacunasDia = obterLacunasDia(diaSelecionado, estado);
    const lacunaDia = lacunasDia.length > 0;
    const blocoLacuna = pagina.querySelector('[data-lacuna-dia]');
    blocoLacuna.hidden = !lacunaDia;
    if (lacunaDia) {
      pagina.querySelector('[data-titulo-lacuna]').textContent = lacunasDia.length === 1
        ? `${lacunasDia[0].horario} · Turno sem cobertura`
        : `${lacunasDia.map(l => l.horario).join(', ')} · Turnos sem cobertura`;
    }

    const totalTarefasDia = obterTarefas().filter(t => t.dia === diaSelecionado).length;
    pagina.querySelector('[data-resumo-dia]').textContent =
      `${itens.length} ${itens.length === 1 ? 'compromisso' : 'compromissos'}` +
      (lacunaDia ? ` · ${lacunasDia.length} ${lacunasDia.length === 1 ? 'horário sem cobertura' : 'horários sem cobertura'}` : '') +
      (totalTarefasDia ? ` · ${totalTarefasDia} ${totalTarefasDia === 1 ? 'tarefa' : 'tarefas'}` : '') +
      ` · ${formatarDataCurta(diaSelecionado)}`;

    const semana = obterSemanaDe(diaSemana);
    const inicioSemana = formatarData(semana[0], { day: 'numeric', month: 'short' });
    const fimSemana = formatarData(semana[6], { day: 'numeric', month: 'short' });
    const tituloEscala = pagina.querySelector('[data-titulo-escala]');
    if (tituloEscala) {
      tituloEscala.textContent = `Escala semanal · ${inicioSemana} a ${fimSemana}`;
    }

    pagina.querySelector('[data-semana]').innerHTML = semana.map(dia => `
      <button type="button" data-dia-semana="${dia}" aria-pressed="${diaSemana === dia}">
        <span>${capitalizarPrimeira(formatarData(dia, { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(',', ''))}</span>
        ${criarEtiquetaCobertura(dia)}
      </button>
    `).join('');

    const linhaDescoberto = (horario, dia) => `<div class="agenda__lacuna">
      <span class="agenda__icone-descoberto" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>
      <div>
        <strong>${escaparHtml(horario)} · Turno sem cobertura</strong>
        <p>A Mari precisa de acompanhamento nesse horário.</p>
      </div>
      <button type="button" class="botao botao--secundario" data-dialogo-dinamico="dialogo-cobrir-horario" data-dia="${dia}" data-horario="${escaparHtml(horario)}">Cobrir horário</button>
    </div>`;

    const renderizarTurno = (seg, dia) => {
      const ehZe = Boolean(seg.pessoa.ehUsuarioAtual || seg.pessoa.nome === 'Zé da Manga');
      return `<div class="agenda__turno">
        ${avatarMascote(seg.pessoa)}
        <div>
          <strong>${escaparHtml(seg.horario)}</strong>
          <p>${escaparHtml(seg.pessoa.nome)} · ${ehZe ? 'Cobertura assumida por você' : 'Coberto'}</p>
        </div>
        ${ehZe && dia >= HOJE ? `
          <div class="agenda__turno-acoes">
            <button type="button" class="botao botao--secundario" data-editar-cobertura data-dia="${dia}" data-horario="${escaparHtml(seg.horario)}" data-min="${seg.janelaMin}" data-max="${seg.janelaMax}" data-atual-inicio="${seg.inicio}" data-atual-fim="${seg.fim}">Editar</button>
          </div>
        ` : ''}
      </div>`;
    };

    pagina.querySelector('[data-turnos]').innerHTML = construirLinhaDoTempoDia(diaSemana, estado).map(seg => (
      seg.tipo === 'lacuna'
        ? linhaDescoberto(seg.horario, diaSemana)
        : renderizarTurno(seg, diaSemana)
    )).join('');

    const diasComLacuna = [...new Set([...semana, ...Object.keys(LACUNAS_TURNO)])]
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
      }).join('') || '<p>Todos os horários estão cobertos.</p>';
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
      const temDocumentoVinculado = (obterEstado().documents || []).some(doc =>
        doc.dia === item.dia || (tituloLower && String(doc.vinculo || '').toLowerCase().includes(tituloLower))
      );
      botaoDocumentos.hidden = !temDocumentoVinculado;
    }
    dialogo.showModal();
  };

  document.querySelector('[data-dialogo="dialogo-novo-compromisso"]')?.addEventListener('click', evento => {
    evento.stopPropagation();
    abrirFormularioEvento(null);
  });

  const dialogoEditarCobertura = document.getElementById('dialogo-editar-cobertura');
  const popularOpcoesHorario = (select, minHora, maxHora, valorSelecionado) => {
    if (!select) return;
    select.innerHTML = Array.from({ length: maxHora - minHora + 1 }, (_, i) => {
      const hora = minHora + i;
      const rotulo = `${String(hora).padStart(2, '0')}h00`;
      return `<option value="${hora}" ${hora === valorSelecionado ? 'selected' : ''}>${rotulo}</option>`;
    }).join('');
  };

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
    previa.textContent = `Você cobrirá das ${String(inicio).padStart(2, '0')}h às ${String(fim).padStart(2, '0')}h (${duracao} ${duracao === 1 ? 'hora' : 'horas'} no total)`;
  };

  dialogoEditarCobertura?.addEventListener('change', evento => {
    atualizarPreviaCobertura(evento.target.name === 'inicio');
  });

  const dialogoCobrirHorario = document.getElementById('dialogo-cobrir-horario');
  const atualizarPreviaNovaCobertura = (ajustarSaida = false) => {
    const form = dialogoCobrirHorario?.querySelector('[data-formulario-mvp="cobertura"]');
    const previa = dialogoCobrirHorario?.querySelector('[data-previa-nova-cobertura]');
    const containerHorarios = dialogoCobrirHorario?.querySelector('[data-horarios-cobertura]');
    if (!form || !previa || !containerHorarios) return;

    const { inicio: gapInicio, fim: gapFim } = extrairHorasTurno(horarioTurno);
    const podeFracionar = gapFim - gapInicio > 1;
    const opcoesWrap = dialogoCobrirHorario?.querySelector('.dialogo-mvp__opcoes');
    if (opcoesWrap) opcoesWrap.hidden = !podeFracionar;

    const cobrirTudo = !podeFracionar || form.elements.cobrirTudo.checked;
    containerHorarios.hidden = cobrirTudo;
    if (cobrirTudo) {
      const duracao = gapFim - gapInicio;
      previa.textContent = `Você assumirá todo o horário: das ${String(gapInicio).padStart(2, '0')}h às ${String(gapFim).padStart(2, '0')}h (${duracao} ${duracao === 1 ? 'hora' : 'horas'}).`;
      return;
    }

    const inicio = Number(form.elements.inicio.value);
    let fim = Number(form.elements.fim.value);
    if (ajustarSaida || fim <= inicio) {
      const selecionado = fim > inicio ? fim : Math.min(gapFim, inicio + 1);
      popularOpcoesHorario(form.elements.fim, inicio + 1, gapFim, selecionado);
      fim = Number(form.elements.fim.value);
    }
    const duracao = fim - inicio;
    const sobras = [];
    if (inicio > gapInicio) sobras.push(`${String(gapInicio).padStart(2, '0')}h–${String(inicio).padStart(2, '0')}h`);
    if (fim < gapFim) sobras.push(`${String(fim).padStart(2, '0')}h–${String(gapFim).padStart(2, '0')}h`);

    previa.textContent = `Você assumirá das ${String(inicio).padStart(2, '0')}h às ${String(fim).padStart(2, '0')}h (${duracao} ${duracao === 1 ? 'hora' : 'horas'}).` +
      (sobras.length ? ` Permanecerá sem cobertura: ${sobras.join(' e ')}.` : '');
  };

  dialogoCobrirHorario?.addEventListener('change', evento => {
    atualizarPreviaNovaCobertura(evento.target.name === 'inicio');
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
          `${formatarDataCurta(diaTurno)} · Horário disponível para edição: ${String(limiteMinTurno).padStart(2, '0')}h às ${String(limiteMaxTurno).padStart(2, '0')}h`;
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
        titulo: 'Cancelar cobertura',
        descricao: 'Cancelar a cobertura e deixar o intervalo disponível para a rede?',
        confirmarTexto: 'Cancelar cobertura'
      });
      if (!confirmado) return;
      atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, limiteMinTurno, limiteMaxTurno, 0, 0));
      botao.closest('dialog')?.close();
      registrarStatus('Cobertura do turno cancelada. O horário ficou disponível para a rede.');
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

    if (botao.hasAttribute('data-abrir-atribuir-turno')) {
      dialogoCobrirHorario?.close();
      const dialogoAtribuir = document.getElementById('dialogo-atribuir-turno');
      if (dialogoAtribuir) {
        const ctx = dialogoAtribuir.querySelector('[data-atribuir-contexto]');
        if (ctx) ctx.textContent = `${core.nomePessoaAcompanhada()} · ${formatarDataCurta(diaTurno)} · ${horarioTurno || LACUNAS_TURNO[diaTurno]?.[0] || ''}`;
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
        dialogo.querySelector('[data-contexto-turno]').textContent =
          `${formatarDataCurta(diaTurno)} · Horário disponível: ${horarioTurno || LACUNAS_TURNO[diaTurno]?.[0] || ''}`;
        if (dialogo.id === 'dialogo-cobrir-horario') {
          const form = dialogo.querySelector('[data-formulario-mvp="cobertura"]');
          const { inicio: gapInicio, fim: gapFim } = extrairHorasTurno(horarioTurno);
          form.elements.cobrirTudo.checked = true;
          popularOpcoesHorario(form.elements.inicio, gapInicio, gapFim - 1, gapInicio);
          popularOpcoesHorario(form.elements.fim, gapInicio + 1, gapFim, gapFim);
          atualizarPreviaNovaCobertura();
        }
        dialogo.showModal();
      }
      return;
    }

    if (botao.hasAttribute('data-agenda-exportar')) {
      const prefixoMes = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
      const eventosMes = obterTodosEventos().filter(item => item.dia.startsWith(prefixoMes));
      if (!eventosMes.length) {
        registrarStatus('Nenhum compromisso neste mês para exportar.');
        return;
      }

      const escaparIcs = valor => String(valor || '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
      const carimbo = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const calcularFim = (dia, hora) => {
        const [hh, mm] = hora.split(':').map(Number);
        const fimHora = String(Math.min(23, (hh || 0) + 1)).padStart(2, '0');
        return `${dia.replaceAll('-', '')}T${fimHora}${String(mm || 0).padStart(2, '0')}00`;
      };

      const linhas = eventosMes.flatMap((item, indice) => [
        'BEGIN:VEVENT',
        `UID:${item.id || `mutirao-${item.dia}-${indice}`}@mutirao.local`,
        `DTSTAMP:${carimbo}`,
        `DTSTART;TZID=America/Sao_Paulo:${item.dia.replaceAll('-', '')}T${item.hora.replace(':', '')}00`,
        `DTEND;TZID=America/Sao_Paulo:${calcularFim(item.dia, item.hora)}`,
        `SUMMARY:${escaparIcs(item.titulo)}`,
        `LOCATION:${escaparIcs(item.local)}`,
        `DESCRIPTION:${escaparIcs(item.acompanhante ? `Acompanhante: ${item.acompanhante}` : '')}`,
        'END:VEVENT'
      ]);
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

  pagina.addEventListener('submit', evento => {
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
      const acompanhante = (campos.acompanhante || '').trim();
      if (!titulo || !local || !campos.dia || !campos.hora) {
        registrarStatus('Preencha todos os campos obrigatórios do compromisso.');
        return;
      }

      const idEdicao = campos.id;
      atualizarEstado(estado => {
        if (idEdicao) {
          return {
            ...estado,
            events: estado.events.map(e => (e.id === idEdicao
              ? { ...e, titulo, dia: campos.dia, hora: campos.hora, local, acompanhante }
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
              hora: campos.hora,
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
      mensagem = idEdicao ? 'Compromisso atualizado na Agenda.' : 'Compromisso salvo na Agenda.';
    }

    if (tipoFormulario === 'cobertura') {
      const { inicio: gapInicio, fim: gapFim } = extrairHorasTurno(horarioTurno);
      const cobrirTudo = formulario.elements.cobrirTudo?.checked;
      const inicio = cobrirTudo ? gapInicio : Number(formulario.elements.inicio.value);
      const fim = cobrirTudo ? gapFim : Number(formulario.elements.fim.value);

      atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, gapInicio, gapFim, inicio, fim));
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
      const responsavel = campos.responsavel || 'Beatriz da Silva (Bea)';
      const avatares = {
        'Beatriz da Silva (Bea)': 'assets/media/mascotes/icone-mascote-trevo.svg',
        'Ana da Silva (Aninha)': 'assets/media/mascotes/icone-mascote-espeto.svg',
        'Paulo da Silva (Paul)': 'assets/media/mascotes/icone-mascote-pingo.svg'
      };
      const nomeCurto = responsavel.match(/\(([^)]+)\)/)?.[1] || responsavel;
      mensagem = {
        titulo: 'Atribuição enviada · Aguardando aceite',
        descricao: `${core.nomePessoaAcompanhada()} · ${formatarDataCurta(diaTurno)}, ${horarioTurno || LACUNAS_TURNO[diaTurno]?.[0] || ''}. ${nomeCurto} recebeu o convite. O horário continua sem cobertura até aceitar.`,
        avatar: avatares[responsavel] || 'assets/media/mascotes/icone-mascote-trevo.svg'
      };
    }

    if (tipoFormulario === 'editar-cobertura') {
      const inicio = Number(campos.inicio);
      const fim = Number(campos.fim);
      const duracao = fim - inicio;
      if (!Number.isInteger(inicio) || !Number.isInteger(fim) || duracao < 1 || inicio < limiteMinTurno || fim > limiteMaxTurno) {
        registrarStatus('Selecione horários dentro da janela disponível deste turno.');
        return;
      }
      atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, limiteMinTurno, limiteMaxTurno, inicio, fim));
      mensagem = `Cobertura atualizada para ${formatarIntervaloTurno(inicio, duracao)}.`;
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
    if (optDia) optDia.textContent = `Somente o dia selecionado (${formatarDataCurta(diaSelecionado)})`;
  };

  pagina.querySelector('[data-dialogo="dialogo-compartilhar-agenda"]')?.addEventListener('click', atualizarOpcoesPeriodoCompartilhar);

  inicializarCompartilhamento(
    dialogoCompartilhar,
    {
      assuntoEmail: 'Mutirão · Agenda da Mari',
      gerarSecoes: () => {
        const estado = obterEstado();
        const semana = obterSemanaDe(diaSemana);
        const periodo = selectPeriodoCompartilhar?.value || 'semana';
        const diasAlvo = periodo === 'dia' ? [diaSelecionado] : semana;
        const rotuloPeriodo = periodo === 'dia' ? 'no dia selecionado' : 'na semana selecionada';

        return {
          'Compromissos': () => obterTodosEventos()
            .filter(item => diasAlvo.includes(item.dia))
            .map(item => `• ${formatarDataCurta(item.dia)} às ${item.hora} — ${item.titulo}${item.local ? ` (${item.local})` : ''}${item.acompanhante ? ` · Acompanhante: ${item.acompanhante}` : ''}`)
            .join('\n') || `Nenhum compromisso ${rotuloPeriodo}.`,
          'Escala de turnos': () => diasAlvo
            .map(dia => {
              const turnosDia = construirLinhaDoTempoDia(dia, estado)
                .map(seg => {
                  if (seg.tipo === 'lacuna') return `  ${seg.horario}: SEM COBERTURA`;
                  const sufixo = (seg.pessoa.ehUsuarioAtual || seg.pessoa.nome === 'Zé da Manga') ? 'Cobertura assumida por você' : 'Coberto';
                  return `  ${seg.horario}: ${seg.pessoa.nome} · ${sufixo}`;
                })
                .join('\n');
              return `• ${formatarDataCurta(dia)} (${obterRotuloLacuna(dia, estado)})\n${turnosDia}`;
            })
            .join('\n'),
          'Tarefas': () => obterTarefas()
            .filter(t => diasAlvo.includes(t.dia))
            .map(t => `• ${formatarDataCurta(t.dia)} — ${t.titulo} (${t.concluida ? 'Concluída' : 'Pendente'})`)
            .join('\n') || `Nenhuma tarefa registrada ${rotuloPeriodo}.`
        };
      }
    }
  );

  renderizar();
})();
