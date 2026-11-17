(() => {
  const pagina = document.querySelector('[data-pagina-mvp="medicamentos"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const {
    HOJE,
    obterEstado,
    atualizarEstado,
    escaparHtml,
    anunciarStatus,
    obterDoses,
    obterCompartimentos,
    registrarDose,
    obterEstoque,
    reporEstoque
  } = core;

  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const pote = pagina.querySelector('[data-rotina-pote]');
  const contagem = pagina.querySelector('[data-rotina-contagem]');
  const listaDoses = pagina.querySelector('[data-rotina-doses]');
  const proxima = pagina.querySelector('[data-proxima-administracao]');
  const listaRegistros = pagina.querySelector('[data-registros-dia]');
  const avisosEstoque = pagina.querySelector('[data-estoque-avisos]');
  const listaItens = pagina.querySelector('[data-itens-cadastrados]');
  const dialogos = {
    registrar: document.getElementById('dialogo-registrar-administracao'),
    confirmar: document.getElementById('dialogo-confirmar-administracao'),
    naoAdministrada: document.getElementById('dialogo-nao-administrada'),
    registrada: document.getElementById('dialogo-administracao-registrada'),
    estoque: document.getElementById('dialogo-atualizar-estoque'),
    detalhe: document.getElementById('dialogo-detalhe-item'),
    item: document.getElementById('dialogo-adicionar-item')
  };

  const NOMES_COMPLETOS = { Aninha: 'Ana da Silva (Aninha)', Bea: 'Beatriz (Bea)' };
  const SITUACOES = {
    dado: ['Dados', 'fa-regular fa-circle-check'],
    falta: ['Falta', 'fa-solid fa-triangle-exclamation'],
    agora: ['Agora', 'fa-regular fa-clock'],
    depois: ['Previsto', 'fa-regular fa-clock']
  };
  const INSUMOS = [{ nome: 'Fraldas', tipo: 'Insumo' }];

  let doseEmFoco = null;
  let itemEmEstoque = 'Metformina';

  const formatarHorario = valor => (valor ? valor.replace(':', 'h') : '');
  const nomeCompleto = quem => NOMES_COMPLETOS[quem] || quem;
  const plural = (total, singular, varios) => `${total} ${total === 1 ? singular : varios}`;

  const juntarHorarios = lista => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}` : lista[0] || '');

  const obterItens = () => {
    const doses = obterDoses();
    const nomes = [...new Set(doses.map(dose => dose.nome))];
    const medicamentos = nomes.map(nome => {
      const horarios = doses.filter(dose => dose.nome === nome).map(dose => dose.hora);
      return { nome, tipo: 'Medicamento', horarios: juntarHorarios(horarios), consumoDia: horarios.length };
    });
    const extras = (obterEstado().itensExtras || []).filter(item => !nomes.includes(item.nome));
    return [...medicamentos, ...extras, ...INSUMOS].map(item => ({ ...item, estoque: obterEstoque(item.nome) }));
  };

  const descreverItem = item => {
    if (item.tipo === 'Insumo') return `Insumo · ${item.estoque ?? 0} unidades em estoque`;
    return `${item.tipo}${item.horarios ? ` · ${item.horarios}` : ''}`;
  };

  const detalharItem = item => {
    if (item.tipo === 'Insumo') return `Insumo · ${item.estoque ?? 0} unidades em estoque.`;
    if (item.estoque === null) return `Medicamento · ${item.horarios}. Consulte a prescrição para conferir dose e apresentação.`;
    const dias = item.consumoDia ? Math.floor(item.estoque / item.consumoDia) : null;
    return `Medicamento · ${item.horarios}. Estoque: ${item.estoque} unidades${dias !== null ? `; estimativa de ${plural(dias, 'dia', 'dias')}` : ''}.`;
  };

  const descreverRegistro = dose => {
    const quem = dose.meu ? 'Zé da Manga (Zé)' : nomeCompleto(dose.quem);
    if (dose.estado === 'administrado') return `Administrado às ${formatarHorario(dose.horario)} · ${quem}`;
    return `Não administrado · ${quem} · ${dose.motivo || 'Motivo não informado'}`;
  };

  const desenharCompartimento = grupos => {
    const alturaDose = 24;
    const espaco = 5;
    const topoDoses = 31;
    const alturaDoses = grupos.length * alturaDose + (grupos.length - 1) * espaco;
    const alturaInterna = alturaDoses + 8;
    const alturaBandeja = alturaInterna + 14;
    const doses = [...grupos].reverse().map((grupo, indice) => {
      const estado = grupo.completo ? 'dado' : grupo.situacao;
      const y = topoDoses + indice * (alturaDose + espaco);
      return `<rect class="compartimento__dose compartimento__dose--${estado}" x="11" y="${y}" width="57" height="${alturaDose}" rx="6"/>`;
    }).join('');
    return `<svg class="compartimento" viewBox="0 0 79 ${alturaBandeja + 23}" width="79" height="${alturaBandeja + 23}" aria-hidden="true" focusable="false">
      <rect class="compartimento__dobradica" x="11.56" y="16.5" width="55.88" height="7" rx="2.5"/>
      <rect class="compartimento__bandeja" x="1.5" y="20.5" width="76" height="${alturaBandeja}" rx="15.5"/>
      <rect class="compartimento__fundo" x="7.5" y="26.5" width="64" height="${alturaInterna}" rx="10.5"/>
      ${doses}
      <rect class="compartimento__tampa" x="8.4" y="1.5" width="62.2" height="15" rx="3.5"/>
      <path class="compartimento__brilho" d="M12.9 5H34.44L14.9 9L12.9 5Z"/>
    </svg>`;
  };

  const renderizarRotina = grupos => {
    const doses = grupos.flatMap(grupo => grupo.itens);
    pote.innerHTML = desenharCompartimento(grupos);

    const administradas = doses.filter(dose => dose.estado === 'administrado').length;
    const naoAdministradas = doses.filter(dose => dose.estado === 'nao-administrado').length;
    const previstas = doses.length - administradas - naoAdministradas;
    contagem.innerHTML = [
      administradas && plural(administradas, 'administrada', 'administradas'),
      naoAdministradas && plural(naoAdministradas, 'não administrada', 'não administradas'),
      previstas && plural(previstas, 'prevista', 'previstas')
    ].filter(Boolean).join('<br>');

    listaDoses.innerHTML = grupos.map(grupo => {
      const [rotulo, icone] = SITUACOES[grupo.situacao];
      const texto = grupo.situacao === 'falta' ? `Falta ${grupo.faltam}` : rotulo;
      return `<li class="dose dose--${grupo.situacao}">
        <strong>${escaparHtml(grupo.hora)}</strong>
        <span>${plural(grupo.itens.length, 'remédio', 'remédios')}</span>
        <small><i class="${icone}" aria-hidden="true"></i> ${escaparHtml(texto)}</small>
      </li>`;
    }).join('');
  };

  const renderizarProxima = grupos => {
    const grupo = grupos.find(item => !item.completo && item.momento !== 'passado');
    if (!grupo) {
      proxima.innerHTML = '<p class="estoque__texto">Todas as doses previstas para hoje foram registradas.</p>';
      return;
    }
    proxima.innerHTML = `<ul class="painel__lista">${grupo.itens.filter(dose => dose.estado === 'prevista').map(dose => `<li class="painel__item">
      <span class="painel__icone" aria-hidden="true"><i class="bi bi-capsule"></i></span>
      <span class="painel__texto"><strong>${escaparHtml(dose.hora)} · ${escaparHtml(dose.nome)}</strong><span>Prevista para ${escaparHtml(dose.hora)} · ${escaparHtml(grupo.responsavel)}</span></span>
      <button type="button" class="botao botao--secundario" data-registrar-dose="${escaparHtml(dose.chave)}">Registrar administração</button>
    </li>`).join('')}</ul>`;
  };

  const controlesRegistros = pagina.querySelector('[data-registros-controles]');
  const buscaRegistros = pagina.querySelector('[data-registros-busca]');
  const botaoVerMaisRegistros = pagina.querySelector('[data-registros-ver-mais]');
  let filtroEstadoRegistros = 'Todos';
  let termoRegistros = '';
  let mostrarTodosRegistros = false;

  const renderizarRegistros = grupos => {
    const registradas = grupos.flatMap(grupo => grupo.itens).filter(dose => dose.estado !== 'prevista').reverse();
    const temMaisDeCinco = registradas.length > 5;
    if (controlesRegistros) controlesRegistros.hidden = !temMaisDeCinco;
    if (!temMaisDeCinco) {
      filtroEstadoRegistros = 'Todos';
      termoRegistros = '';
      mostrarTodosRegistros = false;
      if (buscaRegistros) buscaRegistros.value = '';
    }

    const filtrados = registradas.filter(dose => {
      const bateEstado = filtroEstadoRegistros === 'Todos' || dose.estado === filtroEstadoRegistros;
      const termo = termoRegistros.trim().toLocaleLowerCase('pt-BR');
      const bateTexto = !termo || `${dose.hora} ${dose.nome} ${descreverRegistro(dose)}`.toLocaleLowerCase('pt-BR').includes(termo);
      return bateEstado && bateTexto;
    });

    const filtroAtivo = filtroEstadoRegistros !== 'Todos' || Boolean(termoRegistros.trim());
    const visiveis = (!filtroAtivo && !mostrarTodosRegistros && filtrados.length > 5)
      ? filtrados.slice(0, 5)
      : filtrados;

    if (botaoVerMaisRegistros) {
      if (!filtroAtivo && filtrados.length > 5) {
        botaoVerMaisRegistros.hidden = false;
        botaoVerMaisRegistros.textContent = mostrarTodosRegistros
          ? 'Ver menos'
          : `Ver mais (${filtrados.length - 5})`;
      } else {
        botaoVerMaisRegistros.hidden = true;
      }
    }

    listaRegistros.innerHTML = visiveis.length
      ? visiveis.map(dose => `<li class="painel__item">
        <span class="painel__icone${dose.estado === 'nao-administrado' ? ' painel__icone--atencao' : ''}" aria-hidden="true"><i class="bi bi-capsule"></i></span>
        <span class="painel__texto"><strong>${escaparHtml(dose.hora)} · ${escaparHtml(dose.nome)}</strong><span>${escaparHtml(descreverRegistro(dose))}</span></span>
        ${dose.estado === 'nao-administrado' ? `<button type="button" class="botao botao--secundario botao--pequeno" data-registrar-dose="${escaparHtml(dose.chave)}">Registrar agora</button>` : ''}
      </li>`).join('')
      : '<li class="estado-vazio"><strong>Nenhum registro encontrado</strong><p>Tente outro filtro ou termo de busca.</p></li>';
  };

  const renderizarEstoque = itens => {
    const baixos = itens.filter(item => item.tipo === 'Medicamento' && item.estoque !== null && item.consumoDia && item.estoque / item.consumoDia <= 3);
    avisosEstoque.innerHTML = baixos.length
      ? baixos.map(item => {
        const dias = Math.floor(item.estoque / item.consumoDia);
        return `<div class="estoque__aviso">
          <span class="selo selo--atencao"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Estoque baixo</span>
          <strong>${escaparHtml(item.nome)}</strong>
          <small>${plural(item.estoque, 'unidade', 'unidades')} · Previsão para ${plural(dias, 'dia', 'dias')}</small>
        </div>`;
      }).join('')
      : '<div class="estado-vazio"><strong>Estoque em dia</strong><p>Nenhum item com previsão curta.</p></div>';
    itemEmEstoque = baixos[0]?.nome || itens.find(item => item.estoque !== null)?.nome || 'Metformina';
  };

  const controlesItens = pagina.querySelector('[data-itens-controles]');
  const buscaItens = pagina.querySelector('[data-itens-busca]');
  const botaoVerMaisItens = pagina.querySelector('[data-itens-ver-mais]');
  let filtroTipoItens = 'Todos';
  let termoItens = '';
  let mostrarTodosItens = false;

  const renderizarItens = itens => {
    const temMaisDeCinco = itens.length > 5;
    if (controlesItens) controlesItens.hidden = !temMaisDeCinco;
    if (!temMaisDeCinco) {
      filtroTipoItens = 'Todos';
      termoItens = '';
      mostrarTodosItens = false;
      if (buscaItens) buscaItens.value = '';
    }

    const filtrados = itens.filter(item => {
      const bateTipo = filtroTipoItens === 'Todos' || item.tipo === filtroTipoItens;
      const termo = termoItens.trim().toLocaleLowerCase('pt-BR');
      const bateTexto = !termo || `${item.nome} ${item.uso || ''}`.toLocaleLowerCase('pt-BR').includes(termo);
      return bateTipo && bateTexto;
    });

    const filtroAtivo = filtroTipoItens !== 'Todos' || Boolean(termoItens.trim());
    const visiveis = (!filtroAtivo && !mostrarTodosItens && filtrados.length > 5)
      ? filtrados.slice(0, 5)
      : filtrados;

    if (botaoVerMaisItens) {
      if (!filtroAtivo && filtrados.length > 5) {
        botaoVerMaisItens.hidden = false;
        botaoVerMaisItens.textContent = mostrarTodosItens
          ? 'Ver menos'
          : `Ver mais (${filtrados.length - 5})`;
      } else {
        botaoVerMaisItens.hidden = true;
      }
    }

    listaItens.innerHTML = visiveis.length
      ? visiveis.map(item => `<li class="painel__item">
        <span class="painel__icone" aria-hidden="true"><i class="${item.tipo === 'Insumo' ? 'fa-solid fa-box-open' : 'bi bi-capsule'}"></i></span>
        <span class="painel__texto"><strong>${escaparHtml(item.nome)}</strong><span>${escaparHtml(descreverItem(item))}</span></span>
        <button type="button" class="botao botao--secundario" data-ver-item="${escaparHtml(item.nome)}">Ver item</button>
      </li>`).join('')
      : '<li class="estado-vazio"><strong>Nenhum item encontrado</strong><p>Tente outro filtro ou termo de busca.</p></li>';
  };

  const renderizar = () => {
    const grupos = obterCompartimentos();
    const itens = obterItens();
    renderizarRotina(grupos);
    renderizarProxima(grupos);
    renderizarRegistros(grupos);
    renderizarEstoque(itens);
    renderizarItens(itens);
  };

  const prepararDialogos = dose => {
    const grupo = obterCompartimentos().find(item => item.hora === dose.hora);
    dialogos.registrar.querySelector('[data-dose-titulo]').textContent = `Registrar administração - ${dose.nome}`;
    dialogos.registrar.querySelector('[data-dose-contexto]').textContent = `Maria das Dores (Mari) · ${dose.nome} · Prevista para ${dose.hora} · Turno de ${grupo?.responsavel || 'Zé da Manga (Zé)'}`;
    for (const dialogo of [dialogos.confirmar, dialogos.naoAdministrada]) {
      dialogo.querySelector('[data-dose-previsto]').textContent = `Maria das Dores (Mari) · ${dose.nome} · Horário previsto: ${dose.hora}`;
    }
    dialogos.confirmar.querySelector('[name="horario"]').value = `${dose.hora.replace('h', '').padStart(2, '0')}:05`;
  };

  const abrirRegistro = chave => {
    const dose = obterDoses().find(item => item.chave === chave);
    if (!dose) return;
    doseEmFoco = dose;
    prepararDialogos(dose);
    dialogos.registrar.showModal();
  };

  const concluirRegistro = (estado, detalhe) => {
    if (!doseEmFoco) return;
    const dose = doseEmFoco;
    const administrada = estado === 'administrado';
    registrarDose(dose.chave, administrada
      ? { estado, quem: 'Zé da Manga (Zé)', horario: detalhe }
      : { estado, quem: 'Zé da Manga (Zé)', motivo: detalhe });

    const diario = administrada
      ? `Zé da Manga (Zé): Registro de administração de ${dose.nome} (${dose.hora}) às ${formatarHorario(detalhe)}.`
      : `Dose de ${dose.nome} das ${dose.hora} não administrada. Registro por Zé da Manga (Zé)${detalhe ? ` · ${detalhe}` : ''}.`;

    atualizarEstado(estadoAtual => ({
      ...estadoAtual,
      reports: {
        ...estadoAtual.reports,
        [HOJE]: [
          ['Zé da Manga', 'Administrador', `Tarefa relacionada · ${dose.hora} · ${dose.nome}`, diario, ''],
          ...(estadoAtual.reports?.[HOJE] || [])
        ]
      }
    }));

    dialogos.registrada.querySelector('[data-registro-titulo]').textContent = `${administrada ? 'Administração registrada' : 'Ocorrência registrada'} - ${dose.nome}`;
    dialogos.registrada.querySelector('[data-registro-contexto]').textContent = `Maria das Dores (Mari) · ${dose.nome} · Terça, 10 nov.`;
    dialogos.registrada.querySelector('[data-registro-agenda]').textContent = administrada
      ? `${dose.hora} · Administrada às ${formatarHorario(detalhe)} · Zé da Manga (Zé)`
      : `${dose.hora} · Não administrada · Registro por Zé da Manga (Zé)`;
    dialogos.registrada.querySelector('[data-registro-diario]').textContent = diario;
    dialogos.registrada.showModal();
    doseEmFoco = null;
    renderizar();
  };

  const abrirEstoque = nome => {
    const item = obterItens().find(atual => atual.nome === nome);
    if (!item) return;
    itemEmEstoque = item.nome;
    dialogos.estoque.querySelector('[data-estoque-titulo]').textContent = `Atualizar estoque de ${item.nome.toLocaleLowerCase('pt-BR')}`;
    dialogos.estoque.querySelector('[data-estoque-contexto]').textContent = `Maria das Dores (Mari) · Estoque atual: ${plural(item.estoque ?? 0, 'unidade', 'unidades')}. O registro guarda a autoria e a data.`;
    dialogos.estoque.querySelector('[name="item"]').value = item.nome;
    dialogos.estoque.showModal();
  };

  const abrirDetalhe = nome => {
    const item = obterItens().find(atual => atual.nome === nome);
    if (!item) return;
    dialogos.detalhe.querySelector('[data-detalhe-titulo]').textContent = item.nome;
    dialogos.detalhe.querySelector('[data-detalhe-texto]').textContent = `Maria das Dores (Mari) · ${detalharItem(item)}`;
    dialogos.detalhe.showModal();
  };

  pagina.addEventListener('click', evento => {
    const botao = evento.target.closest('button');
    if (!botao) return;

    if (botao.hasAttribute('data-fechar-dialogo')) {
      botao.closest('dialog')?.close();
      return;
    }
    if (botao.dataset.registrarDose) {
      abrirRegistro(botao.dataset.registrarDose);
      return;
    }
    if (botao.dataset.etapaAdministracao) {
      dialogos.registrar.close();
      document.getElementById(botao.dataset.etapaAdministracao)?.showModal();
      return;
    }
    if (botao.hasAttribute('data-voltar-administracao')) {
      botao.closest('dialog')?.close();
      dialogos.registrar.showModal();
      return;
    }
    if (botao.hasAttribute('data-abrir-estoque')) {
      abrirEstoque(itemEmEstoque);
      return;
    }
    if (botao.dataset.verItem) abrirDetalhe(botao.dataset.verItem);
  });

  pagina.querySelector('[data-formulario-mvp="administrada"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    evento.target.closest('dialog')?.close();
    concluirRegistro('administrado', evento.target.elements.horario.value || '12:05');
  });

  pagina.querySelector('[data-formulario-mvp="nao-administrada"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const motivo = evento.target.elements.motivo.value.trim();
    evento.target.reset();
    evento.target.closest('dialog')?.close();
    concluirRegistro('nao-administrado', motivo);
  });

  pagina.querySelector('[data-formulario-mvp="estoque"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const quantidade = Number(evento.target.elements.quantidade.value);
    if (!quantidade || quantidade < 1) return;
    reporEstoque(itemEmEstoque, quantidade);
    evento.target.closest('dialog')?.close();
    anunciarStatus(elementoStatus, `Estoque de ${itemEmEstoque} atualizado com ${plural(quantidade, 'unidade', 'unidades')}.`);
    renderizar();
  });

  dialogos.item?.querySelector('[data-formulario-mvp="item"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const campos = Object.fromEntries(new FormData(form));
    const nome = (campos.nome || '').trim();
    if (!nome) return;
    const horarios = (campos.horarios || '').trim();
    atualizarEstado(estado => ({
      ...estado,
      itensExtras: [...(estado.itensExtras || []), {
        nome,
        tipo: campos.tipo || 'Medicamento',
        horarios,
        dose: (campos.dose || '').trim(),
        consumoDia: (horarios.match(/\d{1,2}h/g) || []).length
      }],
      estoqueBase: campos.estoque === '' ? estado.estoqueBase : { ...(estado.estoqueBase || {}), [nome]: Number(campos.estoque) }
    }));
    form.reset();
    dialogos.item.close();
    anunciarStatus(elementoStatus, `${nome} adicionado aos itens da Mari.`);
    renderizar();
  });

  controlesRegistros?.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-registros-filtro]');
    if (!botao) return;
    filtroEstadoRegistros = botao.dataset.registrosFiltro || 'Todos';
    for (const item of controlesRegistros.querySelectorAll('[data-registros-filtro]')) {
      item.setAttribute('aria-pressed', String(item === botao));
    }
    renderizarRegistros(obterCompartimentos());
  });

  buscaRegistros?.addEventListener('input', () => {
    termoRegistros = buscaRegistros.value;
    renderizarRegistros(obterCompartimentos());
  });

  botaoVerMaisRegistros?.addEventListener('click', () => {
    mostrarTodosRegistros = !mostrarTodosRegistros;
    renderizarRegistros(obterCompartimentos());
  });

  controlesItens?.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-itens-filtro]');
    if (!botao) return;
    filtroTipoItens = botao.dataset.itensFiltro || 'Todos';
    for (const item of controlesItens.querySelectorAll('[data-itens-filtro]')) {
      item.setAttribute('aria-pressed', String(item === botao));
    }
    renderizarItens(obterItens());
  });

  buscaItens?.addEventListener('input', () => {
    termoItens = buscaItens.value;
    renderizarItens(obterItens());
  });

  botaoVerMaisItens?.addEventListener('click', () => {
    mostrarTodosItens = !mostrarTodosItens;
    renderizarItens(obterItens());
  });

  renderizar();
})();
