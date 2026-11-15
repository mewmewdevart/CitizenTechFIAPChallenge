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

  const selectAntecedencia = formulario.querySelector('#config-antecedencia-medicacao');
  const toggleMedicacao = formulario.querySelector('#config-notificacoes-medicacao');

  let timerStatus = null;

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
  atualizarEstadoAntecedencia();

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    adicionarNotificacao(
      'Configurações atualizadas',
      'Preferências de alertas e permissões da rede de cuidado salvas para esta sessão.'
    );
    mostrarStatus('Configurações salvas com sucesso!', 'sucesso');
  });

  botaoRestaurar?.addEventListener('click', () => {
    formulario.reset();
    atualizarEstadoAntecedencia();
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
