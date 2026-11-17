(() => {
  const core = window.MutiraoCuidado;
  if (!core) return;

  const {
    escaparHtml,
    obterUsuarioAtual,
    obterDoses,
    obterCompartimentos,
    registrarDose,
    desfazerDose
  } = core;

  const HORA_REGISTRO = '11:58';
  const ESPERA_ANIMACAO = 900;
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

  const ordenarGrupos = grupos => [...grupos.filter(grupo => !grupo.completo), ...grupos.filter(grupo => grupo.completo)];

  const seloGrupo = grupo => {
    if (grupo.situacao === 'dado') return '<span class="selo selo--sucesso"><i class="fa-solid fa-check" aria-hidden="true"></i> Tudo dado</span>';
    if (grupo.situacao === 'falta') return `<span class="selo selo--alerta"><i class="fa-regular fa-circle-xmark" aria-hidden="true"></i> Falta ${grupo.faltam}</span>`;
    if (grupo.situacao === 'agora') return '<span class="selo selo--info">Agora</span>';
    return '<span class="selo selo--neutro">Mais tarde</span>';
  };

  const rotuloPote = dose => {
    if (dose.estado !== 'administrado') return `${dose.nome}, ${dose.hora}. Ver detalhes e marcar como dado`;
    const quem = dose.meu ? 'você' : dose.quem;
    return `${dose.nome}, dado por ${quem} às ${dose.horario}. Ver detalhes`;
  };

  const formatarHoraCurtaPote = horario => {
    const texto = String(horario || HORA_REGISTRO).trim();
    return texto.includes(':') ? texto.replace(':', 'h') : texto;
  };

  const obterTextoBadgePote = (dose, grupo) => {
    if (dose?.estado === 'administrado') {
      return `Dado às ${formatarHoraCurtaPote(dose.horario)}`;
    }
    if (dose?.estado === 'nao-administrado' || grupo?.situacao === 'falta') {
      return 'Atrasado';
    }
    if (grupo?.situacao === 'agora') {
      return 'Dar agora';
    }
    return `Para as ${dose?.hora || grupo?.hora || ''}`;
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

  const criarAviso = () => {
    const existente = document.querySelector('.aviso-remedio');
    if (existente) return existente;
    const aviso = document.createElement('div');
    aviso.className = 'aviso-remedio';
    aviso.setAttribute('role', 'status');
    aviso.hidden = true;
    aviso.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i><p data-aviso-texto></p>
      <button type="button" data-desfazer-remedio>Desfazer</button>
      <button type="button" data-fechar-aviso aria-label="Fechar aviso"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
    document.body.append(aviso);
    return aviso;
  };

  const montar = ({ raiz, dialogo: dialogoDetalhePote, aoMudar = () => {}, linkMedicamentos = true }) => {
    if (!raiz) return null;
    const trilho = raiz.querySelector('[data-porta-remedios-trilho]');
    const horas = raiz.querySelector('[data-porta-remedios-horas]');
    const resumoPorta = raiz.querySelector('[data-porta-remedios-resumo]');
    if (!trilho || !horas) return null;

    const aviso = criarAviso();
    let timerAviso = null;
    let ultimaChave = null;

    const atualizarResumo = grupos => {
      const total = grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0);
      const dados = grupos.reduce((soma, grupo) => soma + grupo.itens.length - grupo.faltam, 0);
      if (!resumoPorta) return;
      resumoPorta.textContent = dados === total
        ? `${total} de ${total} dados · tudo certo por hoje`
        : `${dados} de ${total} dados · arraste para o lado`;
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
      aoMudar(grupos);
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
      aoMudar(grupos);
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

    const alternarPote = (pote, abrir, horarioInformado = HORA_REGISTRO, origemExterna = '') => {
      const chave = pote.dataset.chave;
      const [hora, nome] = chave.split('|');
      const horario = horarioInformado || HORA_REGISTRO;
      if (abrir) registrarDose(chave, { estado: 'administrado', quem: obterUsuarioAtual().nomeComApelido, horario, origemExterna });
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
      else mostrarAviso(`${nome} das ${hora} voltou para a lista do que falta dar.`, null);

      if (abrir && grupo?.completo) {
        const secao = trilho.querySelector(`[data-hora="${hora}"]`);
        setTimeout(() => {
          if (secao) secao.dataset.saindo = 'true';
          setTimeout(reposicionarGrupos, reduzirMovimento.matches ? 0 : 300);
        }, reduzirMovimento.matches ? 0 : ESPERA_ANIMACAO);
      }
    };

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
      if (contextoEl) contextoEl.textContent = `${pessoa} · Remédio das ${dose.hora}`;

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
        if (estadoDetalheEl) estadoDetalheEl.textContent = `Remédio dado${dose.horario ? ` às ${dose.horario.replace(':', 'h')}` : ''}.`;
        if (estadoSeloEl) {
          estadoSeloEl.className = 'selo selo--sucesso';
          estadoSeloEl.textContent = 'Dado';
        }
      } else if (naoAdministrada) {
        const nomeExibido = pessoaRede?.nome || dose.quem || grupo?.responsavel || 'Sem responsável';
        if (estadoTituloEl) estadoTituloEl.textContent = nomeExibido;
        if (estadoDetalheEl) estadoDetalheEl.textContent = dose.motivo || 'Não foi dado, e ninguém disse por quê.';
        if (estadoSeloEl) {
          estadoSeloEl.className = 'selo selo--alerta';
          estadoSeloEl.textContent = 'Atrasado';
        }
      } else {
        const nomeExibido = pessoaRede?.nome || grupo?.responsavel || 'Horário sem ninguém';
        if (estadoTituloEl) estadoTituloEl.textContent = nomeExibido;
        if (estadoDetalheEl) {
          estadoDetalheEl.textContent = grupo?.responsavel
            ? 'Cuida nesse horário · Ainda não foi dado.'
            : 'Ninguém cuida nesse horário.';
        }
        if (estadoSeloEl) {
          estadoSeloEl.className = 'selo selo--neutro';
          estadoSeloEl.textContent = 'Para dar';
        }
      }

      dialogoDetalhePote.querySelectorAll('[data-pote-link-medicamentos]').forEach(link => {
        link.hidden = !linkMedicamentos;
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

      core.prepararOrigemEstoque(formRegistrar, dose);
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
      if (pote) alternarPote(pote, true, horario, evento.target.elements.origemExterna?.value.trim() || '');
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

    dialogoDetalhePote?.addEventListener('click', evento => {
      if (evento.target.closest('[data-fechar-dialogo]')) dialogoDetalhePote.close();
    });

    renderizarPortaRemedios();
    return { renderizar: renderizarPortaRemedios };
  };

  window.MutiraoPortaRemedios = { montar };
})();
