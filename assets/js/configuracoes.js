window.MutiraoCuidadoPronto.then(core => {
  if (!core) return;
  'use strict';

  const formulario = document.querySelector('#formulario-configuracoes');
  if (!formulario) return;

  const statusEl = document.querySelector('#configuracoes-status');
  const abas = [...formulario.querySelectorAll('[role="tab"]')];
  const paineis = [...formulario.querySelectorAll('[role="tabpanel"]')];
  const botaoRestaurar = formulario.querySelector('[data-restaurar-padroes]');
  const botaoAcessibilidade = document.querySelector('[data-abrir-acessibilidade]');
  const botaoExportar = document.querySelector('[data-exportar-resumo]');
  const botaoAbrirSairRede = document.querySelector('[data-abrir-sair-rede]');
  const dialogoSairRede = document.querySelector('#dialogo-sair-rede');
  const botaoConfirmarSair = dialogoSairRede?.querySelector('[data-confirmar-sair-rede]');
  const botaoFecharDialogo = dialogoSairRede?.querySelector('[data-fechar-dialogo]');

  const CHAVE_CONFIG_SESSAO = 'mutirao-configuracoes-sessao-v1';
  const botaoSalvar = formulario.querySelector('button[type="submit"]');
  const rodapeFormulario = formulario.querySelector('.configuracoes__rodape');
  const ABAS_COM_FORMULARIO = new Set(['painel-notificacoes', 'painel-rede']);

  let timerStatus = null;
  let snapshotSalvo = '';

  const carregarPreferenciasSessao = () => {
    try {
      const bruto = sessionStorage.getItem(CHAVE_CONFIG_SESSAO);
      if (!bruto) return;
      const dados = JSON.parse(bruto);
      for (const campo of formulario.querySelectorAll('input, select')) {
        const chave = campo.name || campo.id;
        if (!chave || !(chave in dados)) continue;
        if (campo.type === 'checkbox' || campo.type === 'radio') {
          campo.checked = chave === 'assumirTurnoDireto' ? dados[chave] === false : Boolean(dados[chave]);
        } else {
          campo.value = String(dados[chave]);
        }
      }
    } catch {
      // Ignora erro caso sessionStorage esteja indisponível
    }
  };

  const salvarPreferenciasSessao = () => {
    try {
      const dados = {};
      for (const campo of formulario.querySelectorAll('input, select')) {
        const chave = campo.name || campo.id;
        if (!chave) continue;
        dados[chave] = chave === 'assumirTurnoDireto'
          ? !campo.checked
          : campo.type === 'checkbox' || campo.type === 'radio' ? campo.checked : campo.value;
      }
      sessionStorage.setItem(CHAVE_CONFIG_SESSAO, JSON.stringify(dados));
    } catch {
      mostrarStatus('Não foi possível salvar. Suas alterações continuam no formulário.', 'erro');
      return false;
    }
    return true;
  };

  const serializarEstadoFormulario = () => {
    const campos = [...formulario.querySelectorAll('input, select, textarea')];
    return JSON.stringify(
      campos.map(campo => ({
        chave: campo.id || campo.name || '',
        tipo: campo.type,
        valor: campo.type === 'checkbox' || campo.type === 'radio' ? campo.checked : campo.value
      }))
    );
  };

  const atualizarEstadoBotaoSalvar = () => {
    if (!botaoSalvar) return;
    const semAlteracoes = serializarEstadoFormulario() === snapshotSalvo;
    botaoSalvar.disabled = semAlteracoes;
    botaoSalvar.setAttribute('aria-disabled', String(semAlteracoes));
  };

  const ativarAba = abaAlvo => {
    const idPainel = abaAlvo.getAttribute('aria-controls');
    abas.forEach(aba => {
      const selecionada = aba === abaAlvo;
      aba.setAttribute('aria-selected', String(selecionada));
      aba.tabIndex = selecionada ? 0 : -1;
    });
    paineis.forEach(painel => {
      painel.hidden = painel.id !== idPainel;
    });
    if (rodapeFormulario) {
      rodapeFormulario.hidden = !ABAS_COM_FORMULARIO.has(idPainel);
    }
  };

  abas.forEach((aba, indice) => {
    aba.addEventListener('click', () => ativarAba(aba));
    aba.addEventListener('keydown', evento => {
      let proximo = null;
      if (evento.key === 'ArrowDown' || evento.key === 'ArrowRight') {
        proximo = abas[(indice + 1) % abas.length];
      } else if (evento.key === 'ArrowUp' || evento.key === 'ArrowLeft') {
        proximo = abas[(indice - 1 + abas.length) % abas.length];
      }
      if (proximo) {
        evento.preventDefault();
        ativarAba(proximo);
        proximo.focus();
      }
    });
  });

  const mostrarStatus = (mensagem, tipo = 'sucesso') => {
    if (!statusEl) return;
    clearTimeout(timerStatus);
    const estado = tipo === 'erro' ? 'erro' : 'sucesso';
    statusEl.setAttribute('data-mvp-status', estado);
    statusEl.textContent = '';

    const icone = document.createElement('i');
    icone.className = estado === 'erro' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    icone.setAttribute('aria-hidden', 'true');

    const texto = document.createElement('span');
    texto.textContent = mensagem;

    requestAnimationFrame(() => {
      statusEl.replaceChildren(icone, texto);
    });
    timerStatus = setTimeout(() => {
      statusEl.replaceChildren();
      statusEl.setAttribute('data-mvp-status', '');
    }, 5000);
  };

  carregarPreferenciasSessao();

  snapshotSalvo = serializarEstadoFormulario();
  atualizarEstadoBotaoSalvar();

  ['input', 'change'].forEach(tipoEvento => {
    formulario.addEventListener(tipoEvento, atualizarEstadoBotaoSalvar);
  });

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    if (serializarEstadoFormulario() === snapshotSalvo) return;

    if (!salvarPreferenciasSessao()) return;
    snapshotSalvo = serializarEstadoFormulario();
    atualizarEstadoBotaoSalvar();
    window.MutiraoNotificacoes.registrar('Configurações atualizadas', 'Suas escolhas foram salvas.', 'configuracoes.html');
    mostrarStatus('Ajustes salvos!', 'sucesso');
  });

  botaoRestaurar?.addEventListener('click', () => {
    formulario.reset();
    if (!salvarPreferenciasSessao()) {
      carregarPreferenciasSessao();
      atualizarEstadoBotaoSalvar();
      return;
    }
    snapshotSalvo = serializarEstadoFormulario();
    atualizarEstadoBotaoSalvar();
    mostrarStatus('As preferências desta tela voltaram ao padrão.', 'sucesso');
  });

  botaoAcessibilidade?.addEventListener('click', () => {
    const gatilho = document.querySelector('[aria-controls="acessibilidade-painel"]');
    if (gatilho) {
      gatilho.click();
    } else {
      mostrarStatus('Não deu para abrir os ajustes de leitura.', 'erro');
    }
  });

  botaoExportar?.addEventListener('click', async () => {
    const usuario = core.obterUsuarioAtual();
    const preferencias = core.obterPreferencias();
    const situacao = chave => preferencias[chave] === false ? 'Desativados' : 'Ativados';
    const resumo = [
      'Mutirão — Resumo dos ajustes',
      `Quem recebe cuidado: ${window.MutiraoCuidado?.nomePessoaAcompanhada ? window.MutiraoCuidado.nomePessoaAcompanhada() : 'Pessoa acompanhada'}`,
      `Perfil: ${usuario.nome} (${usuario.papel})`,
      `Avisos de medicamentos no sino: ${situacao('notificacoesMedicacao')}`,
      `Avisos de turnos, compromissos e relatos no sino: ${situacao('notificacoesRelatos')}`,
      `Sons: ${situacao('notificacoesSom')}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(resumo);
      mostrarStatus('Resumo copiado. Agora é só colar.', 'sucesso');
    } catch {
      mostrarStatus('Não deu para copiar sozinho neste navegador.', 'erro');
    }
  });

  const selectSucessor = dialogoSairRede?.querySelector('[data-sucessor-rede]');
  const atualizarConfirmacaoSaida = () => {
    const semSucessor = !selectSucessor?.value;
    if (botaoConfirmarSair) {
      botaoConfirmarSair.disabled = semSucessor;
      botaoConfirmarSair.setAttribute('aria-disabled', String(semSucessor));
    }
  };
  selectSucessor?.addEventListener('change', atualizarConfirmacaoSaida);

  const identificarAdministrador = () => {
    const selo = formulario.querySelector('[data-administrador-rede]');
    const nome = core.obterEstado().administradorRede || core.obterUsuarioAtual().nomeComApelido;
    if (selo) selo.textContent = `Organiza a rede: ${nome}`;
  };
  identificarAdministrador();
  window.addEventListener('mutirao:cuidado-atualizado', identificarAdministrador);

  if (botaoAbrirSairRede) {
    botaoAbrirSairRede.hidden = core.obterUsuarioAtual().papel !== 'Administrador';
    botaoAbrirSairRede.addEventListener('click', () => {
      const outros = core.obterParticipantesRede().filter(pessoa => !pessoa.ehUsuarioAtual);
      const rotulo = outros.length ? 'Selecione um participante' : 'Nenhum outro participante nesta rede';
      dialogoSairRede.querySelector('[data-rede-transferencia]').textContent =
        `Rede de ${core.nomePessoaAcompanhada()}. Escolha quem assumirá a administração e seus turnos futuros.`;
      dialogoSairRede.querySelector('[data-erro-transferencia]').textContent = '';
      selectSucessor.replaceChildren(new Option(rotulo, ''));
      outros.forEach(pessoa => selectSucessor.add(new Option(pessoa.nome, pessoa.nome)));
      selectSucessor.disabled = !outros.length;
      dialogoSairRede.querySelector('[data-rede-sem-sucessor]').hidden = Boolean(outros.length);
      atualizarConfirmacaoSaida();
      dialogoSairRede.showModal();
    });
  }

  botaoFecharDialogo?.addEventListener('click', () => {
    dialogoSairRede?.close();
  });

  botaoConfirmarSair?.addEventListener('click', () => {
    try {
      core.sairDaRede(dialogoSairRede.querySelector('[data-sucessor-rede]').value);
      dialogoSairRede.close();
      core.mostrarSaidaRede();
    } catch (erro) { dialogoSairRede.querySelector('[data-erro-transferencia]').textContent = erro.message; }
  });
});
