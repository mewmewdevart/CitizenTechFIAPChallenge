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

  const HORA_REGISTRO = '11:58';
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
    if (dose.estado !== 'administrado') return `${dose.nome}, ${dose.hora}. Ver detalhes e registrar administração`;
    const quem = dose.meu ? 'você' : dose.quem;
    return `${dose.nome}, dado por ${quem} às ${dose.horario}. Ver detalhes`;
  };

  const formatarHoraCurtaPote = horario => {
    const texto = String(horario || HORA_REGISTRO).trim();
    return texto.includes(':') ? texto.replace(':', 'h') : texto;
  };

  const obterTextoBadgePote = (dose, grupo) => {
    if (dose?.estado === 'administrado') {
      return `Administrado às ${formatarHoraCurtaPote(dose.horario)}`;
    }
    if (dose?.estado === 'nao-administrado' || grupo?.situacao === 'falta') {
      return 'Atrasado';
    }
    if (grupo?.situacao === 'agora') {
      return 'Pendente';
    }
    return `Previsto · ${dose?.hora || grupo?.hora || ''}`;
  };

  const obterIconeStatusPote = (aberto, atrasado) => {
    if (aberto) return '<i class="fa-solid fa-check" aria-hidden="true"></i>';
    if (atrasado) return '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>';
    return '<i class="fa-regular fa-clock" aria-hidden="true"></i>';
  };

  const montarPote = (dose, grupo) => {
    const aberto = dose.estado === 'administrado';
    const pendente = !aberto && (dose.estado === 'nao-administrado' || grupo.situacao === 'falta');
    const textoBadge = obterTextoBadgePote(dose, grupo);
    const iconeStatus = obterIconeStatusPote(aberto, pendente);
    return `<li class="pote${pendente ? ' pote--falta' : ''}" data-aberto="${aberto}" data-chave="${escaparHtml(dose.chave)}">
      <button type="button" class="pote__botao" aria-label="${escaparHtml(rotuloPote(dose))}">
        <span class="pote__tampa" aria-hidden="true">
          <span class="pote__brilho"></span>
        </span>
        <span class="pote__dobradica" aria-hidden="true"></span>
        <span class="pote__bandeja" aria-hidden="true">
          <span class="pote__fundo"></span>
          <span class="pote__conteudo">
            <span class="pote__status-icone" data-pote-icone>${iconeStatus}</span>
            <span class="pote__remedio">${escaparHtml(dose.nome)}</span>
            <span class="pote__horario-info">${escaparHtml(grupo.hora)}</span>
            ${!aberto ? '<span class="pote__comprimidos"><span></span><span></span><span></span></span>' : ''}
            <span class="pote__status-badge" data-pote-badge>${escaparHtml(textoBadge)}</span>
          </span>
        </span>
        <span class="pote__aba" aria-hidden="true"></span>
      </button>
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
    resumoPorta.textContent = dados === total
      ? `${total} de ${total} administrados · tudo certo por hoje`
      : `${dados} de ${total} administrados · deslize para ver mais`;
  };

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
    alerta.hidden = !baixos.length;
    if (baixos.length) {
      const principal = baixos[0];
      const dias = Math.floor(principal.estoque / principal.consumoDia);
      alerta.querySelector('strong').textContent = `Estoque baixo · ${principal.nome}`;
      alerta.querySelector('.faixa-alerta__texto > span').textContent =
        `${principal.estoque} ${principal.estoque === 1 ? 'unidade' : 'unidades'} · Previsão para ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    }
  };

  atualizarAlertaEstoqueInicio();
  window.addEventListener('mutirao:cuidado-atualizado', atualizarAlertaEstoqueInicio);

  const atualizarProximoCompromisso = () => {
    const modelo = pagina.querySelector('[data-proximo-compromisso]');
    const resumo = modelo?.closest('.inicio__resumo');
    if (!modelo || !resumo) return;

    resumo.querySelectorAll('[data-compromisso-extra]').forEach(el => el.remove());

    const compromissos = core.obterCompromissos().filter(item => item.dia === HOJE);
    const preencherBloco = (bloco, item, indice) => {
      const pessoa = item ? core.resolverPessoaRede(item.acompanhante || item.criadoPor) : null;
      const avatar = bloco.querySelector('.avatar');
      if (avatar) {
        avatar.src = pessoa ? pessoa.src : 'assets/media/mascotes/icone-mascote-espeto.svg';
      }
      const rotulo = bloco.querySelector('.inicio__rotulo');
      if (rotulo) {
        rotulo.textContent = indice === 0 ? 'Próximo compromisso' : 'Compromisso agendado';
      }
      bloco.querySelector('strong').textContent = item
        ? `${item.dia === HOJE ? '' : core.formatarDataCurta(item.dia) + ' · '}${item.hora.replace(':00', 'h')} · ${item.titulo}`
        : 'Nenhum compromisso agendado';
      bloco.querySelector('[data-compromisso-detalhes]').textContent = item
        ? [item.local, item.acompanhante && `${item.acompanhante} acompanha`].filter(Boolean).join(' · ')
        : 'Consulte a Agenda para organizar os próximos cuidados.';
      bloco.querySelector('a').href = item ? `agenda.html?dia=${encodeURIComponent(item.dia)}` : 'agenda.html';
    };

    if (!compromissos.length) {
      preencherBloco(modelo, null, 0);
      return;
    }

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
    if (bloco) bloco.hidden = false;
    if (!proximo) {
      titulo.textContent = 'Nenhuma dose futura pendente';
      const temPendencias = grupos.some(grupo => !grupo.completo);
      responsavel.textContent = temPendencias ? 'Consulte os registros de hoje.' : 'Porta-remédios completo';
      return;
    }
    const pendentes = proximo.itens.filter(dose => dose.estado === 'prevista');
    titulo.textContent = pendentes.length > 1
      ? `${proximo.hora} · ${pendentes.length} medicamentos previstos (${pendentes[0].nome} + ${pendentes.length - 1})`
      : `${proximo.hora} · ${pendentes[0].nome}`;
    const pessoaTurno = proximo.responsavel;
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

  const alternarPote = (pote, abrir, horarioInformado = HORA_REGISTRO) => {
    const chave = pote.dataset.chave;
    const [hora, nome] = chave.split('|');
    const horario = horarioInformado || HORA_REGISTRO;
    if (abrir) registrarDose(chave, { estado: 'administrado', quem: obterUsuarioAtual().nomeComApelido, horario });
    else desfazerDose(chave);

    const dose = obterDoses().find(item => item.chave === chave);
    const botao = pote.querySelector('.pote__botao');
    const iconeEl = pote.querySelector('[data-pote-icone]');
    const badgeEl = pote.querySelector('[data-pote-badge]');
    const grupoAtual = obterCompartimentos().find(item => item.hora === hora);
    const atrasado = !abrir && (dose?.estado === 'nao-administrado' || grupoAtual?.situacao === 'falta');
    if (iconeEl) {
      iconeEl.innerHTML = obterIconeStatusPote(abrir, atrasado);
    }
    if (badgeEl && dose) {
      badgeEl.textContent = obterTextoBadgePote(dose, grupoAtual);
    }
    const comprimidosEl = pote.querySelector('.pote__comprimidos');
    if (!abrir && !comprimidosEl && badgeEl) {
      const novoComprimidos = document.createElement('span');
      novoComprimidos.className = 'pote__comprimidos';
      novoComprimidos.innerHTML = '<span></span><span></span><span></span>';
      badgeEl.before(novoComprimidos);
    } else if (abrir && comprimidosEl) {
      comprimidosEl.remove();
    }
    pote.dataset.aberto = String(abrir);
    botao.setAttribute('aria-label', rotuloPote(dose));
    if (abrir) pote.classList.remove('pote--falta');

    const grupo = atualizarGrupoNaTela(hora);
    if (!abrir && (dose?.estado === 'nao-administrado' || grupo?.situacao === 'falta')) {
      pote.classList.add('pote--falta');
    }
    if (abrir) mostrarAviso(`Remédio das ${hora} dado por você às ${horario}. A família vê na hora.`, chave);
    else mostrarAviso(`${nome} das ${hora} voltou para os pendentes.`, null);

    if (abrir && grupo?.completo) {
      const secao = trilho.querySelector(`[data-hora="${hora}"]`);
      setTimeout(() => {
        if (secao) secao.dataset.saindo = 'true';
        setTimeout(reposicionarGrupos, reduzirMovimento.matches ? 0 : 300);
      }, reduzirMovimento.matches ? 0 : ESPERA_ANIMACAO);
    }
  };

  const dialogoDetalhePote = document.getElementById('dialogo-detalhe-pote');
  let chavePoteEmFoco = null;

  const abrirDetalhesPote = chave => {
    const dose = obterDoses().find(item => item.chave === chave);
    if (!dose || !dialogoDetalhePote) return;
    chavePoteEmFoco = chave;
    const grupo = obterCompartimentos().find(item => item.hora === dose.hora);
    const pessoa = core.nomePessoaAcompanhada();

    const tituloEl = dialogoDetalhePote.querySelector('[data-pote-titulo]');
    const contextoEl = dialogoDetalhePote.querySelector('[data-pote-contexto]');
    const avatarEl = dialogoDetalhePote.querySelector('[data-pote-avatar]');
    const estadoTituloEl = dialogoDetalhePote.querySelector('[data-pote-estado-titulo]');
    const estadoDetalheEl = dialogoDetalhePote.querySelector('[data-pote-estado-detalhe]');
    const estadoSeloEl = dialogoDetalhePote.querySelector('[data-pote-estado-selo]');
    const formRegistrar = dialogoDetalhePote.querySelector('[data-formulario-mvp="registrar-pote"]');
    const acoesRegistrado = dialogoDetalhePote.querySelector('[data-pote-acoes-registrado]');
    const botaoDesfazer = dialogoDetalhePote.querySelector('[data-pote-desfazer]');

    if (tituloEl) tituloEl.textContent = `${dose.hora} · ${dose.nome}`;
    if (contextoEl) contextoEl.textContent = `${pessoa} · Dose prevista para ${dose.hora}`;

    const administrada = dose.estado === 'administrado';
    const naoAdministrada = dose.estado === 'nao-administrado';
    const nomePessoaRegistro = dose.meu
      ? obterUsuarioAtual().nomeComApelido
      : (dose.quem || grupo?.responsavel || '');
    const pessoaRede = core.resolverPessoaRede(nomePessoaRegistro);

    if (avatarEl) {
      if (pessoaRede?.src) {
        avatarEl.src = pessoaRede.src;
        avatarEl.hidden = false;
      } else {
        avatarEl.src = 'assets/media/mascotes/icone-mascote-cubado.svg';
        avatarEl.hidden = !nomePessoaRegistro;
      }
    }

    if (administrada) {
      const nomeExibido = dose.meu ? `${obterUsuarioAtual().nomeComApelido} (Você)` : (pessoaRede?.nome || dose.quem || 'Cuidador');
      if (estadoTituloEl) estadoTituloEl.textContent = nomeExibido;
      if (estadoDetalheEl) estadoDetalheEl.textContent = `Dose administrada${dose.horario ? ` às ${dose.horario.replace(':', 'h')}` : ''}.`;
      if (estadoSeloEl) {
        estadoSeloEl.className = 'selo selo--sucesso';
        estadoSeloEl.textContent = 'Administrada';
      }
    } else if (naoAdministrada) {
      const nomeExibido = pessoaRede?.nome || dose.quem || grupo?.responsavel || 'Sem responsável';
      if (estadoTituloEl) estadoTituloEl.textContent = nomeExibido;
      if (estadoDetalheEl) estadoDetalheEl.textContent = dose.motivo || 'Ocorrência registrada sem motivo informado.';
      if (estadoSeloEl) {
        estadoSeloEl.className = 'selo selo--alerta';
        estadoSeloEl.textContent = 'Atrasado';
      }
    } else {
      const nomeExibido = pessoaRede?.nome || grupo?.responsavel || 'Horário sem cobertura';
      if (estadoTituloEl) estadoTituloEl.textContent = nomeExibido;
      if (estadoDetalheEl) {
        estadoDetalheEl.textContent = grupo?.responsavel
          ? 'Responsável pelo turno · Aguardando administração.'
          : 'Horário sem responsável definido na escala.';
      }
      if (estadoSeloEl) {
        estadoSeloEl.className = 'selo selo--neutro';
        estadoSeloEl.textContent = 'Prevista';
      }
    }

    dialogoDetalhePote.querySelectorAll('[data-pote-link-medicamentos]').forEach(link => {
      link.href = administrada
        ? 'medicamentos.html#registros-de-hoje'
        : `medicamentos.html?dose=${encodeURIComponent(dose.chave)}`;
    });

    if (formRegistrar) {
      formRegistrar.hidden = administrada;
      if (!administrada && formRegistrar.elements.horario) {
        formRegistrar.elements.horario.value = HORA_REGISTRO;
      }
    }
    if (acoesRegistrado) acoesRegistrado.hidden = !administrada;
    if (botaoDesfazer) botaoDesfazer.hidden = !(administrada && dose.meu);

    dialogoDetalhePote.showModal();
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
    if (!botao) return;
    const pote = botao.closest('.pote');
    if (pote?.dataset.chave) abrirDetalhesPote(pote.dataset.chave);
  });

  dialogoDetalhePote?.querySelector('[data-formulario-mvp="registrar-pote"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    if (!chavePoteEmFoco) return;
    const horario = evento.target.elements.horario?.value || HORA_REGISTRO;
    const pote = trilho.querySelector(`.pote[data-chave="${CSS.escape(chavePoteEmFoco)}"]`);
    if (pote) alternarPote(pote, true, horario);
    dialogoDetalhePote.close();
  });

  dialogoDetalhePote?.querySelector('[data-pote-desfazer]')?.addEventListener('click', () => {
    if (!chavePoteEmFoco) return;
    desfazer(chavePoteEmFoco);
    dialogoDetalhePote.close();
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

  const atualizarTurnoAtual = () => {
    const bloco = pagina.querySelector('[data-turno-atual]');
    if (!bloco) return;
    const estado = obterEstado();
    const linhaTempo = construirLinhaDoTempoDia(HOJE, estado);
    const turnoAtual = linhaTempo.find(seg => seg.tipo === 'turno' && 11 >= seg.inicio && 11 < seg.fim);
    const lacunasHoje = obterLacunasDia(HOJE, estado);
    const avatar = bloco.querySelector('.avatar');
    const titulo = bloco.querySelector('[data-turno-atual-titulo]');
    const detalhe = bloco.querySelector('[data-turno-atual-detalhe]');
    const link = bloco.querySelector('a');

    if (avatar && turnoAtual?.pessoa) {
      avatar.src = turnoAtual.pessoa.foto || `assets/media/mascotes/${turnoAtual.pessoa.avatar || 'icone-mascote-trevo.svg'}`;
    }
    if (titulo) {
      titulo.textContent = turnoAtual
        ? `${turnoAtual.horario} · ${turnoAtual.pessoa.nome}`
        : '11h · Sem cobertura no momento';
    }
    if (detalhe) {
      const proximaLacuna = lacunasHoje[0];
      detalhe.textContent = proximaLacuna
        ? `Cobertura ativa agora · Próximo turno sem cobertura: ${proximaLacuna.horario}`
        : 'Cobertura ativa agora · Todos os turnos de hoje cobertos';
    }
    if (link) link.href = `agenda.html?dia=${encodeURIComponent(HOJE)}`;
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
    atualizarTurnoAtual();
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
      const confirmado = await core.confirmarAcao({
        titulo: 'Cancelar cobertura',
        descricao: 'Cancelar a cobertura e deixar o intervalo disponível para a rede?',
        confirmarTexto: 'Cancelar cobertura'
      });
      if (!confirmado) return;
      atualizarEstado(estado => aplicarIntervaloZe(estado, diaTurno, limiteMinTurno, limiteMaxTurno, 0, 0));
      botao.closest('dialog')?.close();
      anunciarStatus(elementoStatus, 'Cobertura do turno cancelada. O horário ficou disponível para a rede.');
      renderizarEscala();
      return;
    }

    if (botao.dataset.dialogo === 'dialogo-passagem-cuidado') {
      sincronizarDialogoPassagem();
    }

    if (botao.dataset.passagemEtapa) {
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
          if (ctx) ctx.textContent = `Otorrinolaringologia · ${pessoa}`;
          if (avatar) avatar.src = usuarioAtual.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg';
          if (resp) resp.textContent = usuarioAtual.nomeComApelido;
          if (papel) papel.textContent = `${usuarioAtual.papel} · ${usuarioAtual.vinculo || 'Neto'}`;
        }
        if (proximo.id === 'dialogo-cadastrar-consulta') {
          const ctx = proximo.querySelector('[data-consulta-contexto]');
          if (ctx) ctx.textContent = `Otorrinolaringologia · ${pessoa}`;
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
    const usuarioAtual = obterUsuarioAtual();
    const nomeCurto = usuarioAtual.apelido || usuarioAtual.nome;
    anunciarStatus(elementoStatus, {
      titulo: 'Horário assumido',
      descricao: `${core.nomePessoaAcompanhada()} · ${nomeCurto} assumiu ${String(inicio).padStart(2, '0')}h–${String(fim).padStart(2, '0')}h.`,
      avatar: usuarioAtual.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg'
    });
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

  const popularTarefasRelato = () => {
    const select = pagina.querySelector('[data-select-tarefas-relato]');
    if (!select) return;
    const estado = obterEstado();
    const dosesHoje = obterDoses().slice(0, 6).map(dose => `${dose.hora} · ${dose.nome}`);
    const compromissos = (core.obterCompromissos ? core.obterCompromissos(estado) : [])
      .slice(0, 4)
      .map(evt => `${evt.titulo} (${core.formatarDataCurta ? core.formatarDataCurta(evt.dia) : evt.dia})`);
    const rotina = [
      'Administrar medicamentos do turno',
      'Acompanhar hidratação e alimentação',
      'Retirar medicamento na UBS',
      'Conferir estoque de medicamentos',
      'Organizar documentos da consulta'
    ];
    const montarGrupoOpt = (rotulo, itens) => itens.length
      ? `<optgroup label="${escaparHtml(rotulo)}">${itens.map(item => `<option value="${escaparHtml(item)}">${escaparHtml(item)}</option>`).join('')}</optgroup>`
      : '';
    select.innerHTML = `<option value="">Selecione uma tarefa</option>${montarGrupoOpt('Medicamentos de hoje', dosesHoje)}${montarGrupoOpt('Agenda e compromissos', compromissos)}${montarGrupoOpt('Rotina de cuidado', rotina)}`;
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
              `Compromisso agendado · ${tituloEvento}`,
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
      if (espelharFicha) atualizarPassagemCuidado();
      abrirConfirmacao({
        titulo: 'Compromisso salvo na Agenda',
        contexto: `${pessoa} · Agenda de cuidado`,
        resumo: `${tituloEvento} · ${formatarDataCurta(diaEvento)} às ${horaEvento.replace(':00', 'h')}`,
        detalhe: `Registro por ${usuario.nomeComApelido} · ${espelharFicha ? 'Disponível na Agenda e na Ficha.' : 'Disponível na Agenda.'}`,
        href: `agenda.html?dia=${encodeURIComponent(diaEvento)}&compromisso=${encodeURIComponent(novoEvento.id)}`,
        rotuloLink: 'Ver na Agenda'
      });
      return;
    }

    const relato = (campos.relato || '').trim();
    if (!relato) {
      anunciarStatus(elementoStatus, 'Descreva o relato do turno antes de salvar.');
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
            campos.tarefa ? `Tarefa relacionada · ${campos.tarefa}` : 'Registro de cuidado',
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
    atualizarPassagemCuidado();
    abrirConfirmacao({
      titulo: 'Relato registrado',
      contexto: `${pessoa} · Diário de turno`,
      resumo: turno || 'Registro geral (sem turno)',
      detalhe: `Registro por ${usuario.nomeComApelido} · Disponível na ficha da ${pessoa}.`,
      href: 'ficha.html#diario',
      rotuloLink: 'Ver diário na ficha'
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
      if (botaoAssumir) botaoAssumir.hidden = false;
      if (linkVerConsulta) linkVerConsulta.hidden = true;
      if (tituloCaixa) tituloCaixa.textContent = 'Para o próximo turno';
      if (textoCaixa) {
        textoCaixa.textContent = `Agendar consulta de otorrinolaringologia para ${core.nomePessoaAcompanhada()}. Antes de agendar, confirmar a cobertura do convênio.`;
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
    const dia = (campos.dia || '2026-11-23').trim();
    const hora = (campos.hora || '14:00').trim();
    const local = (campos.local || 'Clínica do convênio').trim();
    const acompanhante = (campos.acompanhante || obterUsuarioAtual().nomeComApelido).trim();
    const titulo = 'Otorrinolaringologia';
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

  const sincronizarRedeInicio = () => {
    const estado = obterEstado();
    const usuario = obterUsuarioAtual(estado);
    const listaRede = pagina.querySelector('#titulo-rede ~ ul');
    const itensRede = listaRede?.querySelectorAll('.painel__item:not([data-convite-inicio])') || [];
    const itemUsuario = itensRede[itensRede.length - 1];
    if (itemUsuario) {
      const img = itemUsuario.querySelector('img');
      const nomeEl = itemUsuario.querySelector('strong');
      const papelEl = itemUsuario.querySelector('.painel__texto > span');
      if (img) img.src = usuario.avatar;
      if (nomeEl) nomeEl.textContent = usuario.nomeComApelido;
      if (papelEl) papelEl.textContent = `${usuario.papel} · ${usuario.vinculo}`;
    }

    if (listaRede) {
      listaRede.querySelectorAll('[data-convite-inicio]').forEach(el => el.remove());
      for (const convite of estado.convites || []) {
        const li = document.createElement('li');
        li.className = 'painel__item';
        li.setAttribute('data-convite-inicio', '');
        li.innerHTML = `<span class="painel__icone" aria-hidden="true"><i class="fa-regular fa-envelope"></i></span><span class="painel__texto"><strong>${escaparHtml(convite.email)}</strong><span>Vínculo: ${escaparHtml(convite.vinculo)} · Papel: ${escaparHtml(convite.papel)} · Convite simulado</span></span>`;
        listaRede.append(li);
      }
    }

    const contextoRelato = pagina.querySelector('[data-contexto-relato-inicio]');
    const avatarRelato = pagina.querySelector('[data-relato-avatar]');
    if (avatarRelato) avatarRelato.src = usuario.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg';
    if (contextoRelato) {
      const linhaTempo = construirLinhaDoTempoDia(HOJE, obterEstado());
      const turnoAtual = linhaTempo.find(seg => seg.tipo === 'turno' && 11 >= seg.inicio && 11 < seg.fim);
      const responsavelTurno = turnoAtual?.pessoa?.nome || 'Beatriz da Silva (Bea)';
      const horarioTurnoAtual = turnoAtual?.horario || '07h–12h';
      contextoRelato.textContent = `Turno de ${responsavelTurno} · ${horarioTurnoAtual} · Registro por ${usuario.nomeComApelido}`;
    }
  };

  const atualizarPassagemCuidado = () => {
    const painelPassagem = pagina.querySelector('#titulo-passagem')?.closest('section');
    if (!painelPassagem) return;

    const estado = obterEstado();
    const diasComRelato = Object.keys(estado.reports || {})
      .filter(dia => Array.isArray(estado.reports[dia]) && estado.reports[dia].length > 0)
      .sort((a, b) => b.localeCompare(a));
    if (!diasComRelato.length) return;

    const diaMaisRecente = diasComRelato[0];
    const [nome, papel, , relato, proximo] = estado.reports[diaMaisRecente][0];
    const pessoa = resolverPessoaRede(nome, estado);
    const srcAvatar = pessoa?.foto || `assets/media/mascotes/${escaparHtml(pessoa?.avatar || 'icone-mascote-cubado.svg')}`;
    const dataFormatada = formatarData(diaMaisRecente, { day: 'numeric', month: 'short', year: 'numeric' });

    const imgAvatar = painelPassagem.querySelector('.painel__item img.avatar');
    const nomeEl = painelPassagem.querySelector('.painel__texto strong');
    const subtituloEl = painelPassagem.querySelector('.painel__texto span');
    const relatoEl = painelPassagem.querySelector('[data-passagem-relato], :scope > p');
    const notaEl = painelPassagem.querySelector('.passagem__nota');

    if (imgAvatar) imgAvatar.src = srcAvatar;
    if (nomeEl) nomeEl.textContent = nome;
    if (subtituloEl) {
      subtituloEl.innerHTML = `${escaparHtml(papel || '')}${papel ? ' - ' : ''}<time datetime="${escaparHtml(diaMaisRecente)}">${escaparHtml(dataFormatada)}</time>`;
    }
    if (relatoEl) relatoEl.innerHTML = sanitizarHtmlEditor(relato);
    if (notaEl) {
      const textoProximo = (proximo || '').trim();
      notaEl.hidden = !textoProximo;
      if (textoProximo) {
        const tituloNota = notaEl.querySelector('strong');
        const textoNota = notaEl.querySelector('span');
        if (tituloNota) tituloNota.textContent = 'Para o próximo turno';
        if (textoNota) textoNota.innerHTML = sanitizarHtmlEditor(textoProximo.replaceAll('\n', '<br>'));
      }
    }
  };

  renderizarPortaRemedios();
  renderizarEscala();
  sincronizarRedeInicio();
  atualizarPassagemCuidado();
  atualizarProximoCompromisso();
  window.addEventListener('mutirao:perfil-atualizado', () => {
    sincronizarRedeInicio();
    atualizarPassagemCuidado();
  });
})();
