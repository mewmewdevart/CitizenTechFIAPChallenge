(() => {
  const pagina = document.querySelector('[data-pagina-mvp="medicamentos"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const {
    HOJE,
    obterEstado,
    atualizarEstado,
    obterUsuarioAtual,
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
  const abas = [...pagina.querySelectorAll('.meds__abas [role="tab"]')];
  const paineisAba = [...pagina.querySelectorAll('[role="tabpanel"]')];
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
  let nomeEstoque = 'Metformina';
  let itemEmFoco = null;

  const formatarHorario = valor => (valor ? valor.replace(':', 'h') : '');
  const nomeCompleto = quem => NOMES_COMPLETOS[quem] || quem;
  const plural = (total, singular, varios) => `${total} ${total === 1 ? singular : varios}`;

  const juntarHorarios = lista => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}` : lista[0] || '');

  const obterItens = () => {
    const estado = obterEstado();
    const doses = obterDoses();
    const editados = estado.itensEditados || {};
    const excluidos = new Set(estado.itensExcluidos || []);
    const nomes = [...new Set(doses.map(dose => dose.itemId))];
    const medicamentos = nomes.map(nome => {
      const horarios = doses.filter(dose => dose.itemId === nome).map(dose => dose.hora);
      return { chave: nome, nome, tipo: 'Medicamento', horarios: juntarHorarios(horarios), consumoDia: horarios.length };
    });
    const insumos = INSUMOS.map(item => ({ ...item, chave: item.nome }));
    const extras = (estado.itensExtras || [])
      .filter(item => !nomes.includes(item.chave || item.nome))
      .map(item => ({ ...item, chave: item.chave || item.nome }));

    return [...medicamentos, ...extras, ...insumos]
      .filter(item => !excluidos.has(item.chave))
      .map(item => {
        const edicao = editados[item.chave];
        const mesclado = edicao ? { ...item, ...edicao } : item;
        return { ...mesclado, horarios: item.horarios || mesclado.horarios, consumoDia: item.consumoDia ?? mesclado.consumoDia, estoque: obterEstoque(item.chave) };
      });
  };

  const descreverItem = item => {
    if (item.tipo === 'Insumo') return `Insumo · ${item.estoque ?? 0} unidades em estoque`;
    return `${item.tipo}${item.horarios ? ` · ${item.horarios}` : ''}`;
  };

  const detalharItem = item => {
    if (item.tipo === 'Insumo') return `Insumo · ${item.estoque ?? 0} unidades em estoque.`;
    const doseTexto = item.dose ? ` · ${item.dose}` : '';
    const horariosTexto = item.horarios ? ` · ${item.horarios}` : '';
    if (item.estoque === null) return `Medicamento${doseTexto}${horariosTexto}. Consulte a prescrição para conferir dose e apresentação.`;
    const dias = item.consumoDia ? Math.floor(item.estoque / item.consumoDia) : null;
    return `Medicamento${doseTexto}${horariosTexto}. Estoque: ${item.estoque} unidades${dias !== null ? `; estimativa de ${plural(dias, 'dia', 'dias')}` : ''}.`;
  };

  const descreverRegistro = dose => {
    const usuario = obterUsuarioAtual();
    const quem = dose.meu ? usuario.nomeComApelido : nomeCompleto(dose.quem);
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
      <span class="painel__texto"><strong>${escaparHtml(dose.hora)} · ${escaparHtml(dose.nome)}</strong><span>Prevista para ${escaparHtml(dose.hora)} · ${escaparHtml(grupo.responsavel || 'Turno sem cobertura')}</span></span>
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
    const filtrados = registradas.filter(dose => {
      const bateEstado = filtroEstadoRegistros === 'Todos' || dose.estado === filtroEstadoRegistros;
      const termo = core.normalizarBusca(termoRegistros);
      const bateTexto = !termo || core.normalizarBusca(`${dose.hora} ${dose.nome} ${descreverRegistro(dose)}`).includes(termo);
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
    if (avisosEstoque) {
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
    }
    itemEmEstoque = baixos[0]?.chave || itens.find(item => item.estoque !== null)?.chave || 'Metformina';
  };

  const controlesItens = pagina.querySelector('[data-itens-controles]');
  const buscaItens = pagina.querySelector('[data-itens-busca]');
  const botaoVerMaisItens = pagina.querySelector('[data-itens-ver-mais]');
  let filtroTipoItens = 'Todos';
  let termoItens = '';
  let mostrarTodosItens = false;

  const renderizarItens = itens => {
    const filtrados = itens.filter(item => {
      const bateTipo = filtroTipoItens === 'Todos' || item.tipo === filtroTipoItens;
      const termo = core.normalizarBusca(termoItens);
      const bateTexto = !termo || core.normalizarBusca(`${item.nome} ${item.dose || ''} ${item.tipo || ''}`).includes(termo);
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
        <button type="button" class="botao botao--secundario" data-ver-item="${escaparHtml(item.chave)}">Ver item</button>
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

  const DESCRICOES_MEDICAMENTOS = {
    Levotiroxina: 'para controle da tireoide (em jejum)',
    Carbamazepina: 'para controle neurológico',
    Bombinha: 'para aliviar e prevenir falta de ar',
    Losartana: 'para controle da pressão arterial',
    Metformina: 'para controle da glicemia',
    Hidroclorotiazida: 'para controle da pressão e retenção de líquidos',
    'Cálcio + vit. D': 'para fortalecimento dos ossos',
    'Ácido fólico': 'como suplementação vitamínica',
    Omeprazol: 'para proteção gástrica',
    AAS: 'para proteção cardiovascular',
    'Vitamina B12': 'para reposição vitamínica',
    Colírio: 'para hidratação e cuidado ocular'
  };

  const descreverDoseMari = dose => {
    const item = obterItens().find(atual => atual.nome === dose.nome || atual.chave === dose.itemId);
    const detalheDose = item?.dose ? ` (${item.dose})` : '';
    const finalidade = DESCRICOES_MEDICAMENTOS[dose.nome];
    if (finalidade) {
      return `Mari toma ${dose.nome}${detalheDose} às ${dose.hora}, ${finalidade}.`;
    }
    return `Mari toma ${dose.nome}${detalheDose} às ${dose.hora}, conforme prescrição médica.`;
  };

  const prepararDialogos = dose => {
    const grupo = obterCompartimentos().find(item => item.hora === dose.hora);
    const usuario = obterUsuarioAtual();
    const avatar = usuario.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg';
    const horaAtual = `${dose.hora.replace('h', '').padStart(2, '0')}h10`;
    dialogos.registrar.querySelector('[data-dose-titulo]').textContent = `Registrar administração - ${dose.nome}`;
    dialogos.registrar.querySelector('[data-dose-contexto]').textContent = descreverDoseMari(dose);
    for (const dialogo of [dialogos.registrar, dialogos.confirmar, dialogos.naoAdministrada, dialogos.registrada]) {
      dialogo.querySelectorAll('[data-usuario-avatar]').forEach(img => { img.src = avatar; });
      dialogo.querySelectorAll('[data-usuario-registro]').forEach(el => {
        el.textContent = `${usuario.nomeComApelido} · ${usuario.papel}`;
      });
      dialogo.querySelectorAll('[data-usuario-turno]').forEach(el => {
        el.textContent = `${usuario.nomeComApelido} · ${grupo?.responsavel ? `Turno de ${grupo.responsavel}` : usuario.papel}`;
      });
    }
    const horaEl = dialogos.naoAdministrada?.querySelector('[data-registro-hora-atual]');
    if (horaEl) horaEl.textContent = `Registro às ${horaAtual}`;
    for (const dialogo of [dialogos.confirmar, dialogos.naoAdministrada]) {
      dialogo.querySelector('[data-dose-previsto]').textContent = descreverDoseMari(dose);
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
    const usuario = obterUsuarioAtual();
    registrarDose(dose.chave, administrada
      ? { estado, quem: usuario.nomeComApelido, horario: detalhe }
      : { estado, quem: usuario.nomeComApelido, motivo: detalhe });

    const diario = administrada
      ? `${usuario.nomeComApelido}: Registro de administração de ${dose.nome} (${dose.hora}) às ${formatarHorario(detalhe)}.`
      : `Dose de ${dose.nome} das ${dose.hora} não administrada. Registro por ${usuario.nomeComApelido}${detalhe ? ` · ${detalhe}` : ''}.`;

    atualizarEstado(estadoAtual => ({
      ...estadoAtual,
      reports: {
        ...estadoAtual.reports,
        [HOJE]: [
          [usuario.nome, usuario.papel, `Tarefa relacionada · ${dose.hora} · ${dose.nome}`, diario, ''],
          ...(estadoAtual.reports?.[HOJE] || [])
        ]
      }
    }));

    dialogos.registrada.querySelector('[data-registro-titulo]').textContent = `${administrada ? 'Administração registrada' : 'Ocorrência registrada'} - ${dose.nome}`;
    dialogos.registrada.querySelector('[data-registro-contexto]').textContent = `${dose.nome} · Dose prevista para as ${dose.hora} na rotina da Mari.`;
    dialogos.registrada.querySelector('[data-registro-agenda]').textContent = administrada
      ? `${dose.hora} · Administrada às ${formatarHorario(detalhe)} · ${usuario.nomeComApelido}`
      : `${dose.hora} · Não administrada · Registro por ${usuario.nomeComApelido}`;
    dialogos.registrada.querySelector('[data-registro-diario]').textContent = diario;
    dialogos.registrada.showModal();
    doseEmFoco = null;
    renderizar();
  };

  const abrirEstoque = nome => {
    const item = obterItens().find(atual => atual.chave === nome || atual.nome === nome);
    if (!item) return;
    itemEmEstoque = item.chave;
    nomeEstoque = item.nome;
    dialogos.estoque.querySelector('[data-estoque-titulo]').textContent = `Adicionar ao estoque de ${item.nome.toLocaleLowerCase('pt-BR')}`;
    dialogos.estoque.querySelector('[data-estoque-contexto]').textContent = `Maria das Dores (Mari) · Estoque atual: ${plural(item.estoque ?? 0, 'unidade', 'unidades')}. A quantidade será somada ao estoque atual.`;
    dialogos.estoque.querySelector('[name="item"]').value = item.nome;
    dialogos.estoque.showModal();
  };

  const abrirDetalhe = nome => {
    const item = obterItens().find(atual => atual.nome === nome || atual.chave === nome);
    if (!item) return;
    itemEmFoco = item;
    dialogos.detalhe.querySelector('[data-detalhe-titulo]').textContent = item.nome;
    const pessoaEl = dialogos.detalhe.querySelector('[data-detalhe-pessoa]');
    const resumoEl = dialogos.detalhe.querySelector('[data-detalhe-resumo]');
    if (pessoaEl) pessoaEl.textContent = core.nomePessoaAcompanhada();
    if (resumoEl) resumoEl.textContent = detalharItem(item);
    dialogos.detalhe.showModal();
  };

  const popularSelectHorarioItem = (valor = '08') => {
    const form = dialogos.item?.querySelector('[data-formulario-mvp="item"]');
    const sel = form?.elements.horario;
    if (!sel) return;
    const opcoes = Array.from({ length: 24 }, (_, hora) => {
      const h = String(hora).padStart(2, '0');
      return `<option value="${h}">${h}h00</option>`;
    }).join('');
    sel.innerHTML = `<option value="">Não se aplica</option>${opcoes}`;
    sel.value = valor;
  };

  popularSelectHorarioItem();

  const abrirEdicaoItem = item => {
    const form = dialogos.item?.querySelector('[data-formulario-mvp="item"]');
    const titulo = dialogos.item?.querySelector('[data-titulo-dialogo-item]');
    if (!form || !item) return;
    if (titulo) titulo.textContent = 'Editar item';
    form.elements.nomeOriginal.value = item.chave || item.nome;
    form.elements.tipo.value = item.tipo || 'Medicamento';
    form.elements.nome.value = item.nome || '';
    form.elements.dose.value = item.dose || '';
    const horasExtraidas = (item.horarios || '').match(/\d{1,2}/g) || [];
    const h = horasExtraidas[0] ? String(Number(horasExtraidas[0])).padStart(2, '0') : '';
    popularSelectHorarioItem(h);
    form.dataset.horarioInicial = h;
    form.elements.estoque.value = item.estoque === null || item.estoque === undefined ? '' : String(item.estoque);
    dialogos.detalhe?.close();
    dialogos.item.showModal();
  };

  const ativarAba = aba => {
    const painelId = aba.getAttribute('aria-controls');
    for (const item of abas) {
      const ativa = item === aba;
      item.setAttribute('aria-selected', String(ativa));
      item.tabIndex = ativa ? 0 : -1;
    }
    for (const painel of paineisAba) {
      painel.hidden = painel.id !== painelId;
    }
  };

  abas.forEach((aba, indice) => {
    aba.addEventListener('keydown', evento => {
      let proximo = null;
      if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') {
        proximo = abas[(indice + 1) % abas.length];
      } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') {
        proximo = abas[(indice - 1 + abas.length) % abas.length];
      } else if (evento.key === 'Home') {
        proximo = abas[0];
      } else if (evento.key === 'End') {
        proximo = abas[abas.length - 1];
      }
      if (proximo) {
        evento.preventDefault();
        ativarAba(proximo);
        proximo.focus();
      }
    });
  });

  pagina.addEventListener('click', evento => {
    const botao = evento.target.closest('button');
    if (!botao) return;

    if (botao.matches('.meds__abas [role="tab"]')) {
      ativarAba(botao);
      return;
    }
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
    if (botao.dataset.dialogo === 'dialogo-adicionar-item') {
      const form = dialogos.item?.querySelector('[data-formulario-mvp="item"]');
      const titulo = dialogos.item?.querySelector('[data-titulo-dialogo-item]');
      if (form) {
        form.reset();
        form.elements.nomeOriginal.value = '';
        popularSelectHorarioItem('08');
      }
      if (titulo) titulo.textContent = 'Adicionar item';
    }
    if (botao.hasAttribute('data-editar-item')) {
      abrirEdicaoItem(itemEmFoco);
      return;
    }
    if (botao.hasAttribute('data-excluir-item')) {
      if (!itemEmFoco) return;
      const chave = itemEmFoco.chave || itemEmFoco.nome;
      const nomeExibido = itemEmFoco.nome;
      atualizarEstado(estado => ({
        ...estado,
        itensExtras: (estado.itensExtras || []).filter(item => (item.chave || item.nome) !== chave),
        itensExcluidos: [...new Set([...(estado.itensExcluidos || []), chave])]
      }));
      dialogos.detalhe?.close();
      itemEmFoco = null;
      anunciarStatus(elementoStatus, `${nomeExibido} removido dos itens da Mari.`);
      renderizar();
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
    if (!Number.isInteger(quantidade) || quantidade < 1) return;
    reporEstoque(itemEmEstoque, quantidade, evento.target.elements.observacao.value);
    evento.target.closest('dialog')?.close();
    anunciarStatus(elementoStatus, `Estoque de ${nomeEstoque} atualizado com ${plural(quantidade, 'unidade', 'unidades')}.`);
    renderizar();
  });

  dialogos.item?.querySelector('[data-formulario-mvp="item"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const form = evento.target;
    const campos = Object.fromEntries(new FormData(form));
    const nomeOriginal = (campos.nomeOriginal || '').trim();
    const nome = (campos.nome || '').trim();
    if (!nome) return;
    if (obterItens().some(item => item.chave !== nomeOriginal && core.normalizarBusca(item.nome) === core.normalizarBusca(nome))) {
      form.elements.nome.setCustomValidity('Já existe um item com esse nome.');
      form.elements.nome.reportValidity();
      return;
    }
    const horarios = campos.horario ? `${campos.horario}h` : '';
    const dadosItem = {
      nome,
      tipo: campos.tipo || 'Medicamento',
      horarios,
      dose: (campos.dose || '').trim(),
      consumoDia: campos.horario ? 1 : 0
    };

    if (nomeOriginal) {
      atualizarEstado(estado => {
        const ehExtra = (estado.itensExtras || []).some(item => (item.chave || item.nome) === nomeOriginal);
        const itensExtras = ehExtra
          ? (estado.itensExtras || []).map(item => ((item.chave || item.nome) === nomeOriginal ? { ...item, ...dadosItem, chave: nomeOriginal } : item))
          : estado.itensExtras;
        const itensEditados = ehExtra
          ? estado.itensEditados
          : { ...(estado.itensEditados || {}), [nomeOriginal]: dadosItem };
        if (!ehExtra) {
          const anterior = estado.itensEditados?.[nomeOriginal]?.horarioDefinido;
          const novo = campos.horario !== form.dataset.horarioInicial && horarios ? horarios.replace(/^0/, '') : anterior;
          if (novo) itensEditados[nomeOriginal].horarioDefinido = novo;
        }
        const estoqueBase = campos.estoque === ''
          ? estado.estoqueBase
          : core.definirSaldoEstoque(estado, nomeOriginal, Number(campos.estoque));
        return { ...estado, itensExtras, itensEditados, estoqueBase };
      });
      anunciarStatus(elementoStatus, `${nome} atualizado.`);
    } else {
      const chave = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      atualizarEstado(estado => ({
        ...estado,
        itensExtras: [...(estado.itensExtras || []), { ...dadosItem, chave }],
        estoqueBase: campos.estoque === '' ? estado.estoqueBase : core.definirSaldoEstoque(estado, chave, Number(campos.estoque))
      }));
      anunciarStatus(elementoStatus, `${nome} adicionado aos itens da Mari.`);
    }

    form.reset();
    form.elements.nomeOriginal.value = '';
    dialogos.item.close();
    renderizar();
  });

  core.vincularFiltro(controlesRegistros, '[data-registros-filtro]', botao => {
    filtroEstadoRegistros = botao.dataset.registrosFiltro;
    mostrarTodosRegistros = false;
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

  core.vincularFiltro(controlesItens, '[data-itens-filtro]', botao => {
    filtroTipoItens = botao.dataset.itensFiltro;
    mostrarTodosItens = false;
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

  dialogos.item?.querySelector('[name="nome"]')?.addEventListener('input', evento => evento.target.setCustomValidity(''));
  dialogos.item?.addEventListener('close', () => dialogos.item.querySelector('[name="nome"]').setCustomValidity(''));
  const pessoa = obterEstado().person;
  const alerta = pagina.querySelector('[data-alerta-medicamentos]');
  const alergias = pessoa.alergias?.trim();
  if (alerta) {
    alerta.hidden = !alergias && !pessoa.avisoTitulo && !pessoa.avisoTexto;
    alerta.querySelector('strong').textContent = pessoa.avisoTitulo || (alergias ? `Alergia registrada: ${alergias}` : 'Atenção no cuidado');
    alerta.querySelector('.faixa-alerta__texto > span').textContent = pessoa.avisoTexto || 'Confira as orientações na Ficha.';
  }
  renderizar();
  const doseInicial = new URLSearchParams(location.search).get('dose');
  if (doseInicial) {
    const url = new URL(location.href);
    url.searchParams.delete('dose');
    history.replaceState(null, '', url);
    abrirRegistro(doseInicial);
  }
})();
