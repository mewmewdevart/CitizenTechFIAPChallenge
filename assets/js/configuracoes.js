(() => {
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
  const listaNotificacoes = document.querySelector('.menu-notificacoes__lista');
  const botaoNotificacoes = document.querySelector('.botao-icone--notificacao');

  const CHAVE_CONFIG_SESSAO = 'mutirao-configuracoes-sessao-v1';
  const selectAntecedencia = formulario.querySelector('#config-antecedencia-medicacao');
  const toggleMedicacao = formulario.querySelector('#config-notificacoes-medicacao');
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
          campo.checked = Boolean(dados[chave]);
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
        dados[chave] = campo.type === 'checkbox' || campo.type === 'radio' ? campo.checked : campo.value;
      }
      sessionStorage.setItem(CHAVE_CONFIG_SESSAO, JSON.stringify(dados));
    } catch {
      // Ignora erro caso sessionStorage esteja indisponível
    }
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

  const adicionarNotificacao = (titulo, descricao) => {
    if (!listaNotificacoes) return;

    const item = document.createElement('li');
    item.className = 'notificacao';

    const link = document.createElement('a');
    link.className = 'notificacao__link';
    link.href = 'configuracoes.html';

    const bloco = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = titulo;
    const p = document.createElement('p');
    p.textContent = descricao;
    bloco.append(h3, p);

    const seta = document.createElement('i');
    seta.className = 'fa-solid fa-chevron-right notificacao__seta';
    seta.setAttribute('aria-hidden', 'true');

    link.append(bloco, seta);
    item.append(link);
    listaNotificacoes.prepend(item);

    if (botaoNotificacoes) {
      const total = listaNotificacoes.querySelectorAll('.notificacao').length;
      botaoNotificacoes.setAttribute('aria-label', `Notificações (${total} pendentes)`);
      botaoNotificacoes.setAttribute('data-nova-notificacao', 'true');
    }
  };

  const atualizarEstadoAntecedencia = () => {
    if (!selectAntecedencia || !toggleMedicacao) return;
    selectAntecedencia.disabled = !toggleMedicacao.checked;
  };

  toggleMedicacao?.addEventListener('change', atualizarEstadoAntecedencia);
  carregarPreferenciasSessao();
  atualizarEstadoAntecedencia();

  snapshotSalvo = serializarEstadoFormulario();
  atualizarEstadoBotaoSalvar();

  ['input', 'change'].forEach(tipoEvento => {
    formulario.addEventListener(tipoEvento, atualizarEstadoBotaoSalvar);
  });

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    if (serializarEstadoFormulario() === snapshotSalvo) return;

    salvarPreferenciasSessao();
    snapshotSalvo = serializarEstadoFormulario();
    atualizarEstadoBotaoSalvar();
    adicionarNotificacao(
      'Configurações atualizadas',
      'Preferências de alertas e permissões da rede de cuidado salvas para esta sessão.'
    );
    mostrarStatus('Configurações salvas com sucesso!', 'sucesso');
  });

  botaoRestaurar?.addEventListener('click', () => {
    formulario.reset();
    try {
      sessionStorage.removeItem(CHAVE_CONFIG_SESSAO);
    } catch {
      // Ignora erro caso sessionStorage esteja indisponível
    }
    atualizarEstadoAntecedencia();
    snapshotSalvo = serializarEstadoFormulario();
    atualizarEstadoBotaoSalvar();
    mostrarStatus('Padrões recomendados restaurados.', 'sucesso');
  });

  botaoAcessibilidade?.addEventListener('click', () => {
    const gatilho = document.querySelector('[aria-controls="acessibilidade-painel"]');
    if (gatilho) {
      gatilho.click();
    } else {
      mostrarStatus('Não foi possível abrir o painel de acessibilidade.', 'erro');
    }
  });

  botaoExportar?.addEventListener('click', async () => {
    const canal = formulario.querySelector('#config-canal-notificacao')?.selectedOptions?.[0]?.textContent || 'Aplicativo e e-mail';
    const antecedencia = selectAntecedencia?.selectedOptions?.[0]?.textContent || '30 minutos';
    const resumo = [
      'Mutirão — Resumo de Configurações',
      'Pessoa acompanhada: Maria das Dores (Mari)',
      'Perfil: Zé da Manga · Neto (Administrador)',
      `Canal de alertas: ${canal}`,
      `Antecedência de medicação: ${toggleMedicacao?.checked ? antecedencia : 'Desativado'}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(resumo);
      mostrarStatus('Resumo das configurações copiado para a área de transferência.', 'sucesso');
    } catch {
      mostrarStatus('Não foi possível copiar automaticamente neste navegador.', 'erro');
    }
  });

  botaoAbrirSairRede?.addEventListener('click', () => {
    dialogoSairRede?.showModal();
  });

  botaoFecharDialogo?.addEventListener('click', () => {
    dialogoSairRede?.close();
  });

  botaoConfirmarSair?.addEventListener('click', () => {
    dialogoSairRede?.close();
    mostrarStatus('Solicitação registrada: como administrador, transfira a gestão antes de sair da rede.', 'erro');
  });
})();
