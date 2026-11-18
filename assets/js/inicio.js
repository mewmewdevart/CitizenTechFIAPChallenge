window.MutiraoCuidadoPronto.then(core => {
  if (!core) return;
  const pagina = document.querySelector('[data-pagina-mvp="inicio"]');
  if (!pagina) return;

  const {
    HOJE,
    obterEstado,
    atualizarEstado,
    obterUsuarioAtual,
    resolverPessoaRede,
    escaparHtml,
    sanitizarHtmlEditor,
    formatarData,
    formatarDataCurta,
    capitalizarPrimeira,
    obterLacunasDia,
    obterRotuloLacuna,
    construirLinhaDoTempoDia,
    aplicarIntervaloZe,
    formatarIntervaloTurno,
    extrairHorasTurno,
    popularOpcoesHorario,
    anunciarStatus,
    obterDoses,
    obterCompartimentos,
    registrarDose,
    desfazerDose
  } = core;

  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const secaoEscala = pagina.querySelector('[data-aba-inicio="escala"]');
  const podeMostrarEscala = () => Boolean(core.obterNecessidadeAcompanhamento());
  const listaDias = pagina.querySelector('[data-semana]');
  const listaTurnos = pagina.querySelector('[data-turnos]');
  const faixaLacuna = pagina.querySelector('[data-inicio-lacuna]');
  const tituloLacuna = pagina.querySelector('[data-inicio-lacuna-titulo]');


  const atualizarAlertaEstoqueInicio = () => {
    const alerta = pagina.querySelector('[data-alerta-estoque-inicio]');
    if (!alerta || !core.obterEstoque) return;
    const estado = obterEstado();
    const doses = obterDoses(estado);
    const contagemPorItem = new Map();
    doses.forEach(dose => {
      const atual = contagemPorItem.get(dose.itemId) || { nome: dose.nome, consumoDia: 0 };
      atual.consumoDia += 1;
      contagemPorItem.set(dose.itemId, atual);
    });
    const baixos = [];
    for (const [id, info] of contagemPorItem.entries()) {
      const estoque = core.obterEstoque(id, estado);
      if (estoque !== null && info.consumoDia && estoque / info.consumoDia <= 3) {
        baixos.push({ nome: info.nome, estoque, consumoDia: info.consumoDia });
      }
    }
    const insumosConhecidos = [
      ...(estado.insumos || []).map(item => ({ id: item.chave || item.nome, nome: item.nome })),
      ...(estado.itensExtras || []).filter(item => item.tipo === 'Insumo').map(item => ({ id: item.chave || item.nome, nome: item.nome }))
    ];
    for (const insumo of insumosConhecidos) {
      if ((estado.itensExcluidos || []).includes(insumo.id)) continue;
      const estoque = core.obterEstoque(insumo.id, estado);
      if (estoque !== null && estoque <= 5) {
        baixos.push({ nome: estado.itensEditados?.[insumo.id]?.nome || insumo.nome, estoque, consumoDia: null });
      }
    }
    alerta.hidden = !baixos.length;
    if (baixos.length) {
      baixos.sort((a, b) => a.estoque - b.estoque);
      const principal = baixos[0];
      const dias = principal.consumoDia ? Math.floor(principal.estoque / principal.consumoDia) : null;
      alerta.querySelector('strong').textContent = baixos.length === 1
        ? `${principal.nome} está acabando`
        : `${baixos.length} itens estão acabando · ${principal.nome} primeiro`;
      alerta.querySelector('.faixa-alerta__texto > span').textContent = dias !== null
        ? `Tem ${principal.estoque} em casa, dá para ${dias} ${dias === 1 ? 'dia' : 'dias'}`
        : `Tem ${principal.estoque} em casa`;
    }
  };

  atualizarAlertaEstoqueInicio();
  window.addEventListener('mutirao:cuidado-atualizado', atualizarAlertaEstoqueInicio);

  const atualizarProximoCompromisso = () => {
    const modelo = pagina.querySelector('[data-proximo-compromisso]');
    const resumo = modelo?.closest('.inicio__resumo');
    if (!modelo || !resumo) return;

    resumo.querySelectorAll('[data-compromisso-extra]').forEach(el => el.remove());

    const futuros = core.obterCompromissosFuturos();
    const deHoje = futuros.filter(item => item.dia === HOJE);
    const compromissos = deHoje.length ? deHoje : futuros.slice(0, 1);
    const preencherBloco = (bloco, item, indice) => {
      const pessoa = item ? core.resolverPessoaRede(item.acompanhante || item.criadoPor) : null;
      const avatar = bloco.querySelector('.avatar');
      if (avatar) {
        avatar.src = pessoa ? pessoa.src : 'assets/media/mascotes/icone-mascote-espeto.svg';
      }
      const rotulo = bloco.querySelector('.inicio__rotulo');
      if (rotulo) {
        rotulo.textContent = indice === 0 ? 'Próximo compromisso' : 'Compromisso marcado';
      }
      bloco.querySelector('strong').textContent = item
        ? `${item.dia === HOJE ? '' : core.formatarDataCurta(item.dia) + ' · '}${item.hora.replace(':00', 'h')} · ${item.titulo}`
        : 'Nenhum compromisso marcado';
      bloco.querySelector('[data-compromisso-detalhes]').textContent = item
        ? [item.local, item.acompanhante && `${item.acompanhante} vai junto`].filter(Boolean).join(' · ')
        : 'Veja a Agenda para combinar os próximos cuidados.';
      bloco.querySelector('a').href = item ? `agenda.html?dia=${encodeURIComponent(item.dia)}&compromisso=${encodeURIComponent(item.id)}` : 'agenda.html';
    };

    if (!compromissos.length) {
      modelo.hidden = true;
      return;
    }

    modelo.hidden = false;
    preencherBloco(modelo, compromissos[0], 0);
    let referencia = modelo;
    for (let i = 1; i < compromissos.length; i++) {
      const clone = modelo.cloneNode(true);
      clone.removeAttribute('data-proximo-compromisso');
      clone.setAttribute('data-compromisso-extra', compromissos[i].id || String(i));
      preencherBloco(clone, compromissos[i], i);
      referencia.after(clone);
      referencia = clone;
    }
  };

  const atualizarProximaMedicacao = grupos => {
    const proximo = grupos.find(grupo => grupo.momento !== 'passado'
      && grupo.itens.some(dose => dose.estado === 'prevista'));
    const titulo = pagina.querySelector('[data-proxima-medicacao]');
    const responsavel = pagina.querySelector('[data-proxima-responsavel]');
    const bloco = titulo?.closest('.painel__bloco');
    if (!titulo || !responsavel) return;
    if (!grupos.length) {
      if (bloco) bloco.hidden = true;
      return;
    }
    if (bloco) bloco.hidden = false;
    if (!proximo) {
      titulo.textContent = 'Nenhum remédio para dar mais tarde';
      const temPendencias = grupos.some(grupo => !grupo.completo);
      responsavel.textContent = temPendencias ? 'Veja o que já foi anotado hoje.' : 'Porta-remédios completo';
      return;
    }
    const pendentes = proximo.itens.filter(dose => dose.estado === 'prevista');
    titulo.textContent = pendentes.length > 1
      ? `${proximo.hora} · ${pendentes.length} remédios (${pendentes[0].nome} + ${pendentes.length - 1})`
      : `${proximo.hora} · ${pendentes[0].nome}`;
    const pessoaTurno = proximo.responsavel;
    responsavel.textContent = pessoaTurno
      ? `Responsável: ${pessoaTurno}`
      : 'Ninguém cuida nesse horário';
  };

  const DIAS_SEMANA = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
  let diaSelecionado = HOJE;
  let diaTurno = HOJE;
  let horarioTurno = '';
  let limiteMinTurno = 0;
  let limiteMaxTurno = 24;

  const avatarMascote = pessoa => {
    const src = pessoa?.foto || `assets/media/mascotes/${escaparHtml(pessoa?.avatar || 'icone-mascote-cubado.svg')}`;
    return `<img class="agenda__avatar" alt="" src="${escaparHtml(src)}" width="40" height="40">`;
  };

  const ROTULO_COBERTURA = { Coberto: 'Com alguém', Parcial: 'Falta alguém', Descoberto: 'Sem ninguém', 'Sem turnos': 'Sem turnos' };
  const ICONE_SEM_TURNOS = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>';
  const criarEtiquetaCobertura = (dia, estado) => {
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

  const atualizarResumoPessoa = () => {
    const estado = obterEstado();
    const person = estado.person || {};
    const resumo = pagina.querySelector('.inicio__resumo > .painel__item');
    if (!resumo) return;
    const avatar = resumo.querySelector('.avatar');
    if (avatar) {
      avatar.src = person.foto || person.mascote || 'assets/media/mascotes/icone-mascote-forma.svg';
    }
    const titulo = resumo.querySelector('#titulo-pessoa');
    if (titulo) titulo.textContent = core.nomePessoaAcompanhada(estado);
  };

  const obterUltimoRelato = estado => {
    const dia = Object.keys(estado.reports || {})
      .filter(data => estado.reports[data]?.length)
      .sort().at(-1);
    return dia ? { dia, relatorio: estado.reports[dia][0] } : null;
  };

  const atualizarPassagemInicio = () => {
    const secao = pagina.querySelector('#titulo-passagem')?.closest('section');
    if (!secao) return;
    const estado = obterEstado();
    const ultimo = obterUltimoRelato(estado);
    const relatorio = ultimo?.relatorio;
    const itemAutor = secao.querySelector('.painel__item');
    const relatoEl = secao.querySelector('[data-passagem-relato]');
    const notaEl = secao.querySelector('.passagem__nota');
    const btnCompleto = secao.querySelector('[data-dialogo="dialogo-passagem-cuidado"]');

    if (!relatorio) {
      if (itemAutor) itemAutor.hidden = true;
      if (relatoEl) relatoEl.innerHTML = '<div class="estado-vazio"><strong>Nenhum recado ainda</strong><p>Use "Anotar o turno" para registrar o primeiro relato desta ficha.</p></div>';
      if (notaEl) notaEl.hidden = true;
      if (btnCompleto) btnCompleto.hidden = true;
      return;
    }

    if (itemAutor) {
      itemAutor.hidden = false;
      const pessoa = resolverPessoaRede(relatorio[0], estado);
      const img = itemAutor.querySelector('.avatar');
      if (img && pessoa) img.src = pessoa.src;
      const strong = itemAutor.querySelector('.painel__texto strong');
      if (strong) strong.textContent = relatorio[0];
      const span = itemAutor.querySelector('.painel__texto span');
      if (span) span.textContent = [relatorio[1], formatarDataCurta(ultimo.dia)].filter(Boolean).join(' · ');
    }
    if (relatoEl) relatoEl.innerHTML = sanitizarHtmlEditor(relatorio[3]);
    if (notaEl) {
      notaEl.hidden = !relatorio[4];
      const spanNota = notaEl.querySelector('span');
      if (spanNota) spanNota.innerHTML = sanitizarHtmlEditor(String(relatorio[4] || '').replaceAll('\n', '<br>'));
    }
    if (btnCompleto) btnCompleto.hidden = false;
  };

  const atualizarRedeInicio = () => {
    const secao = pagina.querySelector('#titulo-rede')?.closest('section');
    const lista = secao?.querySelector('.painel__lista');
    if (!lista) return;
    const estado = obterEstado();
    const participantes = core.obterParticipantesRede(estado);
    lista.innerHTML = participantes.map(p => {
      const src = p.foto || `assets/media/mascotes/${escaparHtml(p.avatar || 'icone-mascote-cubado.svg')}`;
      const subtitulo = p.vinculo || p.papel || 'Participante';
      return `<li class="painel__item"><img class="avatar" src="${escaparHtml(src)}" alt=""><span class="painel__texto"><strong>${escaparHtml(p.nome)}</strong><span>${escaparHtml(subtitulo)}</span></span></li>`;
    }).join('');
    if (!participantes.some(pessoa => !pessoa.ehUsuarioAtual)) {
      lista.insertAdjacentHTML('beforeend', '<li class="estado-vazio">Ainda não há outros participantes na rede.</li>');
    }
  };

  const atualizarTurnoAtual = () => {
    const bloco = pagina.querySelector('[data-turno-atual]');
    if (!bloco) return;
    const estado = obterEstado();
    const apelido = estado.person?.apelido || estado.person?.nome || 'a pessoa';
    const turnoAtual = core.obterTurnoAtual(estado);
    const lacunasHoje = obterLacunasDia(HOJE, estado);
    const avatar = bloco.querySelector('.avatar');
    const titulo = bloco.querySelector('[data-turno-atual-titulo]');
    const detalhe = bloco.querySelector('[data-turno-atual-detalhe]');
    const link = bloco.querySelector('a');

    if (!turnoAtual && !core.obterLacunaAtual(estado)) {
      bloco.hidden = true;
      return;
    }

    bloco.hidden = false;
    if (avatar) avatar.hidden = !turnoAtual;
    if (avatar && turnoAtual?.pessoa) {
      avatar.src = turnoAtual.pessoa.foto || `assets/media/mascotes/${turnoAtual.pessoa.avatar || 'icone-mascote-trevo.svg'}`;
    }
    if (titulo) {
      titulo.textContent = turnoAtual
        ? `${turnoAtual.horario} · ${turnoAtual.pessoa.nome}`
        : `Ninguém com ${apelido} neste horário previsto`;
    }
    if (detalhe) {
      const proximaLacuna = turnoAtual && lacunasHoje.find(lacuna => lacuna.inicio >= turnoAtual.fim);
      detalhe.textContent = !turnoAtual ? 'Horário sem cobertura.' : proximaLacuna
        ? `Tem alguém com ${apelido} agora · Próximo horário sem ninguém: ${proximaLacuna.horario}`
        : `Tem alguém com ${apelido} agora.`;
    }
    if (link) link.href = `agenda.html?dia=${encodeURIComponent(HOJE)}`;
  };

  const renderizarEscala = () => {
    const estado = obterEstado();
    const inicioSemana = formatarData(DIAS_SEMANA[0], { day: 'numeric', month: 'short' });
    const fimSemana = formatarData(DIAS_SEMANA[6], { day: 'numeric', month: 'short' });
    const tituloEscala = pagina.querySelector('[data-titulo-escala]');
    if (tituloEscala) {
      tituloEscala.textContent = `Quem cuida na semana · ${inicioSemana} a ${fimSemana}`;
    }

    listaDias.innerHTML = DIAS_SEMANA.map(dia => `
      <button type="button" data-dia-semana="${dia}" aria-pressed="${dia === diaSelecionado}">
        <span>${capitalizarPrimeira(formatarData(dia, { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(',', ''))}</span>
        ${criarEtiquetaCobertura(dia, estado)}
      </button>
    `).join('');

    const linhaDescoberto = (horario, dia) => `<div class="agenda__lacuna">
      <span class="agenda__icone-descoberto" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>
      <div>
        <strong>${escaparHtml(horario)} · Horário sem ninguém</strong>
        <p>Ainda não há uma pessoa escalada para esse horário.</p>
      </div>
      <button type="button" class="botao botao--secundario" data-dialogo-dinamico="dialogo-cobrir-horario" data-dia="${dia}" data-horario="${escaparHtml(horario)}">Ficar nesse horário</button>
    </div>`;

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

    const linkAgenda = pagina.querySelector('[data-inicio-link-escala]');
    if (linkAgenda) linkAgenda.href = `agenda.html?dia=${encodeURIComponent(diaSelecionado)}#escala`;

    const linhaDoDia = construirLinhaDoTempoDia(diaSelecionado, estado);
    const pedidos = core.obterPedidosForaDaRotina(diaSelecionado, estado);
    const acoes = pedidos.map(([, pedido]) => `<p>${escaparHtml(pedido.horario)} · Pedido para ${escaparHtml(pedido.responsavel)} · <a href="${linkAgenda.href}">Ver pedido na Agenda</a></p>`).join('');
    listaTurnos.innerHTML = linhaDoDia.map(seg => seg.tipo === 'lacuna'
      ? linhaDescoberto(seg.horario, diaSelecionado)
      : renderizarTurno(seg, diaSelecionado)
    ).join('') + acoes + core.renderizarAdicionarTurnos(diaSelecionado, estado, linhaDoDia);

    const lacunasHoje = obterLacunasDia(HOJE, estado);
    faixaLacuna.hidden = !lacunasHoje.length;
    if (lacunasHoje.length) {
      tituloLacuna.textContent = `${lacunasHoje[0].horario} · Horário sem ninguém`;
      const textoLacuna = faixaLacuna.querySelector('.faixa-alerta__texto > span');
      if (textoLacuna) textoLacuna.textContent = 'Ainda não há uma pessoa escalada para esse horário.';
      const botaoCobrirLacuna = faixaLacuna.querySelector('[data-inicio-cobrir-lacuna]');
      if (botaoCobrirLacuna) {
        botaoCobrirLacuna.dataset.dia = HOJE;
        botaoCobrirLacuna.dataset.horario = lacunasHoje[0].horario;
      }
    }
    atualizarResumoPessoa();
    atualizarTurnoAtual();
    atualizarPassagemInicio();
    atualizarRedeInicio();
    sincronizarContextoRelato();
  };

  const dialogoEditarCobertura = document.getElementById('dialogo-editar-cobertura');
  const dialogoCobrirHorario = document.getElementById('dialogo-cobrir-horario');

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

  dialogoCobrirHorario?.addEventListener('change', () => {
    core.atualizarPreviaTurno(dialogoCobrirHorario, horarioTurno);
  });

  listaDias.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-dia-semana]');
    if (!botao) return;
    diaSelecionado = botao.dataset.diaSemana;
    renderizarEscala();
    atualizarProximaMedicacao(obterCompartimentos());
    listaDias.querySelector(`[data-dia-semana="${diaSelecionado}"]`)?.focus();
  });

  pagina.addEventListener('click', async evento => {
    const botaoFechar = evento.target.closest('[data-fechar-dialogo]');
    if (botaoFechar) {
      botaoFechar.closest('dialog')?.close();
      return;
    }

    const botao = evento.target.closest('button');
    if (!botao) return;

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
      anunciarStatus(elementoStatus, 'Pronto, você saiu desse horário. Ele ficou livre para outra pessoa da família.');
      renderizarEscala();
      return;
    }

    if (botao.dataset.dialogo === 'dialogo-passagem-cuidado') {
      sincronizarDialogoPassagem();
    }

    if (botao.dataset.passagemEtapa) {
      const pedido = obterEstado().consultaDaPassagem;
      if (!pedido) return;
      botao.closest('dialog')?.close();
      const proximo = document.getElementById(botao.dataset.passagemEtapa);
      if (proximo) {
        const estadoAtual = obterEstado();
        const consultaExistente = estadoAtual.passagemConsultaId
          ? core.obterCompromissos(estadoAtual).find(e => e.id === estadoAtual.passagemConsultaId)
          : null;
        if (consultaExistente && (proximo.id === 'dialogo-pedido-andamento' || proximo.id === 'dialogo-cadastrar-consulta')) {
          sincronizarDialogoPassagem();
          document.getElementById('dialogo-passagem-cuidado')?.showModal();
          return;
        }
        const usuarioAtual = obterUsuarioAtual();
        const pessoa = core.nomePessoaAcompanhada();
        if (proximo.id === 'dialogo-pedido-andamento') {
          const ctx = proximo.querySelector('[data-pedido-contexto]');
          const avatar = proximo.querySelector('[data-pedido-avatar]');
          const resp = proximo.querySelector('[data-pedido-responsavel]');
          const papel = proximo.querySelector('[data-pedido-papel]');
          if (ctx) ctx.textContent = `${pedido.titulo} · ${pessoa}`;
          if (avatar) avatar.src = usuarioAtual.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg';
          if (resp) resp.textContent = usuarioAtual.nomeComApelido;
          if (papel) papel.textContent = [usuarioAtual.papel, usuarioAtual.vinculo].filter(Boolean).join(' · ');
        }
        if (proximo.id === 'dialogo-cadastrar-consulta') {
          const ctx = proximo.querySelector('[data-consulta-contexto]');
          if (ctx) ctx.textContent = `${pedido.titulo} · ${pessoa}`;
        }
        proximo.showModal();
      }
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
    }
  });

  pagina.querySelector('[data-formulario-mvp="cobertura"]')?.addEventListener('submit', async evento => {
    evento.preventDefault();
    const form = evento.target;
    const { inicio: gapInicio, fim: gapFim } = extrairHorasTurno(horarioTurno);
    const { inicio, fim } = core.obterIntervaloFormularioTurno(form, horarioTurno);
    const tornarDiario = form.elements.escopoTurno.value === 'diario';

    if (core.obterPreferencias().assumirTurnoDireto === false && !await core.confirmarAcao({
      titulo: 'Assumir este horário?', descricao: `${diaTurno} · ${inicio}h às ${fim}h`, confirmarTexto: 'Assumir', perigoso: false
    })) return;
    atualizarEstado(estado => core.definirRotinaTurno(
      aplicarIntervaloZe(estado, diaTurno, gapInicio, gapFim, inicio, fim), diaTurno, inicio, fim, tornarDiario
    ));
    diaSelecionado = diaTurno;
    form.closest('dialog')?.close();
    const usuarioAtual = obterUsuarioAtual();
    const nomeCurto = usuarioAtual.apelido || usuarioAtual.nome;
    anunciarStatus(elementoStatus, {
      titulo: 'Horário assumido',
      descricao: `${core.nomePessoaAcompanhada()} · ${nomeCurto} assumiu ${String(inicio).padStart(2, '0')}h–${String(fim).padStart(2, '0')}h.`,
      avatar: usuarioAtual.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg'
    });
    renderizarEscala();
    atualizarProximaMedicacao(obterCompartimentos());
    listaDias.querySelector(`[data-dia-semana="${diaSelecionado}"]`)?.focus();
  });

  pagina.querySelector('[data-formulario-mvp="editar-cobertura"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const inicio = Number(form.elements.inicio.value);
    const fim = Number(form.elements.fim.value);
    const duracao = fim - inicio;
    if (!Number.isInteger(inicio) || !Number.isInteger(fim) || duracao < 1 || inicio < limiteMinTurno || fim > limiteMaxTurno) {
      anunciarStatus(elementoStatus, 'Escolha um horário dentro do período livre.');
      return;
    }
    atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, limiteMinTurno, limiteMaxTurno, inicio, fim));
    form.closest('dialog')?.close();
    anunciarStatus(elementoStatus, `Seu horário agora é ${formatarIntervaloTurno(inicio, duracao)}.`);
    renderizarEscala();
  });

  const popularTarefasRelato = () => {
    const select = pagina.querySelector('[data-select-tarefas-relato]');
    if (!select) return;
    const estado = obterEstado();
    const dosesHoje = obterDoses().slice(0, 6).map(dose => `${dose.hora} · ${dose.nome}`);
    const compromissos = (core.obterCompromissos ? core.obterCompromissos(estado) : [])
      .slice(0, 4)
      .map(evt => `${evt.titulo} (${core.formatarDataCurta ? core.formatarDataCurta(evt.dia) : evt.dia})`);
    const tarefas = estado.tasks.map(tarefa => tarefa.titulo).filter(Boolean);
    const montarGrupoOpt = (rotulo, itens) => itens.length
      ? `<optgroup label="${escaparHtml(rotulo)}">${itens.map(item => `<option value="${escaparHtml(item)}">${escaparHtml(item)}</option>`).join('')}</optgroup>`
      : '';
    const temOpcoes = dosesHoje.length || compromissos.length || tarefas.length;
    const rotulo = temOpcoes ? 'Selecione uma tarefa' : 'Nenhuma tarefa cadastrada';
    select.disabled = !temOpcoes;
    select.innerHTML = `<option value="">${rotulo}</option>${montarGrupoOpt('Medicamentos de hoje', dosesHoje)}${montarGrupoOpt('Agenda e compromissos', compromissos)}${montarGrupoOpt('Tarefas da ficha', tarefas)}`;
  };

  popularTarefasRelato();

  const formRelatoInicio = pagina.querySelector('[data-formulario-mvp="relato"]');
  const selectDestinoCuidado = formRelatoInicio?.querySelector('[data-destino-cuidado]');
  const blocoCuidadoFicha = formRelatoInicio?.querySelector('[data-bloco-cuidado="ficha"]');
  const blocoCuidadoAgenda = formRelatoInicio?.querySelector('[data-bloco-cuidado="agenda"]');
  const botaoSubmitCuidado = formRelatoInicio?.querySelector('[data-submit-cuidado]');

  const alternarDestinoCuidado = () => {
    const destino = selectDestinoCuidado?.value || 'ficha';
    const ehAgenda = destino === 'agenda';
    if (blocoCuidadoFicha) blocoCuidadoFicha.hidden = ehAgenda;
    if (blocoCuidadoAgenda) blocoCuidadoAgenda.hidden = !ehAgenda;
    const relatoEl = formRelatoInicio?.elements.relato;
    const tituloEventoEl = formRelatoInicio?.elements.tituloEvento;
    const diaEventoEl = formRelatoInicio?.elements.diaEvento;
    const horaEventoEl = formRelatoInicio?.elements.horaEvento;
    const localEventoEl = formRelatoInicio?.elements.localEvento;
    if (relatoEl) relatoEl.required = !ehAgenda;
    if (tituloEventoEl) tituloEventoEl.required = ehAgenda;
    if (diaEventoEl) diaEventoEl.required = ehAgenda;
    if (horaEventoEl) horaEventoEl.required = ehAgenda;
    if (localEventoEl) localEventoEl.required = ehAgenda;
    if (botaoSubmitCuidado) {
      botaoSubmitCuidado.textContent = ehAgenda ? 'Salvar na Agenda' : 'Salvar na Ficha';
    }
  };

  selectDestinoCuidado?.addEventListener('change', alternarDestinoCuidado);
  alternarDestinoCuidado();

  formRelatoInicio?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const campos = Object.fromEntries(new FormData(form));
    const destino = campos.destino || 'ficha';
    const usuario = obterUsuarioAtual();
    const pessoa = core.nomePessoaAcompanhada();

    const abrirConfirmacao = ({ titulo, contexto, resumo, detalhe, href, rotuloLink }) => {
      const dialogoRelatoRegistrado = document.getElementById('dialogo-relato-registrado');
      if (dialogoRelatoRegistrado) {
        const tituloEl = dialogoRelatoRegistrado.querySelector('#titulo-relato-registrado');
        const contextoEl = dialogoRelatoRegistrado.querySelector('[data-relato-registrado-contexto]');
        const turnoEl = dialogoRelatoRegistrado.querySelector('[data-relato-registrado-turno]');
        const avatarEl = dialogoRelatoRegistrado.querySelector('[data-relato-registrado-avatar]');
        const detalheEl = dialogoRelatoRegistrado.querySelector('[data-relato-registrado-detalhe]');
        const linkEl = dialogoRelatoRegistrado.querySelector('[data-relato-registrado-link]');
        if (tituloEl) tituloEl.textContent = titulo;
        if (contextoEl) contextoEl.textContent = contexto;
        if (turnoEl) turnoEl.textContent = resumo;
        if (avatarEl) avatarEl.src = usuario.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg';
        if (detalheEl) detalheEl.textContent = detalhe;
        if (linkEl) {
          linkEl.href = href;
          linkEl.textContent = rotuloLink;
        }
        dialogoRelatoRegistrado.showModal();
      } else {
        anunciarStatus(elementoStatus, `${titulo}.`);
      }
    };

    if (destino === 'agenda') {
      const tituloEvento = (campos.tituloEvento || '').trim();
      const localEvento = (campos.localEvento || '').trim();
      const diaEvento = campos.diaEvento;
      const horaEvento = campos.horaEvento;
      const acompanhante = (campos.acompanhanteEvento || usuario.nomeComApelido).trim();
      if (!tituloEvento || !localEvento || !diaEvento || !horaEvento) {
        anunciarStatus(elementoStatus, 'Preencha título, data, horário e local do compromisso.');
        return;
      }
      const novoEvento = {
        id: `evt-${Date.now()}`,
        titulo: tituloEvento,
        dia: diaEvento,
        hora: horaEvento,
        local: localEvento,
        acompanhante,
        criadoPor: usuario.nomeComApelido
      };
      const espelharFicha = Boolean(form.elements.espelharFicha?.checked);
      atualizarEstado(estado => ({
        ...estado,
        events: [...(estado.events || []), novoEvento],
        reports: espelharFicha ? {
          ...estado.reports,
          [HOJE]: [
            [
              usuario.nome,
              usuario.papel,
              `Compromisso marcado · ${tituloEvento}`,
              `Agendado para ${formatarDataCurta(diaEvento)} às ${horaEvento.replace(':00', 'h')} em ${localEvento}.`,
              ''
            ],
            ...(estado.reports?.[HOJE] || [])
          ]
        } : estado.reports
      }));
      form.reset();
      alternarDestinoCuidado();
      form.closest('dialog')?.close();
      atualizarProximoCompromisso();
      popularTarefasRelato();
      if (espelharFicha) atualizarPassagemInicio();
      abrirConfirmacao({
        titulo: 'Compromisso salvo na Agenda',
        contexto: `${pessoa} · Agenda de cuidado`,
        resumo: `${tituloEvento} · ${formatarDataCurta(diaEvento)} às ${horaEvento.replace(':00', 'h')}`,
        detalhe: `Anotado por ${usuario.nomeComApelido} · ${espelharFicha ? 'Disponível na Agenda e na Ficha.' : 'Disponível na Agenda.'}`,
        href: `agenda.html?dia=${encodeURIComponent(diaEvento)}&compromisso=${encodeURIComponent(novoEvento.id)}`,
        rotuloLink: 'Ver na Agenda'
      });
      return;
    }

    const relato = (campos.relato || '').trim();
    if (!relato) {
      anunciarStatus(elementoStatus, 'Escreva como foi o turno antes de salvar.');
      return;
    }

    const turno = (campos.turno || '').trim();
    const cabecalhoPapel = turno ? `${usuario.papel} · ${turno}` : usuario.papel;
    atualizarEstado(estado => ({
      ...estado,
      reports: {
        ...estado.reports,
        [HOJE]: [
          [
            usuario.nome,
            cabecalhoPapel,
            campos.tarefa ? `Tarefa relacionada · ${campos.tarefa}` : 'Anotação do turno',
            relato,
            (campos.recado || '').trim()
          ],
          ...(estado.reports?.[HOJE] || [])
        ]
      }
    }));

    form.reset();
    alternarDestinoCuidado();
    form.closest('dialog')?.close();
    atualizarPassagemInicio();
    abrirConfirmacao({
      titulo: 'Anotação salva',
      contexto: `${pessoa} · Diário de turno`,
      resumo: turno || 'Anotação geral (sem turno)',
      detalhe: `Anotado por ${usuario.nomeComApelido} · Fica na ficha da ${pessoa}.`,
      href: 'ficha.html#diario',
      rotuloLink: 'Ver na ficha'
    });
  });

  const sincronizarDialogoPassagem = () => {
    const dialogo = document.getElementById('dialogo-passagem-cuidado');
    if (!dialogo) return;
    const estado = obterEstado();
    const consulta = estado.passagemConsultaId
      ? core.obterCompromissos(estado).find(e => e.id === estado.passagemConsultaId)
      : null;
    const botaoAssumir = dialogo.querySelector('[data-passagem-etapa="dialogo-pedido-andamento"]');
    const linkVerConsulta = dialogo.querySelector('[data-passagem-ver-consulta]');
    const tituloCaixa = dialogo.querySelector('[data-passagem-modal-titulo]');
    const textoCaixa = dialogo.querySelector('[data-passagem-modal-texto]');

    const ultimo = obterUltimoRelato(estado);
    const pedido = estado.consultaDaPassagem;
    const origem = pedido ? estado.reports?.[pedido.dia]?.find(relato => relato[0] === pedido.autor) : null;
    const relatorio = origem || ultimo?.relatorio;
    const autoria = dialogo.querySelector('[data-passagem-modal-autoria]');
    autoria.hidden = !relatorio;
    if (relatorio) {
      autoria.querySelector('img').src = resolverPessoaRede(relatorio[0], estado).src;
      autoria.querySelector('strong').textContent = relatorio[0];
      autoria.querySelector('small').textContent = formatarDataCurta(origem ? pedido.dia : ultimo.dia);
    }

    if (consulta) {
      if (botaoAssumir) botaoAssumir.hidden = true;
      if (linkVerConsulta) {
        linkVerConsulta.hidden = false;
        linkVerConsulta.href = `agenda.html?dia=${encodeURIComponent(consulta.dia)}&compromisso=${encodeURIComponent(consulta.id)}`;
      }
      if (tituloCaixa) tituloCaixa.textContent = 'Pedido concluído · Consulta cadastrada';
      if (textoCaixa) {
        const dataFmt = core.formatarDataCurta ? core.formatarDataCurta(consulta.dia) : consulta.dia;
        const horaFmt = String(consulta.hora || '').replace(':', 'h').replace(/h00$/, 'h');
        textoCaixa.textContent = `${consulta.titulo} agendada para ${dataFmt}${horaFmt ? ` às ${horaFmt}` : ''}${consulta.local ? ` · ${consulta.local}` : ''}.`;
      }
    } else {
      if (botaoAssumir) botaoAssumir.hidden = !pedido;
      if (linkVerConsulta) linkVerConsulta.hidden = true;
      if (tituloCaixa) tituloCaixa.textContent = 'Para o próximo turno';
      if (textoCaixa) {
        const texto = relatorio?.[4] || relatorio?.[3];
        textoCaixa.innerHTML = texto ? sanitizarHtmlEditor(String(texto).replaceAll('\n', '<br>')) : 'Nenhum recado cadastrado.';
      }
    }
  };

  pagina.querySelector('[data-formulario-mvp="consulta-passagem"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const estadoAtual = obterEstado();
    const consultaExistente = estadoAtual.passagemConsultaId
      ? core.obterCompromissos(estadoAtual).find(e => e.id === estadoAtual.passagemConsultaId)
      : null;
    if (consultaExistente) {
      form.closest('dialog')?.close();
      sincronizarDialogoPassagem();
      document.getElementById('dialogo-passagem-cuidado')?.showModal();
      return;
    }

    const campos = Object.fromEntries(new FormData(form));
    const dia = (campos.dia || '').trim();
    const hora = (campos.hora || '').trim();
    const local = (campos.local || '').trim();
    const acompanhante = (campos.acompanhante || obterUsuarioAtual().nomeComApelido).trim();
    const titulo = estadoAtual.consultaDaPassagem?.titulo;
    if (!titulo || !dia || !hora || !local) return;
    const idEvento = `evt-${Date.now()}`;

    atualizarEstado(estado => ({
      ...estado,
      passagemConsultaId: idEvento,
      events: [
        ...(estado.events || []),
        {
          id: idEvento,
          titulo,
          dia,
          hora,
          local,
          acompanhante,
          criadoPor: obterUsuarioAtual().nomeComApelido
        }
      ]
    }));

    atualizarProximoCompromisso();
    sincronizarDialogoPassagem();
    form.closest('dialog')?.close();
    const dialogoAgendada = document.getElementById('dialogo-consulta-agendada');
    if (dialogoAgendada) {
      const dataFormatada = core.formatarDataCurta ? core.formatarDataCurta(dia) : dia;
      const horaFormatada = hora.replace(':', 'h').replace(/h00$/, 'h');
      const tituloEl = dialogoAgendada.querySelector('[data-consulta-agendada-titulo]');
      const detalheEl = dialogoAgendada.querySelector('[data-consulta-agendada-detalhe]');
      const linkAgenda = dialogoAgendada.querySelector('[data-consulta-agendada-link], a[href^="agenda.html"]');
      if (tituloEl) tituloEl.textContent = `${titulo} · ${dataFormatada} · ${horaFormatada}`;
      if (detalheEl) detalheEl.textContent = `${local} · ${acompanhante} acompanha.`;
      if (linkAgenda) linkAgenda.href = `agenda.html?dia=${encodeURIComponent(dia)}&compromisso=${encodeURIComponent(idEvento)}`;
      dialogoAgendada.showModal();
    }
  });

  const sincronizarContextoRelato = () => {
    const usuario = obterUsuarioAtual();
    const contexto = pagina.querySelector('[data-contexto-relato-inicio]');
    const avatar = pagina.querySelector('[data-relato-avatar]');
    if (avatar) avatar.src = usuario.avatar;
    const turno = core.obterTurnoAtual();
    if (contexto) {
      const rotulo = turno ? `Turno de ${turno.pessoa.nome} · ${turno.horario}` : 'Anotação geral (sem turno)';
      contexto.textContent = `${rotulo} · Anotado por ${usuario.nomeComApelido}`;
    }
    const select = pagina.querySelector('[data-formulario-mvp="relato"] select[name="turno"]');
    core.popularTurnosRelato(select, turno ? 'Turno ' + turno.horario : '');
  };

  window.MutiraoPortaRemedios?.montar({
    raiz: pagina.querySelector('.porta-remedios'),
    dialogo: document.getElementById('dialogo-detalhe-pote'),
    aoMudar: atualizarProximaMedicacao
  });
  renderizarEscala();
  atualizarProximoCompromisso();
  window.addEventListener('mutirao:cuidado-atualizado', () => {
    renderizarEscala();
    atualizarProximoCompromisso();
  });

  const telaPequena = window.matchMedia('(width < 1150px)');
  const secoesAbas = [...pagina.querySelectorAll('[data-aba-inicio]')];
  if (secoesAbas.length) {
    const ROTULOS_ABA = { passagem: 'Recado', escala: 'Semana', rede: 'Pessoas' };
    const ICONE_ATENCAO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>';
    const ICONE_OK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>';
    const ICONE_NEUTRO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';

    const aviso = document.createElement('div');
    aviso.className = 'inicio__aviso-semana';
    aviso.innerHTML = '<span class="inicio__aviso-icone" data-aviso-icone></span><p class="inicio__aviso-texto" data-aviso-texto></p><button type="button" class="inicio__aviso-acao">Ver semana</button>';

    const listaAbas = document.createElement('div');
    listaAbas.className = 'inicio__abas';
    listaAbas.setAttribute('role', 'tablist');
    listaAbas.setAttribute('aria-label', 'Mais sobre o cuidado');
    listaAbas.innerHTML = secoesAbas.map(secao => `<button type="button" role="tab" id="aba-inicio-${secao.dataset.abaInicio}" aria-controls="${secao.id || (secao.id = `painel-inicio-${secao.dataset.abaInicio}`)}">${ROTULOS_ABA[secao.dataset.abaInicio]}</button>`).join('');
    secoesAbas[0].before(aviso, listaAbas);
    const botoesAba = [...listaAbas.querySelectorAll('[role="tab"]')];
    const rotulosOriginais = secoesAbas.map(secao => secao.getAttribute('aria-labelledby'));

    const escolherAba = (indice, focar) => {
      const ativo = telaPequena.matches;
      botoesAba.forEach((botao, i) => {
        botao.hidden = secoesAbas[i] === secaoEscala && !podeMostrarEscala();
        botao.setAttribute('aria-selected', String(i === indice));
        botao.tabIndex = i === indice ? 0 : -1;
      });
      secoesAbas.forEach((secao, i) => {
        if (ativo) {
          secao.setAttribute('role', 'tabpanel');
          secao.setAttribute('aria-labelledby', botoesAba[i].id);
          secao.hidden = botoesAba[i].hidden || i !== indice;
        } else {
          secao.removeAttribute('role');
          secao.setAttribute('aria-labelledby', rotulosOriginais[i]);
          secao.hidden = botoesAba[i].hidden;
        }
      });
      if (focar) botoesAba[indice].focus();
    };

    const abaAtual = () => Math.max(0, botoesAba.findIndex(botao => botao.getAttribute('aria-selected') === 'true'));

    listaAbas.addEventListener('click', evento => {
      const botao = evento.target.closest('[role="tab"]');
      if (botao) escolherAba(botoesAba.indexOf(botao));
    });

    listaAbas.addEventListener('keydown', evento => {
      const atual = botoesAba.indexOf(document.activeElement);
      if (atual === -1) return;
      const visiveis = botoesAba.map((botao, indice) => botao.hidden ? -1 : indice).filter(indice => indice >= 0);
      const posicao = visiveis.indexOf(atual);
      const total = visiveis.length;
      const destino = visiveis[{ ArrowRight: (posicao + 1) % total, ArrowLeft: (posicao - 1 + total) % total, Home: 0, End: total - 1 }[evento.key]];
      if (destino === undefined) return;
      evento.preventDefault();
      escolherAba(destino, true);
    });

    if (secaoEscala) {
      const atualizarAviso = () => {
        aviso.hidden = !podeMostrarEscala();
        const estado = obterEstado();
        const rotulos = DIAS_SEMANA.map(dia => obterRotuloLacuna(dia, estado));
        const semTurnos = rotulos.filter(rotulo => rotulo === 'Sem turnos').length;
        const comLacunas = rotulos.filter(rotulo => rotulo === 'Parcial' || rotulo === 'Descoberto').length;
        const eventual = core.obterNecessidadeAcompanhamento(estado) === core.ACOMPANHAMENTO.eventual;
        const tipo = comLacunas ? 'atencao' : semTurnos || eventual ? 'neutro' : 'ok';
        const textos = [];
        if (comLacunas) textos.push(`${comLacunas} ${comLacunas === 1 ? 'dia' : 'dias'} com horário sem cobertura`);
        if (semTurnos && !eventual) textos.push(`${semTurnos} ${semTurnos === 1 ? 'dia' : 'dias'} sem turnos cadastrados`);
        aviso.dataset.tipo = tipo;
        aviso.querySelector('[data-aviso-icone]').innerHTML = { atencao: ICONE_ATENCAO, neutro: ICONE_NEUTRO, ok: ICONE_OK }[tipo];
        aviso.querySelector('[data-aviso-texto]').textContent = semTurnos === DIAS_SEMANA.length
          ? 'Ainda não há turnos cadastrados nesta semana.'
          : textos.join(' · ') || (eventual ? 'Os turnos pontuais aparecem no dia combinado.' : 'Os turnos previstos para a semana têm alguém escalado.');
      };
      aviso.querySelector('.inicio__aviso-acao').addEventListener('click', () => {
        escolherAba(secoesAbas.indexOf(secaoEscala), true);
      });
      window.addEventListener('mutirao:cuidado-atualizado', atualizarAviso);
      atualizarAviso();
    } else {
      aviso.hidden = true;
    }
    escolherAba(0);
    window.addEventListener('mutirao:cuidado-atualizado', () => {
      const indice = abaAtual();
      escolherAba(secoesAbas[indice] === secaoEscala && !podeMostrarEscala() ? 0 : indice);
    });
    telaPequena.addEventListener('change', () => escolherAba(abaAtual()));
  }
});
