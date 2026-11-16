(() => {
  const pagina = document.querySelector('[data-pagina-mvp="inicio"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const {
    HOJE,
    obterEstado,
    atualizarEstado,
    escaparHtml,
    formatarData,
    obterLacunasDia,
    obterRotuloLacuna,
    construirLinhaDoTempoDia,
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
  const listaDias = pagina.querySelector('[data-escala-dias]');
  const listaTurnos = pagina.querySelector('[data-escala-turnos]');
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

  const atualizarProximaMedicacao = grupos => {
    const proximo = grupos.find(grupo => !grupo.completo && grupo.momento !== 'passado') || grupos.find(grupo => !grupo.completo);
    const titulo = pagina.querySelector('[data-proxima-medicacao]');
    const responsavel = pagina.querySelector('[data-proxima-responsavel]');
    if (!titulo || !responsavel) return;
    if (!proximo) {
      titulo.textContent = 'Todos os remédios de hoje foram dados';
      responsavel.textContent = 'Porta-remédios completo';
      return;
    }
    const pendentes = proximo.itens.filter(dose => dose.estado !== 'administrado');
    titulo.textContent = `${proximo.hora} · ${pendentes[0].nome}${pendentes.length > 1 ? ` e mais ${pendentes.length - 1}` : ''}`;
    responsavel.textContent = `Responsável: ${proximo.responsavel}`;
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
    if (abrir) registrarDose(chave, { estado: 'administrado', quem: 'Zé da Manga (Zé)', horario: HORA_REGISTRO });
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
  const CLASSES_ROTULO = { Coberto: 'selo--info', Descoberto: 'selo--alerta', Parcial: 'selo--atencao' };
  const ICONES_ROTULO = { Coberto: 'fa-regular fa-circle-check', Descoberto: 'fa-regular fa-circle-xmark', Parcial: 'fa-solid fa-triangle-exclamation' };
  let diaSelecionado = HOJE;

  const rotuloDia = dia => {
    const semana = formatarData(dia, { weekday: 'short' }).replace('.', '');
    return `${semana.charAt(0).toUpperCase()}${semana.slice(1)} ${formatarData(dia, { day: '2-digit', month: '2-digit' })}`;
  };

  const formatarFaixa = horario => horario.replace('–', ' – ');

  const renderizarEscala = () => {
    const estado = obterEstado();
    listaDias.innerHTML = DIAS_SEMANA.map(dia => {
      const rotulo = obterRotuloLacuna(dia, estado);
      return `<button type="button" class="escala__dia" data-dia="${dia}" aria-pressed="${dia === diaSelecionado}">
        <span>${rotuloDia(dia)}</span>
        <span class="selo ${CLASSES_ROTULO[rotulo]}"><i class="${ICONES_ROTULO[rotulo]}" aria-hidden="true"></i> ${rotulo}</span>
      </button>`;
    }).join('');

    listaTurnos.innerHTML = construirLinhaDoTempoDia(diaSelecionado, estado).map(segmento => {
      if (segmento.tipo === 'lacuna') {
        return `<li class="faixa-alerta faixa-alerta--linha">
          <span class="faixa-alerta__icone" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>
          <span class="faixa-alerta__texto"><strong>${escaparHtml(segmento.horario)} · Turno sem cobertura</strong><span>A Maria não pode ficar sozinha!</span></span>
          <a class="botao botao--secundario" href="agenda.html">Cobrir horário</a>
        </li>`;
      }
      return `<li class="painel__item">
        <img class="avatar" src="assets/media/mascotes/${escaparHtml(segmento.pessoa.avatar)}" alt="">
        <span class="painel__texto"><strong>${escaparHtml(formatarFaixa(segmento.horario))}</strong><span>${escaparHtml(segmento.pessoa.nome)} · Coberto</span></span>
      </li>`;
    }).join('');

    const lacunasHoje = obterLacunasDia(HOJE, estado);
    faixaLacuna.hidden = !lacunasHoje.length;
    if (lacunasHoje.length) tituloLacuna.textContent = `${lacunasHoje[0].horario} · Turno sem cobertura`;
  };

  listaDias.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-dia]');
    if (!botao) return;
    diaSelecionado = botao.dataset.dia;
    renderizarEscala();
    listaDias.querySelector(`[data-dia="${diaSelecionado}"]`)?.focus();
  });

  pagina.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-fechar-dialogo]');
    if (botao) botao.closest('dialog')?.close();
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
            'Zé da Manga',
            'Administrador · Registro do turno 07h–12h',
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

  renderizarPortaRemedios();
  renderizarEscala();
})();
