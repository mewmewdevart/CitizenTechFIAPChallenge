window.MutiraoCuidadoPronto.then(core => {
  if (!core) return;
  const pagina = document.querySelector('[data-pagina-mvp="medicamentos"]');
  if (!pagina) return;

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

  const SITUACOES = {
    dado: ['Tudo dado', 'fa-regular fa-circle-check'],
    falta: ['Falta', 'fa-solid fa-triangle-exclamation'],
    agora: ['Agora', 'fa-regular fa-clock'],
    depois: ['Mais tarde', 'fa-regular fa-clock']
  };
  const apelidoPessoa = () => obterEstado().person?.apelido || obterEstado().person?.nome || 'a pessoa';

  let doseEmFoco = null;
  let itemEmEstoque = '';
  let nomeEstoque = '';
  let itemEmFoco = null;

  const formatarHorario = valor => (valor ? valor.replace(':', 'h') : '');
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
      const cadastro = estado.itensExtras?.find(item => (item.chave || item.nome) === nome) || {};
      return { chave: nome, nome, tipo: 'Medicamento', ...cadastro, horarios: juntarHorarios(horarios), consumoDia: horarios.length };
    });
    const insumos = (estado.insumos || []).map(item => ({ ...item, chave: item.nome }));
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
    if (item.tipo === 'Insumo') return item.estoque === null ? 'Material · Saldo não informado' : `Material · ${item.estoque} em casa`;
    return `${item.tipo}${item.horarios ? ` · ${item.horarios}` : ''}`;
  };

  const detalharItem = item => {
    if (item.tipo === 'Insumo') return descreverItem(item) + '.';
    const doseTexto = item.dose ? ` · ${item.dose}` : '';
    const horariosTexto = item.horarios ? ` · ${item.horarios}` : '';
    if (item.estoque === null) return `Medicamento${doseTexto}${horariosTexto}. Veja a dose na receita.`;
    const dias = item.consumoDia ? Math.floor(item.estoque / item.consumoDia) : null;
    return `Medicamento${doseTexto}${horariosTexto}. Estoque: ${item.estoque} unidades${dias !== null ? `; estimativa de ${plural(dias, 'dia', 'dias')}` : ''}.`;
  };

  const converterMinutos = texto => {
    const match = String(texto || '').match(/(\d{1,2})[:h](\d{2})?/i);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2] || 0);
  };

  const descreverDesvioHorario = dose => {
    if (dose.estado !== 'administrado') return '';
    const previsto = converterMinutos(dose.hora);
    const dado = converterMinutos(dose.horario);
    if (previsto === null || dado === null) return '';
    const diferenca = dado - previsto;
    if (diferenca >= 30) return ` (Tomado atrasado às ${formatarHorario(dose.horario)})`;
    if (diferenca <= -30) return ` (Tomado adiantado às ${formatarHorario(dose.horario)})`;
    return '';
  };

  const descreverRegistro = dose => {
    const usuario = obterUsuarioAtual();
    const quem = dose.meu ? usuario.nomeComApelido : (dose.quem ? core.resolverPessoaRede(dose.quem).nome : 'Responsável não informado');
    if (dose.estado === 'administrado') return `Dado às ${formatarHorario(dose.horario)} · ${quem}${dose.origemExterna ? ` · Origem externa: ${dose.origemExterna}` : ''}`;
    return `Não foi dado · ${quem} · ${dose.motivo || 'Não disseram o motivo'}`;
  };

  const estadoBloco = (dose, grupo) => {
    if (dose.estado === 'administrado') return 'dado';
    if (dose.estado === 'nao-administrado' || grupo.situacao === 'falta') return 'falta';
    if (grupo.situacao === 'agora') return 'agora';
    return 'depois';
  };

  const desenharCompartimento = grupos => {
    const blocos = grupos.flatMap(grupo => grupo.itens.map(dose => `<span class="frasco-resumo__bloco frasco-resumo__bloco--${estadoBloco(dose, grupo)}"></span>`)).join('');
    return `<div class="frasco-resumo">
      <span class="frasco-resumo__tampa"></span>
      <span class="frasco-resumo__dobradica"></span>
      <span class="frasco-resumo__corpo"><span class="frasco-resumo__blocos">${blocos}</span></span>
      <span class="frasco-resumo__aba"></span>
    </div>`;
  };

  const renderizarRotina = grupos => {
    const doses = grupos.flatMap(grupo => grupo.itens);
    pote.innerHTML = desenharCompartimento(grupos);

    const administradas = doses.filter(dose => dose.estado === 'administrado').length;
    const naoAdministradas = doses.filter(dose => dose.estado === 'nao-administrado').length;
    const atrasadas = doses.filter(dose => dose.estado === 'prevista' && dose.momento === 'passado').length;
    const agora = doses.filter(dose => dose.estado === 'prevista' && dose.momento === 'agora').length;
    const previstas = doses.length - administradas - naoAdministradas - atrasadas - agora;
    contagem.innerHTML = [
      administradas && `<span class="rotina__legenda"><span class="frasco-resumo__bloco frasco-resumo__bloco--dado"></span>${plural(administradas, 'dada', 'dadas')}</span>`,
      naoAdministradas && `<span class="rotina__legenda"><span class="frasco-resumo__bloco frasco-resumo__bloco--falta"></span>${plural(naoAdministradas, 'não dada', 'não dadas')}</span>`,
      atrasadas && `<span class="rotina__legenda"><span class="frasco-resumo__bloco frasco-resumo__bloco--falta"></span>${plural(atrasadas, 'atrasada', 'atrasadas')}</span>`,
      agora && `<span class="rotina__legenda"><span class="frasco-resumo__bloco frasco-resumo__bloco--agora"></span>${plural(agora, 'para agora', 'para agora')}</span>`,
      previstas && `<span class="rotina__legenda"><span class="frasco-resumo__bloco frasco-resumo__bloco--depois"></span>${plural(previstas, 'para mais tarde', 'para mais tarde')}</span>`
    ].filter(Boolean).join('');

    if (!listaDoses) return;
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
    const atrasadas = grupos.flatMap(grupo => (
      grupo.momento === 'passado'
        ? grupo.itens.filter(dose => dose.estado === 'prevista').map(dose => ({ dose, grupo }))
        : []
    ));
    const proximoGrupo = grupos.find(item => !item.completo && item.momento !== 'passado');
    const proximas = proximoGrupo
      ? proximoGrupo.itens.filter(dose => dose.estado === 'prevista').map(dose => ({ dose, grupo: proximoGrupo }))
      : [];
    const itens = [...atrasadas, ...proximas];
    if (!itens.length) {
      proxima.innerHTML = '<p class="estoque__texto">Todos os remédios de hoje já foram marcados.</p>';
      return;
    }
    proxima.innerHTML = `<ul class="painel__lista">${itens.map(({ dose, grupo }) => {
      const atrasado = grupo.momento === 'passado';
      const detalhe = [atrasado && 'Atrasado', `Às ${dose.hora}`, grupo.responsavel || 'Horário sem ninguém'].filter(Boolean).join(' · ');
      return `<li class="painel__item">
        <span class="painel__icone${atrasado ? ' painel__icone--atencao' : ''}" aria-hidden="true"><i class="bi bi-capsule"></i></span>
        <span class="painel__texto"><strong>${escaparHtml(dose.hora)} · ${escaparHtml(dose.nome)}</strong><span>${escaparHtml(detalhe)}</span></span>
        <button type="button" class="botao botao--primario" data-registrar-dose="${escaparHtml(dose.chave)}">Marcar como dado</button>
      </li>`;
    }).join('')}</ul>`;
  };

  const controlesRegistros = pagina.querySelector('[data-registros-controles]');
  const buscaRegistros = pagina.querySelector('[data-registros-busca]');
  const botaoVerMaisRegistros = pagina.querySelector('[data-registros-ver-mais]');
  let filtroEstadoRegistros = 'Todos';
  let termoRegistros = '';
  let mostrarTodosRegistros = false;

  const renderizarRegistros = grupos => {
    const registradas = grupos.flatMap(grupo => grupo.itens)
      .filter(dose => dose.estado !== 'prevista')
      .reverse()
      .sort((a, b) => Number(a.estado === 'administrado') - Number(b.estado === 'administrado'));
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
      ? visiveis.map(dose => `<li class="painel__item${dose.estado === 'administrado' ? ' meds__registro--concluido' : ''}">
        <span class="painel__icone${dose.estado === 'nao-administrado' ? ' painel__icone--atencao' : ''}" aria-hidden="true"><i class="bi bi-capsule"></i></span>
        <span class="painel__texto"><strong>${escaparHtml(dose.hora)} · ${escaparHtml(dose.nome)}${escaparHtml(descreverDesvioHorario(dose))}</strong><span>${escaparHtml(descreverRegistro(dose))}</span></span>
        ${dose.estado === 'nao-administrado'
          ? `<button type="button" class="botao botao--secundario botao--pequeno" data-registrar-dose="${escaparHtml(dose.chave)}">Corrigir</button>`
          : `<button type="button" class="botao botao--secundario botao--pequeno" data-desfazer-dose="${escaparHtml(dose.chave)}">Desfazer</button>`}
      </li>`).join('')
      : (filtroAtivo
        ? '<li class="estado-vazio"><strong>Nada encontrado</strong><button type="button" class="botao botao--secundario" data-limpar-filtros-registros>Limpar filtros</button></li>'
        : '<li class="estado-vazio"><strong>Nada anotado hoje</strong><p>Os remédios dados aparecem aqui.</p></li>');
  };

  const renderizarEstoque = itens => {
    const baixos = itens.filter(item => {
      if (item.estoque === null || item.estoque === undefined) return false;
      if (item.tipo === 'Medicamento' && item.consumoDia) return item.estoque / item.consumoDia <= 3;
      return item.estoque === 0 || (item.tipo === 'Insumo' && item.estoque <= 5);
    }).sort((a, b) => a.estoque - b.estoque);
    const alertaEstoque = pagina.querySelector('[data-alerta-estoque]');
    if (alertaEstoque) {
      alertaEstoque.hidden = !baixos.length;
      if (baixos.length) {
        const principal = baixos[0];
        const dias = principal.consumoDia ? Math.floor(principal.estoque / principal.consumoDia) : null;
        alertaEstoque.querySelector('strong').textContent = `${baixos.length} item(ns) com estoque baixo · ${principal.nome}`;
        alertaEstoque.querySelector('.faixa-alerta__texto > span').textContent = dias !== null
          ? `${plural(principal.estoque, 'unidade', 'unidades')} · Dá para ${plural(dias, 'dia', 'dias')}`
          : `${plural(principal.estoque, 'unidade', 'unidades')} em estoque`;
      }
    }
    if (avisosEstoque) {
      avisosEstoque.innerHTML = baixos.length
        ? baixos.map(item => {
          const dias = item.consumoDia ? Math.floor(item.estoque / item.consumoDia) : null;
          return `<div class="estoque__aviso">
            <span class="selo selo--atencao"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Estoque baixo</span>
            <strong>${escaparHtml(item.nome)}</strong>
            <small>${plural(item.estoque, 'unidade', 'unidades')}${dias !== null ? ` · Dá para ${plural(dias, 'dia', 'dias')}` : ''}</small>
          </div>`;
        }).join('')
        : itens.some(item => item.estoque !== null)
          ? '<div class="estado-vazio"><strong>Estoque em dia</strong><p>Nada está acabando.</p></div>'
          : '<div class="estado-vazio"><strong>Nenhum saldo registrado</strong><p>Cadastre um item para acompanhar o estoque.</p></div>';
    }
    itemEmEstoque = baixos[0]?.chave || itens.find(item => item.estoque !== null)?.chave || '';
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
      : (filtroAtivo
        ? '<li class="estado-vazio"><strong>Nada encontrado</strong><button type="button" class="botao botao--secundario" data-limpar-filtros-itens>Limpar filtros</button></li>'
        : '<li class="estado-vazio"><strong>Nenhum item cadastrado</strong><p>Use Adicionar remédio ou material para cadastrar um medicamento ou insumo.</p></li>');
  };

  let portaRemedios = null;

  const renderizarPainel = (grupos = obterCompartimentos()) => {
    const itens = obterItens();
    renderizarRotina(grupos);
    renderizarProxima(grupos);
    renderizarRegistros(grupos);
    renderizarEstoque(itens);
    renderizarItens(itens);
  };

  const renderizar = () => {
    if (portaRemedios) portaRemedios.renderizar();
    else renderizarPainel();
  };

  const descreverDose = dose => {
    const item = obterItens().find(atual => atual.nome === dose.nome || atual.chave === dose.itemId);
    const detalheDose = item?.dose ? ` (${item.dose})` : '';
    const finalidade = obterEstado().finalidadesMedicacao?.[dose.itemId];
    const apelido = apelidoPessoa();
    if (finalidade) {
      return `${apelido} toma ${dose.nome}${detalheDose} às ${dose.hora}, ${finalidade}.`;
    }
    return `${dose.nome}${detalheDose} · Horário registrado para ${apelido}: ${dose.hora}.`;
  };

  const prepararDialogos = dose => {
    const grupo = obterCompartimentos().find(item => item.hora === dose.hora);
    const usuario = obterUsuarioAtual();
    const avatar = usuario.mascote || 'assets/media/mascotes/icone-mascote-cubado.svg';
    const horaAtual = `${dose.hora.replace('h', '').padStart(2, '0')}h10`;
    dialogos.registrar.querySelector('[data-dose-titulo]').textContent = `Marcar remédio - ${dose.nome}`;
    dialogos.registrar.querySelector('[data-dose-contexto]').textContent = descreverDose(dose);
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
    if (horaEl) horaEl.textContent = `Anotado às ${horaAtual}`;
    for (const dialogo of [dialogos.confirmar, dialogos.naoAdministrada]) {
      dialogo.querySelector('[data-dose-previsto]').textContent = descreverDose(dose);
    }
    const estoqueAtual = obterEstoque(dose.itemId);
    const temEstadoAnterior = dose.estado === 'nao-administrado';
    const resumoAnterior = [dose.motivo, dose.quem && `anotado por ${dose.quem}`].filter(Boolean).join(' · ');
    const efeitoSaldo = estoqueAtual !== null
      ? ` e desconta 1 unidade do estoque (saldo atual: ${estoqueAtual} → novo saldo: ${Math.max(0, estoqueAtual - 1)})`
      : '';
    for (const dialogo of [dialogos.registrar, dialogos.confirmar]) {
      const caixaAnterior = dialogo?.querySelector('[data-dose-estado-anterior]');
      if (!caixaAnterior) continue;
      caixaAnterior.hidden = !temEstadoAnterior;
      if (temEstadoAnterior) {
        caixaAnterior.querySelector('[data-dose-estado-anterior-titulo]').textContent = 'Antes: não foi dado';
        caixaAnterior.querySelector('[data-dose-estado-anterior-detalhe]').textContent =
          `${resumoAnterior ? `${resumoAnterior}. ` : ''}Marcar como dado troca o que estava anotado antes (não conta uma dose a mais)${efeitoSaldo}.`;
      }
    }
    dialogos.confirmar.querySelector('[name="horario"]').value = `${dose.hora.replace('h', '').padStart(2, '0')}:05`;
  };

  const abrirRegistro = chave => {
    const dose = obterDoses().find(item => item.chave === chave);
    if (!dose) return;
    doseEmFoco = dose;
    prepararDialogos(dose);
    core.prepararOrigemEstoque(dialogos.confirmar.querySelector('form[data-formulario-mvp]'), dose);
    dialogos.registrar.showModal();
  };

  const concluirRegistro = (estado, detalhe, origemExterna = '') => {
    if (!doseEmFoco) return;
    const dose = doseEmFoco;
    const administrada = estado === 'administrado';
    const usuario = obterUsuarioAtual();
    if (administrada && dose.estado !== 'administrado' && obterEstoque(dose.itemId) === 0 && !origemExterna) {
      anunciarStatus(elementoStatus, 'Acabou o remédio em casa. Adicione a nova caixa antes de marcar como dado.');
      abrirEstoque(dose.itemId);
      return;
    }
    const diario = administrada
      ? `${usuario.nomeComApelido} deu ${dose.nome} (${dose.hora}) às ${formatarHorario(detalhe)}.${origemExterna ? ` Origem externa: ${origemExterna}` : ''}`
      : `A dose de ${dose.nome} das ${dose.hora} não foi dada. Anotado por ${usuario.nomeComApelido}${detalhe ? ` · ${detalhe}` : ''}.`;

    atualizarEstado(estadoAtual => ({
      ...estadoAtual,
      registrosDose: { ...estadoAtual.registrosDose, [dose.chave]: administrada
        ? { estado, quem: usuario.nomeComApelido, horario: detalhe, origemExterna }
        : { estado, quem: usuario.nomeComApelido, motivo: detalhe } },
      reports: {
        ...estadoAtual.reports,
        [HOJE]: [
          [usuario.nome, usuario.papel, `Tarefa relacionada · ${dose.hora} · ${dose.nome}`, diario, ''],
          ...(estadoAtual.reports?.[HOJE] || [])
        ]
      }
    }));

    dialogos.registrada.querySelector('[data-registro-titulo]').textContent = `${administrada ? 'Remédio dado' : 'Anotado: remédio não dado'} - ${dose.nome}`;
    dialogos.registrada.querySelector('[data-registro-contexto]').textContent = `${dose.nome} · Remédio das ${dose.hora} na rotina de ${apelidoPessoa()}.`;
    dialogos.registrada.querySelector('[data-registro-agenda]').textContent = administrada
      ? `${dose.hora} · Dado às ${formatarHorario(detalhe)} · ${usuario.nomeComApelido}`
      : `${dose.hora} · Não foi dado · Anotado por ${usuario.nomeComApelido}`;
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
    const saldo = item.estoque === null ? 'Saldo não informado' : 'Tem em casa: ' + plural(item.estoque, 'unidade', 'unidades');
    dialogos.estoque.querySelector('[data-estoque-contexto]').textContent = `${core.nomePessoaAcompanhada()} · ${saldo}. Informe a quantidade adicionada.`;
    dialogos.estoque.querySelector('[data-formulario-mvp="estoque"]').reset();
    dialogos.estoque.querySelector('[name="item"]').value = item.nome;
    dialogos.estoque.showModal();
  };

  const abrirDetalhe = nome => {
    const item = obterItens().find(atual => atual.nome === nome || atual.chave === nome);
    if (!item) return;
    itemEmFoco = item;
    const iconeEl = dialogos.detalhe.querySelector('[data-detalhe-icone]');
    if (iconeEl) {
      iconeEl.innerHTML = item.tipo === 'Insumo'
        ? '<i class="fa-solid fa-box-open" aria-hidden="true"></i>'
        : '<i class="bi bi-capsule" aria-hidden="true"></i>';
    }
    dialogos.detalhe.querySelector('[data-detalhe-titulo]').textContent = item.nome;
    const pessoaEl = dialogos.detalhe.querySelector('[data-detalhe-pessoa]');
    const resumoEl = dialogos.detalhe.querySelector('[data-detalhe-resumo]');
    const secaoEstoque = dialogos.detalhe.querySelector('[data-detalhe-secao-estoque]');
    const estoqueEl = dialogos.detalhe.querySelector('[data-detalhe-estoque]');
    const secaoOrientacao = dialogos.detalhe.querySelector('[data-detalhe-secao-orientacao]');
    const orientacaoEl = dialogos.detalhe.querySelector('[data-detalhe-orientacao]');

    if (pessoaEl) pessoaEl.textContent = `${core.nomePessoaAcompanhada()} · ${item.tipo}`;
    if (resumoEl) {
      resumoEl.textContent = item.tipo === 'Insumo'
        ? 'Item de apoio e reposição contínua'
        : `${item.horarios ? `Horários: ${item.horarios}` : 'Sem horário fixo'}${item.dose ? ` · ${item.dose}` : ''}`;
    }
    if (secaoEstoque && estoqueEl) {
      const temEstoque = item.estoque !== null && item.estoque !== undefined;
      secaoEstoque.hidden = false;
      if (temEstoque) {
        const dias = item.consumoDia ? Math.floor(item.estoque / item.consumoDia) : null;
        estoqueEl.textContent = `${plural(item.estoque, 'unidade', 'unidades')} em estoque${dias !== null ? ` · Dá para ${plural(dias, 'dia', 'dias')}` : ''}`;
      } else {
        estoqueEl.textContent = 'Quantidade não informada';
      }
    }
    if (secaoOrientacao && orientacaoEl) {
      const ehInsumo = item.tipo === 'Insumo';
      secaoOrientacao.hidden = ehInsumo;
      if (!ehInsumo) {
        const finalidade = obterEstado().finalidadesMedicacao?.[item.nome] || item.finalidade || '';
        orientacaoEl.textContent = finalidade
          ? `Indicado ${finalidade}. Veja a dose na receita.`
          : 'Confira a dose na receita.';
      }
    }
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
    if (botao.hasAttribute('data-limpar-filtros-registros')) {
      termoRegistros = '';
      if (buscaRegistros) buscaRegistros.value = '';
      controlesRegistros?.querySelector('[data-registros-filtro="Todos"]')?.click();
      buscaRegistros?.focus();
      return;
    }
    if (botao.hasAttribute('data-limpar-filtros-itens')) {
      termoItens = '';
      if (buscaItens) buscaItens.value = '';
      controlesItens?.querySelector('[data-itens-filtro="Todos"]')?.click();
      buscaItens?.focus();
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
    if (botao.dataset.desfazerDose) {
      const chave = botao.dataset.desfazerDose;
      const dose = obterDoses().find(item => item.chave === chave);
      atualizarEstado(estadoAtual => ({
        ...estadoAtual,
        registrosDose: { ...(estadoAtual.registrosDose || {}), [chave]: { estado: 'prevista' } }
      }));
      anunciarStatus(elementoStatus, dose ? `Registro de ${dose.nome} (${dose.hora}) removido.` : 'Registro removido.');
      renderizar();
      return;
    }
    if (botao.dataset.etapaAdministracao) {
      if (botao.dataset.etapaAdministracao === 'dialogo-confirmar-administracao' && core.obterPreferencias().confirmarDose === false && obterEstoque(doseEmFoco.itemId) !== 0) {
        const agora = new Date();
        concluirRegistro('administrado', `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`);
        dialogos.registrar.close();
        return;
      }
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
      if (titulo) titulo.textContent = 'Adicionar remédio ou material';
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
      anunciarStatus(elementoStatus, `${nomeExibido} removido dos itens de ${apelidoPessoa()}.`);
      renderizar();
      return;
    }
    if (botao.dataset.verItem) abrirDetalhe(botao.dataset.verItem);
  });

  pagina.querySelector('[data-formulario-mvp="administrada"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    concluirRegistro('administrado', evento.target.elements.horario.value, evento.target.elements.origemExterna?.value.trim() || '');
    evento.target.closest('dialog')?.close();
  });

  pagina.querySelector('[data-formulario-mvp="nao-administrada"]')?.addEventListener('submit', evento => {
    evento.preventDefault();
    const motivo = evento.target.elements.motivo.value.trim();
    concluirRegistro('nao-administrado', motivo);
    evento.target.reset();
    evento.target.closest('dialog')?.close();
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
      anunciarStatus(elementoStatus, `${nome} adicionado aos itens de ${apelidoPessoa()}.`);
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
    alerta.querySelector('strong').textContent = pessoa.avisoTitulo || (alergias ? `Tem alergia a: ${alergias}` : 'Cuidado importante');
    alerta.querySelector('.faixa-alerta__texto > span').textContent = pessoa.avisoTexto || 'Leia o que fazer na Ficha.';
  }
  portaRemedios = window.MutiraoPortaRemedios?.montar({
    raiz: pagina.querySelector('.porta-remedios'),
    dialogo: document.getElementById('dialogo-detalhe-pote'),
    aoMudar: renderizarPainel,
    linkMedicamentos: false
  }) || null;
  if (!portaRemedios) renderizarPainel();
  const doseInicial = new URLSearchParams(location.search).get('dose');
  if (doseInicial) {
    const url = new URL(location.href);
    url.searchParams.delete('dose');
    history.replaceState(null, '', url);
    abrirRegistro(doseInicial);
  } else if (new URLSearchParams(location.search).get('estoque')) {
    const url = new URL(location.href);
    url.searchParams.delete('estoque');
    history.replaceState(null, '', url);
    abrirEstoque(itemEmEstoque);
  }
});
