(() => {
  const pagina = document.querySelector('[data-pagina-mvp="inicio"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const {
    HOJE,
    LACUNAS_TURNO,
    obterEstado,
    atualizarEstado,
    obterUsuarioAtual,
    escaparHtml,
    formatarData,
    formatarDataCurta,
    capitalizarPrimeira,
    obterLacunasDia,
    obterRotuloLacuna,
    construirLinhaDoTempoDia,
    aplicarIntervaloZe,
    formatarIntervaloTurno,
    extrairHorasTurno,
    anunciarStatus,
    obterDoses,
    obterCompartimentos,
    registrarDose,
    desfazerDose
  } = core;

  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const trilho = pagina.querySelector('[data-porta-remedios-trilho]');
  const horas = pagina.querySelector('[data-porta-remedios-horas]');
  const resumoPorta = pagina.querySelector('[data-porta-remedios-resumo]');
  const listaDias = pagina.querySelector('[data-semana]');
  const listaTurnos = pagina.querySelector('[data-turnos]');
  const faixaLacuna = pagina.querySelector('[data-inicio-lacuna]');
  const tituloLacuna = pagina.querySelector('[data-inicio-lacuna-titulo]');

  const HORA_REGISTRO = '12:04';
  const ESPERA_ANIMACAO = 900;
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  const aviso = document.createElement('div');
  aviso.className = 'aviso-remedio';
  aviso.setAttribute('role', 'status');
  aviso.hidden = true;
  aviso.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i><p data-aviso-texto></p>
    <button type="button" data-desfazer-remedio>Desfazer</button>
    <button type="button" data-fechar-aviso aria-label="Fechar aviso"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
  document.body.append(aviso);
  let timerAviso = null;
  let ultimaChave = null;

  const ordenarGrupos = grupos => [...grupos.filter(grupo => !grupo.completo), ...grupos.filter(grupo => grupo.completo)];

  const seloGrupo = grupo => {
    if (grupo.situacao === 'dado') return '<span class="selo selo--sucesso"><i class="fa-solid fa-check" aria-hidden="true"></i> Dados</span>';
    if (grupo.situacao === 'falta') return `<span class="selo selo--alerta"><i class="fa-regular fa-circle-xmark" aria-hidden="true"></i> Falta ${grupo.faltam}</span>`;
    if (grupo.situacao === 'agora') return '<span class="selo selo--info">Agora</span>';
    return '<span class="selo selo--neutro">Mais tarde</span>';
  };

  const rotuloPote = dose => {
    if (dose.estado !== 'administrado') return `${dose.nome}, ${dose.hora}. Marcar como dado`;
    const quem = dose.meu ? 'você' : dose.quem;
    return `${dose.nome}, dado por ${quem} às ${dose.horario}${dose.meu ? '. Toque para desfazer' : ''}`;
  };

  const montarPote = (dose, grupo) => {
    const aberto = dose.estado === 'administrado';
    const travado = aberto && !dose.meu;
    const quem = dose.meu ? 'Você' : dose.quem;
    return `<li class="pote${grupo.situacao === 'falta' && !aberto ? ' pote--falta' : ''}" data-aberto="${aberto}" data-chave="${escaparHtml(dose.chave)}">
      <button type="button" class="pote__botao" aria-pressed="${aberto}" aria-label="${escaparHtml(rotuloPote(dose))}"${travado ? ' aria-disabled="true"' : ''}>
        <span class="pote__dobradica" aria-hidden="true"></span>
        <span class="pote__bandeja" aria-hidden="true"><span class="pote__fundo"></span></span>
        <span class="pote__aberto" aria-hidden="true">
          <span class="pote__check"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="pote__remedio">${escaparHtml(dose.nome)}</span>
          <span class="pote__quem" data-pote-quem>${escaparHtml(quem || 'Você')}, ${escaparHtml(dose.horario || HORA_REGISTRO)}</span>
        </span>
        <span class="pote__tampa" aria-hidden="true">
          <span class="pote__brilho"></span>
          <span class="pote__comprimidos"><span></span><span></span><span></span></span>
          <span class="pote__fechado"><span class="pote__horario">${escaparHtml(grupo.hora)}</span><span class="pote__remedio">${escaparHtml(dose.nome)}</span></span>
        </span>
        <span class="pote__aba" aria-hidden="true"></span>
      </button>
      <span class="pote__nome">${escaparHtml(dose.nome)}</span>
    </li>`;
  };

  const montarGrupo = grupo => {
    const plural = grupo.itens.length === 1 ? 'remédio' : 'remédios';
    return `<section class="porta-remedios__grupo porta-remedios__grupo--${grupo.situacao}" id="compartimento-${grupo.hora}" data-hora="${grupo.hora}" aria-label="${grupo.hora}, ${grupo.itens.length} ${plural}">
      <div class="porta-remedios__grupo-titulo"><h3>${grupo.hora} · ${grupo.itens.length} ${plural}</h3><span data-selo-grupo>${seloGrupo(grupo)}</span></div>
      <ul class="porta-remedios__potes">${grupo.itens.map(dose => montarPote(dose, grupo)).join('')}</ul>
    </section>`;
  };

  const atualizarResumo = grupos => {
    const total = grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0);
    const dados = grupos.reduce((soma, grupo) => soma + grupo.itens.length - grupo.faltam, 0);
    resumoPorta.textContent = dados === total ? `${total} de ${total} dados · tudo certo por hoje` : `${dados} de ${total} dados · arraste para o lado`;
  };

  const obterResponsavelHorario = horaTexto => {
    const hora = parseInt(horaTexto, 10);
    if (Number.isNaN(hora)) return null;
    const linhaTempo = construirLinhaDoTempoDia(HOJE, obterEstado());
    const segmento = linhaTempo.find(item => {
      const partes = String(item.horario || '').match(/(\d{1,2})h\D+(\d{1,2})h/);
      if (!partes) return false;
      const inicio = Number(partes[1]);
      const fim = Number(partes[2]);
      return hora >= inicio && hora < fim;
    });
    if (!segmento || segmento.tipo === 'lacuna' || !segmento.pessoa?.nome) return null;
    return segmento.pessoa.nome;
  };

  const atualizarProximaMedicacao = grupos => {
    const proximo = grupos.find(grupo => !grupo.completo && grupo.momento !== 'passado') || grupos.find(grupo => !grupo.completo);
    const titulo = pagina.querySelector('[data-proxima-medicacao]');
    const responsavel = pagina.querySelector('[data-proxima-responsavel]');
    const bloco = titulo?.closest('.painel__bloco');
    const temaAcolhedor = document.documentElement.classList.contains('tema--acolhedor');
    if (!titulo || !responsavel) return;
    if (!proximo) {
      if (temaAcolhedor) {
        if (bloco) bloco.hidden = false;
        titulo.textContent = 'Todos os remédios de hoje foram dados';
        responsavel.textContent = 'Porta-remédios completo';
      } else if (bloco) {
        bloco.hidden = true;
      }
      return;
    }
    if (bloco) bloco.hidden = false;
    const pendentes = proximo.itens.filter(dose => dose.estado !== 'administrado');
    titulo.textContent = `${proximo.hora} · ${pendentes[0].nome}${pendentes.length > 1 ? ` e mais ${pendentes.length - 1}` : ''}`;
    const pessoaTurno = obterResponsavelHorario(proximo.hora);
    responsavel.textContent = pessoaTurno
      ? `Responsável: ${pessoaTurno}`
      : 'Sem responsável neste turno (horário sem cobertura)';
  };

  const marcarHoraAtiva = hora => {
    horas.querySelectorAll('button').forEach(botao => {
      botao.setAttribute('aria-pressed', String(botao.dataset.irCompartimento === hora));
    });
  };

  const renderizarPortaRemedios = () => {
    const grupos = obterCompartimentos();
    const ordenados = ordenarGrupos(grupos);
    atualizarResumo(grupos);
    atualizarProximaMedicacao(grupos);
    trilho.innerHTML = ordenados.map(montarGrupo).join('');
    horas.innerHTML = grupos.map(grupo => {
      const atributos = grupo.completo ? ' data-completo' : grupo.situacao === 'falta' ? ' data-falta' : '';
      const rotulo = grupo.completo ? ` aria-label="${grupo.hora}, todos dados"` : '';
      return `<button type="button" data-ir-compartimento="${grupo.hora}" aria-pressed="false"${atributos}${rotulo}>${grupo.hora}</button>`;
    }).join('');
    trilho.scrollLeft = 0;
    marcarHoraAtiva(ordenados[0]?.hora);
  };

  const atualizarGrupoNaTela = hora => {
    const grupos = obterCompartimentos();
    const grupo = grupos.find(item => item.hora === hora);
    const secao = trilho.querySelector(`[data-hora="${hora}"]`);
    atualizarResumo(grupos);
    atualizarProximaMedicacao(grupos);
    if (!grupo || !secao) return grupo;
    secao.className = `porta-remedios__grupo porta-remedios__grupo--${grupo.situacao}`;
    secao.querySelector('[data-selo-grupo]').innerHTML = seloGrupo(grupo);
    return grupo;
  };

  const reposicionarGrupos = () => {
    const mover = () => renderizarPortaRemedios();
    if (document.startViewTransition && !reduzirMovimento.matches) document.startViewTransition(mover);
    else mover();
  };

  const mostrarAviso = (texto, chave) => {
    ultimaChave = chave;
    aviso.querySelector('[data-aviso-texto]').textContent = texto;
    aviso.querySelector('[data-desfazer-remedio]').hidden = !chave;
    aviso.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { aviso.hidden = true; }, 6000);
  };

  const alternarPote = (pote, abrir) => {
    const chave = pote.dataset.chave;
    const [hora, nome] = chave.split('|');
    if (abrir) registrarDose(chave, { estado: 'administrado', quem: obterUsuarioAtual().nomeComApelido, horario: HORA_REGISTRO });
    else desfazerDose(chave);

    const dose = obterDoses().find(item => item.chave === chave);
    const botao = pote.querySelector('.pote__botao');
    pote.dataset.aberto = String(abrir);
    botao.setAttribute('aria-pressed', String(abrir));
    botao.setAttribute('aria-label', rotuloPote(dose));
    if (abrir) pote.classList.remove('pote--falta');

    const grupo = atualizarGrupoNaTela(hora);
    if (!abrir && grupo?.situacao === 'falta') pote.classList.add('pote--falta');
    if (abrir) mostrarAviso(`Remédio das ${hora} dado por você. A família vê na hora.`, chave);
    else mostrarAviso(`${nome} das ${hora} voltou para os pendentes.`, null);

    if (abrir && grupo?.completo) {
      const secao = trilho.querySelector(`[data-hora="${hora}"]`);
      setTimeout(() => {
        if (secao) secao.dataset.saindo = 'true';
        setTimeout(reposicionarGrupos, reduzirMovimento.matches ? 0 : 300);
      }, reduzirMovimento.matches ? 0 : ESPERA_ANIMACAO);
    }
  };

  const desfazer = chave => {
    if (!chave) return;
    const [hora] = chave.split('|');
    const pote = trilho.querySelector(`.pote[data-chave="${CSS.escape(chave)}"]`);
    const estavaCompleto = obterCompartimentos().find(grupo => grupo.hora === hora)?.completo;
    if (estavaCompleto || !pote) {
      desfazerDose(chave);
      reposicionarGrupos();
      trilho.querySelector(`.pote[data-chave="${CSS.escape(chave)}"] .pote__botao`)?.focus();
    } else {
      alternarPote(pote, false);
    }
    aviso.hidden = true;
  };

  trilho.addEventListener('click', evento => {
    const botao = evento.target.closest('.pote__botao');
    if (!botao || botao.getAttribute('aria-disabled') === 'true') return;
    const pote = botao.closest('.pote');
    alternarPote(pote, pote.dataset.aberto !== 'true');
  });

  aviso.addEventListener('click', evento => {
    if (evento.target.closest('[data-desfazer-remedio]')) desfazer(ultimaChave);
    if (evento.target.closest('[data-fechar-aviso]')) aviso.hidden = true;
  });

  horas.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-ir-compartimento]');
    if (!botao) return;
    const grupo = trilho.querySelector(`#compartimento-${botao.dataset.irCompartimento}`);
    if (!grupo) return;
    trilho.scrollTo({ left: grupo.offsetLeft });
    marcarHoraAtiva(botao.dataset.irCompartimento);
  });

  let quadroRolagem = 0;
  trilho.addEventListener('scroll', () => {
    cancelAnimationFrame(quadroRolagem);
    quadroRolagem = requestAnimationFrame(() => {
      const grupos = [...trilho.querySelectorAll('.porta-remedios__grupo')];
      const atual = grupos.reduce((maisPerto, grupo) => {
        const distancia = Math.abs(grupo.offsetLeft - trilho.scrollLeft);
        return distancia < maisPerto.distancia ? { grupo, distancia } : maisPerto;
      }, { grupo: grupos[0], distancia: Infinity }).grupo;
      if (atual) marcarHoraAtiva(atual.dataset.hora);
    });
  });

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

  const criarEtiquetaCobertura = (dia, estado) => {
    const rotulo = obterRotuloLacuna(dia, estado);
    const lacuna = rotulo !== 'Coberto';
    const parcial = rotulo === 'Parcial';
    const modificador = lacuna ? (parcial ? 'agenda__etiqueta--atencao' : 'agenda__etiqueta--alerta') : 'agenda__etiqueta--sucesso';
    const icone = lacuna ? (parcial ? 'icone-atencao.svg' : 'icone-sem-cobertura.svg') : 'icone-coberto.svg';
    return `<span class="agenda__etiqueta ${modificador}"><img alt="" src="assets/media/icones/${icone}">${rotulo}</span>`;
  };

  const renderizarEscala = () => {
    const estado = obterEstado();
    const inicioSemana = formatarData(DIAS_SEMANA[0], { day: 'numeric', month: 'short' });
    const fimSemana = formatarData(DIAS_SEMANA[6], { day: 'numeric', month: 'short' });
    const tituloEscala = pagina.querySelector('[data-titulo-escala]');
    if (tituloEscala) {
      tituloEscala.textContent = `Escala semanal · ${inicioSemana} a ${fimSemana}`;
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

    listaTurnos.innerHTML = construirLinhaDoTempoDia(diaSelecionado, estado).map(seg => (
      seg.tipo === 'lacuna'
        ? linhaDescoberto(seg.horario, diaSelecionado)
        : renderizarTurno(seg, diaSelecionado)
    )).join('');

    const lacunasHoje = obterLacunasDia(HOJE, estado);
    faixaLacuna.hidden = !lacunasHoje.length;
    if (lacunasHoje.length) {
      tituloLacuna.textContent = `${lacunasHoje[0].horario} · Turno sem cobertura`;
      const botaoCobrirLacuna = faixaLacuna.querySelector('[data-inicio-cobrir-lacuna]');
      if (botaoCobrirLacuna) {
        botaoCobrirLacuna.dataset.dia = HOJE;
        botaoCobrirLacuna.dataset.horario = lacunasHoje[0].horario;
      }
    }
  };

  const dialogoEditarCobertura = document.getElementById('dialogo-editar-cobertura');
  const dialogoCobrirHorario = document.getElementById('dialogo-cobrir-horario');

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

  dialogoEditarCobertura?.addEventListener('change', evento => {
    atualizarPreviaCobertura(evento.target.name === 'inicio');
  });

  dialogoCobrirHorario?.addEventListener('change', evento => {
    atualizarPreviaNovaCobertura(evento.target.name === 'inicio');
  });

  listaDias.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-dia-semana]');
    if (!botao) return;
    diaSelecionado = botao.dataset.diaSemana;
    renderizarEscala();
    listaDias.querySelector(`[data-dia-semana="${diaSelecionado}"]`)?.focus();
  });

  pagina.addEventListener('click', evento => {
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
          `${formatarDataCurta(diaTurno)} · Horário disponível para edição: ${String(limiteMinTurno).padStart(2, '0')}h às ${String(limiteMaxTurno).padStart(2, '0')}h`;
        const form = dialogoEditarCobertura.querySelector('[data-formulario-mvp="editar-cobertura"]');
        popularOpcoesHorario(form.elements.inicio, limiteMinTurno, limiteMaxTurno - 1, atualInicio);
        popularOpcoesHorario(form.elements.fim, atualInicio + 1, limiteMaxTurno, atualFim);
        atualizarPreviaCobertura();
        dialogoEditarCobertura.showModal();
      }
      return;
    }

    if (botao.hasAttribute('data-cancelar-cobertura')) {
      atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, limiteMinTurno, limiteMaxTurno, 0, 0));
      botao.closest('dialog')?.close();
      anunciarStatus(elementoStatus, 'Cobertura do turno cancelada. O horário ficou disponível para a rede.');
      renderizarEscala();
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
    }
  });

  pagina.querySelector('[data-formulario-mvp="cobertura"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const { inicio: gapInicio, fim: gapFim } = extrairHorasTurno(horarioTurno);
    const cobrirTudo = form.elements.cobrirTudo?.checked;
    const inicio = cobrirTudo ? gapInicio : Number(form.elements.inicio.value);
    const fim = cobrirTudo ? gapFim : Number(form.elements.fim.value);

    atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, gapInicio, gapFim, inicio, fim));
    diaSelecionado = diaTurno;
    form.closest('dialog')?.close();
    anunciarStatus(elementoStatus, `Turno das ${String(inicio).padStart(2, '0')}h às ${String(fim).padStart(2, '0')}h assumido por ${obterUsuarioAtual().nome}.`);
    renderizarEscala();
    listaDias.querySelector(`[data-dia-semana="${diaSelecionado}"]`)?.focus();
  });

  pagina.querySelector('[data-formulario-mvp="editar-cobertura"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const inicio = Number(form.elements.inicio.value);
    const fim = Number(form.elements.fim.value);
    const duracao = fim - inicio;
    if (!Number.isInteger(inicio) || !Number.isInteger(fim) || duracao < 1 || inicio < limiteMinTurno || fim > limiteMaxTurno) {
      anunciarStatus(elementoStatus, 'Selecione horários dentro da janela disponível deste turno.');
      return;
    }
    atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, limiteMinTurno, limiteMaxTurno, inicio, fim));
    form.closest('dialog')?.close();
    anunciarStatus(elementoStatus, `Cobertura atualizada para ${formatarIntervaloTurno(inicio, duracao)}.`);
    renderizarEscala();
  });

  pagina.querySelector('[data-formulario-mvp="relato"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const campos = Object.fromEntries(new FormData(form));
    const relato = (campos.relato || '').trim();
    if (!relato) return;

    atualizarEstado(estado => ({
      ...estado,
      reports: {
        ...estado.reports,
        [HOJE]: [
          [
            obterUsuarioAtual().nome,
            `${obterUsuarioAtual().papel} · Registro do turno 07h–12h`,
            campos.tarefa ? `Tarefa relacionada · ${campos.tarefa}` : 'Registro de cuidado',
            relato,
            (campos.recado || '').trim()
          ],
          ...(estado.reports?.[HOJE] || [])
        ]
      }
    }));

    form.reset();
    form.closest('dialog')?.close();
    anunciarStatus(elementoStatus, 'Relato salvo no diário de turno da Mari.');
  });

  const sincronizarRedeInicio = () => {
    const usuario = obterUsuarioAtual();
    const itensRede = pagina.querySelectorAll('#titulo-rede ~ ul .painel__item');
    const itemUsuario = itensRede[itensRede.length - 1];
    if (itemUsuario) {
      const img = itemUsuario.querySelector('img');
      const nomeEl = itemUsuario.querySelector('strong');
      const papelEl = itemUsuario.querySelector('.painel__texto > span');
      if (img) img.src = usuario.avatar;
      if (nomeEl) nomeEl.textContent = usuario.nomeComApelido;
      if (papelEl) papelEl.textContent = `${usuario.papel} · ${usuario.vinculo}`;
    }
  };

  renderizarPortaRemedios();
  renderizarEscala();
  sincronizarRedeInicio();

  new MutationObserver(() => {
    atualizarProximaMedicacao(obterCompartimentos());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
