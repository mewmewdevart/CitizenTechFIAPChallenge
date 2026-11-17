(() => {
  const pagina = document.querySelector('[data-pagina-mvp]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const {
    HOJE,
    obterEstado,
    atualizarEstado,
    escaparHtml,
    gerarChaveData,
    formatarData,
    formatarDataCurta,
    renderizarCalendarioMensal,
    inicializarCompartilhamento,
    anunciarStatus
  } = core;

  const tipoPagina = pagina.dataset.paginaMvp;
  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const registrarStatus = mensagem => anunciarStatus(elementoStatus, mensagem);

  const camposSensiveis = {
    carteira: {
      mascarado: '•••• •••• •••• 2048',
      visivelFicha: false,
      visivelForm: false,
      rotulo: 'carteirinha'
    },
    cpf: {
      mascarado: '***.***.***-**',
      visivelFicha: false,
      visivelForm: false,
      rotulo: 'CPF'
    },
    rg: {
      mascarado: '**.***.***-*',
      visivelFicha: false,
      visivelForm: false,
      rotulo: 'RG'
    }
  };

  const obterValorRealSensivel = chave => obterEstado().person?.[chave] || '';

  const obterValorMascarado = chave => {
    const info = camposSensiveis[chave];
    if (!info) return '';
    if (chave === 'carteira') {
      const digitos = obterValorRealSensivel(chave).replace(/\D/g, '');
      return digitos.length >= 4 ? `•••• •••• •••• ${digitos.slice(-4)}` : info.mascarado;
    }
    return info.mascarado;
  };

  const atualizarBotaoOculto = (botao, visivel, rotulo) => {
    if (!botao) return;
    botao.setAttribute('aria-pressed', String(visivel));
    botao.setAttribute('aria-label', `${visivel ? 'Ocultar' : 'Mostrar'} ${rotulo}`);
    botao.innerHTML = visivel
      ? '<i class="fa-regular fa-eye" aria-hidden="true"></i>'
      : '<img src="assets/media/icones/icone-dado-oculto.svg" alt="" aria-hidden="true" />';
  };

  const sincronizarCampoSensivel = chave => {
    const info = camposSensiveis[chave];
    if (!info) return;
    const valorReal = obterValorRealSensivel(chave);
    const textoFicha = pagina.querySelector(`[data-pessoa-campo="${chave}"]`);
    if (textoFicha) {
      textoFicha.textContent = info.visivelFicha ? (valorReal || 'Não informado') : obterValorMascarado(chave);
    }
    const botaoFicha = pagina.querySelector(`.ficha__campo-oculto[data-alternar-oculto="${chave}"]`);
    atualizarBotaoOculto(botaoFicha, info.visivelFicha, info.rotulo);

    const formulario = pagina.querySelector('[data-formulario-mvp="ficha"]');
    const inputForm = formulario?.elements?.[chave];
    if (inputForm) {
      inputForm.value = info.visivelForm ? valorReal : obterValorMascarado(chave);
      inputForm.readOnly = !info.visivelForm;
      inputForm.title = info.visivelForm ? '' : `Clique no ícone para revelar e editar ${info.rotulo}`;
    }
    const botaoForm = formulario?.querySelector(`.editar-ficha__botao-oculto[data-alternar-oculto="${chave}"]`);
    atualizarBotaoOculto(botaoForm, info.visivelForm, info.rotulo);
  };

  const sanitizarHtmlEditor = core.sanitizarHtmlEditor;
  const editoresRicos = core.inicializarEditoresRicos(pagina);

  let diaSelecionado = HOJE;
  let anoAtual = 2026;
  let mesAtual = 10;

  const obterRelatosDia = dia => obterEstado().reports?.[dia] || [];

  const renderizarMes = () => {
    renderizarCalendarioMensal(pagina.querySelector('[data-mes]'), {
      ano: anoAtual,
      mes: mesAtual,
      diaSelecionado,
      obterMetaDia: chave => {
        const total = obterRelatosDia(chave).length;
        const completo = total >= 4;
        const parcial = total > 0 && !completo;
        const simbolo = completo ? '✓' : parcial ? '•' : '';
        const classe = completo ? 'calendario-mensal__indicador--sucesso' : 'calendario-mensal__indicador--atencao';
        return {
          indicadores: simbolo ? [`<span class="${classe}">${simbolo}</span>`] : [],
          sufixoRotulo: completo ? ', relatos completos' : parcial ? ', com relatos' : ''
        };
      }
    });
  };

  const renderizarRelatos = () => {
    const containerRelatos = pagina.querySelector('[data-relatos]');
    if (!containerRelatos) return;

    const itens = obterRelatosDia(diaSelecionado);
    const resumo = itens.length
      ? `<p class="ficha__relatos-resumo">${itens.length >= 4 ? 'Todos os turnos com relato · ' : 'Relatos parciais · '}${itens.length} ${itens.length === 1 ? 'turno registrado' : 'turnos registrados'}</p>`
      : '<p class="ficha__relatos-resumo">Nenhum relato nesta data.</p>';

    containerRelatos.innerHTML = `${resumo}<h3>${formatarDataCurta(diaSelecionado, true)}</h3>${itens.map(([nome, papel, contexto, relato, proximo]) => {
      const avatar = nome.startsWith('Ana')
        ? 'icone-mascote-espeto.svg'
        : nome.startsWith('Beatriz')
          ? 'icone-mascote-trevo.svg'
          : nome.startsWith('Paulo')
            ? 'icone-mascote-pingo.svg'
            : 'icone-mascote-cubado.svg';
      const partes = String(papel || '').split(' · ');
      const turno = partes.find(parte => parte.startsWith('Turno'));
      const papelRestante = partes.filter(parte => parte !== turno).join(' · ');
      const [tarefa, ocorrencia] = contexto ? contexto.split(' · Ocorrência') : ['', ''];

      return `<article class="ficha__relato">
        <div class="ficha__relato-autor">
          <img alt="" src="assets/media/mascotes/${avatar}">
          <div><strong>${escaparHtml(nome)}</strong><p>${escaparHtml(papelRestante)}</p></div>
          ${turno ? `<span class="ficha__etiqueta">${escaparHtml(turno)}</span>` : ''}
        </div>
        ${tarefa ? `<p class="ficha__texto-suave ficha__relato-meta"><i class="fa-solid fa-briefcase" aria-hidden="true"></i> ${escaparHtml(tarefa)}</p>` : ''}
        ${ocorrencia ? `<p class="ficha__texto-suave ficha__relato-meta"><i class="fa-regular fa-note-sticky" aria-hidden="true"></i> Ocorrência${escaparHtml(ocorrencia)}</p>` : ''}
        <div class="ficha__relato-conteudo">${sanitizarHtmlEditor(relato)}</div>
        ${proximo ? `<div class="ficha__proximo-turno"><strong>Para o próximo turno</strong><div class="ficha__relato-conteudo">${sanitizarHtmlEditor(String(proximo).replaceAll('\n', '<br>'))}</div></div>` : ''}
      </article>`;
    }).join('')}`;
  };

  const renderizarConsultas = () => {
    const estado = obterEstado();
    const eventos = core.obterCompromissos(estado);
    const exames = estado.documents.filter(doc => doc.categoria === 'Exame')
      .sort((a, b) => b.dia.localeCompare(a.dia));
    const detalheExame = doc => `documentos.html?documento=${encodeURIComponent(doc.id)}`;
    const listaResumo = pagina.querySelector('[data-consultas-resumo]');
    if (listaResumo) {
      const itensHtml = eventos.slice(0, 3).map(item => {
        const ehHoje = item.dia === HOJE;
        const tituloDia = ehHoje
          ? `Hoje · ${item.titulo} às ${item.hora.replace(':00', 'h')}`
          : `${item.titulo} · ${formatarData(item.dia, { day: 'numeric', month: 'short' })}`;
        const subtitulo = [item.hora.replace(':00', 'h'), item.local, item.acompanhante && `${item.acompanhante} acompanha`]
          .filter(Boolean)
          .join(' · ');
        const icone = item.titulo.toLowerCase().includes('hemoglobina') || item.titulo.toLowerCase().includes('exame')
          ? 'icone-exame.svg'
          : 'icone-consulta.svg';
        return `<div class="ficha__linha-icone"><img alt="" src="assets/media/icones/${icone}">
          <dt><a href="agenda.html?dia=${escaparHtml(item.dia)}">${escaparHtml(tituloDia)}</a></dt>
          <dd>${escaparHtml(subtitulo)}</dd>
        </div>`;
      }).join('');

      const exame = exames[0];
      const ultimoExame = exame ? `<div class="ficha__linha-icone"><img alt="" src="assets/media/icones/icone-documento.svg">
        <dt>Último exame cadastrado</dt>
        <dd><a href="${detalheExame(exame)}">${escaparHtml(exame.titulo)} · ${escaparHtml(formatarData(exame.dia, { day: 'numeric', month: 'short' }))}</a></dd>
      </div>` : '';

      listaResumo.innerHTML = itensHtml + ultimoExame || '<div><dt>Nenhum compromisso ou exame cadastrado</dt></div>';
    }

    const listaExames = pagina.querySelector('[data-lista-exames]');
    if (listaExames) {
      listaExames.innerHTML = [
        ...eventos.map(item => `<p><a href="agenda.html?dia=${escaparHtml(item.dia)}">${escaparHtml(formatarData(item.dia, { day: 'numeric', month: 'short' }))} · ${escaparHtml(item.hora.replace(':00', 'h'))} · ${escaparHtml(item.titulo)}</a></p>`),
        ...exames.map(doc => `<p><a href="${detalheExame(doc)}">${escaparHtml(formatarData(doc.dia, { day: 'numeric', month: 'short' }))} · ${escaparHtml(doc.titulo)} (Documentos)</a></p>`)
      ].join('') || '<p>Nenhum compromisso ou exame cadastrado.</p>';
    }
  };

  const AVISO_TITULO_PADRAO = 'Alergia à dipirona';
  const AVISO_TEXTO_PADRAO = 'Não administrar. Em caso de dúvida, consultar o responsável antes.';

  const atualizarAvisoAlergia = person => {
    const aviso = pagina.querySelector('[data-aviso-alergia]');
    if (!aviso) return;
    const titulo = aviso.querySelector('[data-aviso-alergia-titulo]');
    const texto = aviso.querySelector('[data-aviso-alergia-texto]');
    const alergias = String(person.alergias || '')
      .split(',')
      .map(i => i.trim())
      .filter(Boolean);
    const tituloCustom = (person.avisoTitulo || '').trim();
    const textoCustom = (person.avisoTexto || '').trim();

    if (!alergias.length && !tituloCustom && !textoCustom) {
      aviso.hidden = true;
      return;
    }
    aviso.hidden = false;
    if (titulo) {
      titulo.textContent = tituloCustom || (
        alergias.length === 1 && alergias[0].toLowerCase() === 'dipirona'
          ? AVISO_TITULO_PADRAO
          : `Alergias: ${alergias.join(', ')}`
      );
    }
    if (texto) {
      texto.textContent = textoCustom || AVISO_TEXTO_PADRAO;
    }
  };

  const opcaoImpressaoAtiva = chave => {
    const input = pagina.querySelector(`[data-impressao-opcao="${chave}"]`);
    return input ? input.checked : true;
  };

  const formularioFicha = pagina.querySelector('[data-formulario-mvp="ficha"]');
  const botaoSalvarFicha = formularioFicha?.querySelector('button[type="submit"]');
  let snapshotFicha = '';

  const serializarFormularioFicha = () => {
    if (!formularioFicha) return '';
    editoresRicos.sincronizarTodos(formularioFicha);
    const dados = [...new FormData(formularioFicha).entries()].map(([k, v]) => [k, String(v)]);
    const previaFoto = formularioFicha.querySelector('[data-foto-previa]');
    dados.push(['__fotoRemovida', previaFoto?.dataset.fotoRemovida || '']);
    dados.push(['__fotoAtualizada', previaFoto?.dataset.fotoAtualizada || '']);
    return JSON.stringify(dados);
  };

  const atualizarBotaoSalvarFicha = () => {
    if (!botaoSalvarFicha || !formularioFicha) return;
    const semAlteracoes = serializarFormularioFicha() === snapshotFicha;
    botaoSalvarFicha.disabled = semAlteracoes;
    botaoSalvarFicha.setAttribute('aria-disabled', String(semAlteracoes));
  };

  const atualizarContadoresAviso = () => {
    if (!formularioFicha) return;
    for (const [campo, limite] of [['avisoTitulo', 24], ['avisoTexto', 70]]) {
      const input = formularioFicha.elements[campo];
      const contador = formularioFicha.querySelector(`[data-contador-aviso="${campo}"]`);
      if (input && contador) contador.textContent = `${input.value.length}/${limite} caracteres`;
    }
  };

  if (formularioFicha) {
    ['input', 'change'].forEach(tipoEvento => {
      formularioFicha.addEventListener(tipoEvento, () => {
        atualizarContadoresAviso();
        atualizarBotaoSalvarFicha();
      });
    });
    formularioFicha.addEventListener('click', () => {
      requestAnimationFrame(atualizarBotaoSalvarFicha);
    });
  }

  const renderizarImpressao = () => {
    const lista = pagina.querySelector('[data-impressao-lista]');
    if (!lista) return;
    const estado = obterEstado();
    const person = estado.person;

    const elIdade = pagina.querySelector('[data-impressao-idade]');
    const elNasc = pagina.querySelector('[data-impressao-nascimento]');
    if (person.nascimento) {
      const nascimento = formatarData(person.nascimento, { day: 'numeric', month: 'long', year: 'numeric' });
      let anos = Number(HOJE.slice(0, 4)) - Number(person.nascimento.slice(0, 4));
      if (HOJE.slice(5) < person.nascimento.slice(5)) anos--;
      if (elIdade) elIdade.textContent = `${anos} anos`;
      if (elNasc) elNasc.textContent = nascimento;
    } else {
      if (elIdade) elIdade.textContent = 'Não informada';
      if (elNasc) elNasc.textContent = 'Não informada';
    }

    const elMascote = pagina.querySelector('[data-impressao-mascote]');
    if (elMascote) {
      elMascote.src = person.mascote || 'assets/media/mascotes/icone-mascote-minhoca.svg';
    }

    const alergias = String(person.alergias || '').trim();
    const blocoAlergia = alergias
      ? `<div class="folha-impressao__alerta">
          <strong><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Alergia à ${escaparHtml(alergias.toLowerCase())}</strong>
          <p>Não administrar. Em caso de dúvida, consultar o responsável antes.</p>
        </div>`
      : `<div class="folha-impressao__cartao">
          <h4>Alergias registradas</h4>
          <p>Nenhuma alergia registrada até o momento.</p>
        </div>`;

    const medicamentosLista = String(person.medicamentos || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    const medicamentosHtml = medicamentosLista.length
      ? `<ul class="folha-impressao__lista">${medicamentosLista.map(item => `<li>${escaparHtml(item)}</li>`).join('')}</ul>`
      : '<p>Nenhum medicamento registrado</p>';

    const incluirCondicoes = opcaoImpressaoAtiva('condicoes');
    const incluirHistorico = opcaoImpressaoAtiva('historico');
    const incluirEventos = opcaoImpressaoAtiva('eventos');
    const incluirConvenio = opcaoImpressaoAtiva('convenio');
    const incluirAlternativo = opcaoImpressaoAtiva('alternativo');
    const incluirPreferencias = opcaoImpressaoAtiva('preferencias');

    const cartaoCondicoes = incluirCondicoes
      ? `<section class="folha-impressao__cartao">
          <h4>Condições de saúde registradas</h4>
          <p>${escaparHtml(person.condicoes || 'Nenhuma registrada')}</p>
        </section>`
      : '';

    const cartaoMedicamentos = `<section class="folha-impressao__cartao">
      <h4>Medicamentos de uso diário</h4>
      ${medicamentosHtml}
    </section>`;

    const secaoHistorico = incluirHistorico
      ? `<section class="folha-impressao__secao">
          <h4>Cirurgias e histórico</h4>
          <div class="folha-impressao__texto-rico">${sanitizarHtmlEditor(person.historicoSaude) || '<p>Não informado</p>'}</div>
        </section>`
      : '';

    const eventosHtml = (estado.events || []).length
      ? `<ul class="folha-impressao__lista">${estado.events.map(item => {
          const dataItem = formatarData(item.dia, { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ de /g, ' ').replace('.', '') + '.';
          const horaItem = item.hora ? item.hora.replace(':00', 'h') : '';
          const localTexto = item.local ? ` · ${item.local}` : '';
          const respTexto = item.acompanhante ? ` · ${item.acompanhante} acompanha.` : '';
          return `<li>${escaparHtml(`${dataItem}${horaItem ? `, ${horaItem}` : ''} · ${item.titulo}${localTexto}${respTexto}`)}</li>`;
        }).join('')}</ul>`
      : '<p>Nenhum compromisso agendado</p>';

    const secaoEventos = incluirEventos
      ? `<section class="folha-impressao__secao">
          <h4>Consultas e exames</h4>
          ${eventosHtml}
        </section>`
      : '';

    const secaoPreferencias = incluirPreferencias && person.preferencias
      ? `<section class="folha-impressao__secao">
          <h4>Preferências de cuidado</h4>
          <p>${escaparHtml(person.preferencias)}</p>
        </section>`
      : '';

    lista.innerHTML = `
      ${blocoAlergia}
      <div class="folha-impressao__grade">
        ${cartaoCondicoes}
        ${cartaoMedicamentos}
      </div>
      ${secaoHistorico}
      ${secaoEventos}
      ${secaoPreferencias}
      <section class="folha-impressao__cartao">
        <h4>Contato de referência</h4>
        <p>${escaparHtml(person.referencia || 'Não informado')}</p>
        ${incluirAlternativo && person.alternativo ? `<p>Contato alternativo: ${escaparHtml(person.alternativo)}</p>` : ''}
        ${incluirConvenio && person.convenio ? `<p class="folha-impressao__convenio">Convênio: ${escaparHtml(person.convenio)}</p>` : ''}
      </section>
    `;
  };

  pagina.querySelectorAll('[data-impressao-opcao]').forEach(checkbox => {
    checkbox.addEventListener('change', renderizarImpressao);
  });

  const renderizarPessoa = () => {
    window.dispatchEvent(new Event('mutirao:pessoa-atualizada'));
    const person = obterEstado().person;
    if (!person) return;

    const { nome, apelido } = person;
    pagina.querySelectorAll('[data-pessoa-nome]').forEach(no => {
      no.textContent = nome + (apelido ? ` (${apelido})` : '');
    });
    const nomeCompletoEl = pagina.querySelector('[data-pessoa-nome-completo]');
    if (nomeCompletoEl) nomeCompletoEl.textContent = nome;

    atualizarAvisoAlergia(person);

    const formulario = pagina.querySelector('[data-formulario-mvp="ficha"]');
    const campos = formulario?.elements;
    if (campos) {
      campos.nome.value = nome;
      campos.apelido.value = apelido;
      if (campos.telefoneFixo) campos.telefoneFixo.value = person.telefoneFixo || '';
      if (campos.celular) campos.celular.value = person.celular || '';
      if (campos.avisoTitulo) campos.avisoTitulo.value = (person.avisoTitulo || AVISO_TITULO_PADRAO).slice(0, 24);
      if (campos.avisoTexto) campos.avisoTexto.value = (person.avisoTexto || AVISO_TEXTO_PADRAO).slice(0, 70);
      atualizarContadoresAviso();
    }

    const mascoteAtual = person.mascote || 'assets/media/mascotes/icone-mascote-minhoca.svg';
    pagina.querySelectorAll('.ficha__mascote, .ficha__alerta-mascote').forEach(img => {
      img.src = mascoteAtual;
    });
    if (formulario) {
      const inputMascote = formulario.querySelector('[data-input-mascote]');
      if (inputMascote) inputMascote.value = mascoteAtual;
      formulario.querySelectorAll('.editar-ficha__mascote-cartao').forEach(cartao => {
        const ativo = cartao.dataset.mascote === mascoteAtual;
        cartao.setAttribute('aria-pressed', String(ativo));
        const rotulo = cartao.querySelector('span');
        if (rotulo) rotulo.textContent = ativo ? 'Selecionado' : 'Selecionar';
      });

      const temFoto = Boolean(person.foto);
      const imgRetrato = pagina.querySelector('.ficha__retrato > img:first-child');
      const imgMascoteRetrato = pagina.querySelector('.ficha__mascote');
      const imgPrevia = formulario.querySelector('[data-foto-previa]');
      const botaoRemoverFoto = formulario.querySelector('[data-remover-foto]');
      const botaoFoto = formulario.querySelector('[data-botao-foto]');

      if (imgRetrato) imgRetrato.src = temFoto ? person.foto : mascoteAtual;
      if (imgMascoteRetrato) imgMascoteRetrato.hidden = !temFoto;
      if (imgPrevia) {
        imgPrevia.src = temFoto ? person.foto : mascoteAtual;
        delete imgPrevia.dataset.fotoAtualizada;
        if (temFoto) delete imgPrevia.dataset.fotoRemovida;
        else imgPrevia.dataset.fotoRemovida = 'true';
      }
      if (botaoRemoverFoto) botaoRemoverFoto.hidden = !temFoto;
      if (botaoFoto) botaoFoto.textContent = temFoto ? 'Trocar foto' : 'Adicionar foto';
    }

    const elTelefones = pagina.querySelector('[data-pessoa-campo="telefones"]');
    if (elTelefones) {
      const partes = [person.telefoneFixo && `Fixo ${person.telefoneFixo}`, person.celular && `Celular ${person.celular}`].filter(Boolean);
      elTelefones.textContent = partes.join(' · ') || 'Não informado';
    }

    pagina.querySelectorAll('[data-pessoa-campo]').forEach(no => {
      const chave = no.dataset.pessoaCampo;
      if (chave === 'telefones') return;
      if (chave in camposSensiveis) {
        sincronizarCampoSensivel(chave);
        return;
      }
      const valor = person[chave];
      if (campos?.[chave]) campos[chave].value = valor ?? '';

      if (chave === 'historicoSaude') {
        const htmlSeguro = sanitizarHtmlEditor(valor);
        no.innerHTML = htmlSeguro || 'Não informado';
        const areaEditor = formulario?.querySelector('[data-editor-alvo="historicoSaude"]');
        if (areaEditor) {
          areaEditor.innerHTML = htmlSeguro;
          editoresRicos.sincronizarTodos(formulario);
        }
      } else if (chave === 'alergias' || chave === 'condicoes') {
        const itens = String(valor || '').split(',').map(item => item.trim()).filter(Boolean);
        const classeEtiqueta = chave === 'alergias' ? 'ficha__etiqueta ficha__etiqueta--alerta' : 'ficha__etiqueta';
        no.innerHTML = itens.length
          ? itens.map(item => `<span class="${classeEtiqueta}">${escaparHtml(item)}</span>`).join(' ')
          : 'Nenhuma registrada';
        const listaModal = formulario?.querySelector(`[data-lista-etiquetas="${chave}"]`);
        if (listaModal) {
          listaModal.querySelectorAll('.ficha__etiqueta').forEach(etiqueta => etiqueta.remove());
          const inputEtiqueta = listaModal.querySelector('.editar-ficha__input-etiqueta');
          itens.forEach(item => {
            const span = document.createElement('span');
            span.className = classeEtiqueta;
            span.innerHTML = `${escaparHtml(item)} <button type="button" class="editar-ficha__remover-etiqueta" aria-label="Remover ${escaparHtml(item)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
            listaModal.insertBefore(span, inputEtiqueta);
          });
        }
      } else if (chave === 'medicamentos') {
        const itens = String(valor || '').split(',').map(item => item.trim()).filter(Boolean);
        no.innerHTML = itens.length
          ? itens.map(item => `<span class="ficha__etiqueta ficha__etiqueta--atencao ficha__etiqueta--medicamento">${escaparHtml(item)}</span>`).join(' ')
          : 'Nenhum registrado';
      } else if (chave === 'nascimento' && valor) {
        const nascimento = formatarData(valor, { day: 'numeric', month: 'long', year: 'numeric' });
        let anos = Number(HOJE.slice(0, 4)) - Number(valor.slice(0, 4));
        if (HOJE.slice(5) < valor.slice(5)) anos--;
        no.textContent = `${nascimento} · ${anos} anos`;
        const elNascimento = pagina.querySelector('[data-pessoa-nascimento]');
        if (elNascimento) elNascimento.textContent = `${anos} anos · ${nascimento}`;
      } else {
        no.textContent = valor || 'Não informado';
        if (chave === 'nascimento') {
          const elNascimento = pagina.querySelector('[data-pessoa-nascimento]');
          if (elNascimento) elNascimento.textContent = '';
        }
      }
    });

    renderizarImpressao();
    if (formulario) {
      snapshotFicha = serializarFormularioFicha();
      atualizarBotaoSalvarFicha();
    }
  };

  const renderizar = () => {
    renderizarMes();
    if (tipoPagina === 'ficha') {
      renderizarRelatos();
      renderizarPessoa();
      renderizarConsultas();
    }
  };

  const sincronizarInputEtiquetas = lista => {
    if (!lista) return;
    const chave = lista.dataset.listaEtiquetas;
    const inputOculto = pagina.querySelector(`[data-input-etiquetas="${chave}"]`);
    if (inputOculto) {
      inputOculto.value = [...lista.querySelectorAll('.ficha__etiqueta')]
        .map(el => el.textContent.trim())
        .join(', ');
    }
  };

  const adicionarEtiqueta = (lista, textoBruto) => {
    const valor = String(textoBruto || '').replace(/,+$/, '').trim();
    if (!lista || !valor) return;
    const jaExiste = [...lista.querySelectorAll('.ficha__etiqueta')]
      .some(el => el.textContent.trim().toLowerCase() === valor.toLowerCase());
    if (!jaExiste) {
      const ehAlergia = lista.dataset.listaEtiquetas === 'alergias';
      const span = document.createElement('span');
      span.className = ehAlergia ? 'ficha__etiqueta ficha__etiqueta--alerta' : 'ficha__etiqueta';
      span.innerHTML = `${escaparHtml(valor)} <button type="button" class="editar-ficha__remover-etiqueta" aria-label="Remover ${escaparHtml(valor)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
      lista.insertBefore(span, lista.querySelector('.editar-ficha__input-etiqueta'));
      sincronizarInputEtiquetas(lista);
    }
  };

  const dialogoEditarFicha = document.getElementById('dialogo-editar-ficha');
  document.querySelector('[data-dialogo="dialogo-editar-ficha"]')?.addEventListener('click', () => {
    Object.keys(camposSensiveis).forEach(chave => {
      camposSensiveis[chave].visivelForm = false;
    });
    renderizarPessoa();
  });

  dialogoEditarFicha?.addEventListener('close', () => {
    Object.keys(camposSensiveis).forEach(chave => {
      camposSensiveis[chave].visivelForm = false;
    });
    renderizarPessoa();
  });

  pagina.addEventListener('click', evento => {
    const caixaEtiquetas = evento.target.closest('[data-lista-etiquetas]');
    if (caixaEtiquetas && !evento.target.closest('button')) {
      caixaEtiquetas.querySelector('.editar-ficha__input-etiqueta')?.focus();
    }

    const botao = evento.target.closest('button');
    if (!botao) return;

    if (botao.dataset.passoMes) {
      const proximo = new Date(anoAtual, mesAtual + Number(botao.dataset.passoMes), 1);
      anoAtual = proximo.getFullYear();
      mesAtual = proximo.getMonth();
      diaSelecionado = gerarChaveData(anoAtual, mesAtual, 1);
      renderizar();
    }

    if (botao.dataset.selecionarDia) {
      diaSelecionado = botao.dataset.selecionarDia;
      renderizar();
      pagina.querySelector(`[data-selecionar-dia="${diaSelecionado}"]`)?.focus();
    }

    if (botao.dataset.alternarOculto) {
      const chave = botao.dataset.alternarOculto;
      const info = camposSensiveis[chave];
      if (info) {
        if (botao.closest('#dialogo-editar-ficha')) {
          const inputForm = botao.closest('form')?.elements?.[chave];
          if (info.visivelForm && inputForm) {
            const valorAtual = inputForm.value.trim();
            if (valorAtual) {
              atualizarEstado(estado => ({
                ...estado,
                person: { ...estado.person, [chave]: valorAtual }
              }));
            }
          }
          info.visivelForm = !info.visivelForm;
        } else {
          info.visivelFicha = !info.visivelFicha;
        }
        sincronizarCampoSensivel(chave);
      }
    }

    if (botao.hasAttribute('data-mvp-imprimir')) {
      renderizarImpressao();
      window.print();
    }

    if (botao.hasAttribute('data-fechar-dialogo')) {
      botao.closest('dialog')?.close();
    }

    if (botao.hasAttribute('data-botao-foto')) {
      pagina.querySelector('[data-input-foto]')?.click();
    }

    if (botao.hasAttribute('data-remover-foto')) {
      const formulario = botao.closest('form');
      const previa = formulario?.querySelector('[data-foto-previa]');
      const inputMascote = formulario?.querySelector('[data-input-mascote]');
      const inputFoto = formulario?.querySelector('[data-input-foto]');
      const botaoFoto = formulario?.querySelector('[data-botao-foto]');
      if (previa) {
        previa.src = inputMascote?.value || 'assets/media/mascotes/icone-mascote-minhoca.svg';
        previa.dataset.fotoRemovida = 'true';
        delete previa.dataset.fotoAtualizada;
      }
      if (inputFoto) inputFoto.value = '';
      botao.hidden = true;
      if (botaoFoto) botaoFoto.textContent = 'Adicionar foto';
    }

    if (botao.dataset.mascote) {
      const formulario = botao.closest('form');
      const inputMascote = formulario?.querySelector('[data-input-mascote]');
      if (inputMascote) inputMascote.value = botao.dataset.mascote;
      const previa = formulario?.querySelector('[data-foto-previa]');
      if (previa?.dataset.fotoRemovida === 'true') {
        previa.src = botao.dataset.mascote;
      }
      formulario?.querySelectorAll('.editar-ficha__mascote-cartao').forEach(cartao => {
        const ativo = cartao === botao;
        cartao.setAttribute('aria-pressed', String(ativo));
        const rotulo = cartao.querySelector('span');
        if (rotulo) rotulo.textContent = ativo ? 'Selecionado' : 'Selecionar';
      });
    }

    if (botao.classList.contains('editar-ficha__remover-etiqueta')) {
      const lista = botao.closest('[data-lista-etiquetas]');
      botao.closest('.ficha__etiqueta')?.remove();
      sincronizarInputEtiquetas(lista);
    }
  });

  pagina.addEventListener('keydown', evento => {
    const inputEtiqueta = evento.target.closest('.editar-ficha__input-etiqueta');
    if (!inputEtiqueta) return;
    const lista = inputEtiqueta.closest('[data-lista-etiquetas]');

    if (evento.key === 'Enter' || evento.key === ',') {
      evento.preventDefault();
      adicionarEtiqueta(lista, inputEtiqueta.value);
      inputEtiqueta.value = '';
    } else if (evento.key === 'Backspace' && !inputEtiqueta.value) {
      const etiquetas = lista?.querySelectorAll('.ficha__etiqueta');
      const ultima = etiquetas?.[etiquetas.length - 1];
      if (ultima) {
        ultima.remove();
        sincronizarInputEtiquetas(lista);
      }
    }
  });

  pagina.addEventListener('focusout', evento => {
    const inputEtiqueta = evento.target.closest('.editar-ficha__input-etiqueta');
    if (!inputEtiqueta || !inputEtiqueta.value.trim()) return;
    const lista = inputEtiqueta.closest('[data-lista-etiquetas]');
    adicionarEtiqueta(lista, inputEtiqueta.value);
    inputEtiqueta.value = '';
  });

  pagina.querySelector('[data-input-foto]')?.addEventListener('change', evento => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    if (!['image/jpeg', 'image/png'].includes(arquivo.type)) {
      registrarStatus('Selecione uma imagem em formato JPG ou PNG.');
      evento.target.value = '';
      return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      registrarStatus('A imagem deve ter no máximo 2 MB.');
      evento.target.value = '';
      return;
    }
    const leitor = new FileReader();
    leitor.onerror = () => registrarStatus('Não foi possível ler a imagem selecionada.');
    leitor.onload = () => {
      const previa = pagina.querySelector('[data-foto-previa]');
      const formulario = previa?.closest('form');
      const botaoRemoverFoto = formulario?.querySelector('[data-remover-foto]');
      const botaoFoto = formulario?.querySelector('[data-botao-foto]');
      if (previa && typeof leitor.result === 'string') {
        previa.src = leitor.result;
        previa.dataset.fotoAtualizada = leitor.result;
        delete previa.dataset.fotoRemovida;
      }
      if (botaoRemoverFoto) botaoRemoverFoto.hidden = false;
      if (botaoFoto) botaoFoto.textContent = 'Trocar foto';
    };
    leitor.readAsDataURL(arquivo);
  });

  pagina.addEventListener('submit', evento => {
    const formulario = evento.target;
    const tipoFormulario = formulario.dataset.formularioMvp;
    if (!tipoFormulario) return;

    evento.preventDefault();
    editoresRicos.sincronizarTodos(formulario);
    if (tipoFormulario === 'ficha') {
      formulario.querySelectorAll('.editar-ficha__input-etiqueta').forEach(inputEtiqueta => {
        if (!inputEtiqueta.value.trim()) return;
        adicionarEtiqueta(inputEtiqueta.closest('[data-lista-etiquetas]'), inputEtiqueta.value);
        inputEtiqueta.value = '';
      });
      if (serializarFormularioFicha() === snapshotFicha) return;
    }

    const campos = Object.fromEntries(new FormData(formulario));
    let mensagem = '';

    if (tipoFormulario === 'ficha') {
      const estadoAnterior = obterEstado().person;
      Object.keys(camposSensiveis).forEach(chave => {
        const valorInformado = (campos[chave] || '').trim();
        if (valorInformado && valorInformado !== obterValorMascarado(chave)) {
          campos[chave] = valorInformado;
        } else {
          campos[chave] = estadoAnterior[chave] || '';
        }
      });

      const previaFoto = formulario.querySelector('[data-foto-previa]');
      if (previaFoto?.dataset.fotoRemovida === 'true') {
        campos.foto = '';
      } else if (previaFoto?.dataset.fotoAtualizada) {
        campos.foto = previaFoto.dataset.fotoAtualizada;
      } else {
        campos.foto = estadoAnterior.foto || '';
      }

      campos.avisoTitulo = (campos.avisoTitulo || '').trim().slice(0, 24);
      campos.avisoTexto = (campos.avisoTexto || '').trim().slice(0, 70);

      atualizarEstado(estado => ({
        ...estado,
        person: { ...estado.person, ...campos }
      }));
      mensagem = 'Ficha atualizada nesta sessão.';
    }

    if (tipoFormulario === 'relato') {
      const textoRelato = (campos.relato || '').trim();
      if (!textoRelato) {
        registrarStatus('Descreva o relato do turno antes de salvar.');
        return;
      }
      const turno = campos.turno || 'Turno 19h–24h';
      const usuario = core.obterUsuarioAtual ? core.obterUsuarioAtual() : { nome: 'Zé da Manga', papel: 'Administrador' };
      atualizarEstado(estado => ({
        ...estado,
        reports: {
          ...estado.reports,
          [campos.dia]: [
            [usuario.nome, `${usuario.papel} · ${turno}`, '', textoRelato, (campos.recado || '').trim()],
            ...(estado.reports[campos.dia] || [])
          ]
        }
      }));
      diaSelecionado = campos.dia;
      anoAtual = Number(diaSelecionado.slice(0, 4));
      mesAtual = Number(diaSelecionado.slice(5, 7)) - 1;
      mensagem = 'Relato salvo no Diário de turno.';
    }

    formulario.closest('dialog')?.close();
    if (tipoFormulario !== 'ficha') {
      formulario.reset();
      editoresRicos.limparTodos(formulario);
    }
    registrarStatus(mensagem);
    renderizar();
  });

  inicializarCompartilhamento(
    pagina.querySelector('[data-previa-compartilhar]')?.closest('dialog'),
    {
      assuntoEmail: 'Mutirão · Resumo de cuidado',
      gerarSecoes: () => {
        const estado = obterEstado();
        const person = estado.person;
        return {
          'Consultas e exames': () => estado.events
            .map(item => `${formatarData(item.dia, { day: 'numeric', month: 'short' })} · ${item.hora} · ${item.titulo}`)
            .join('\n') || 'Nenhum compromisso agendado.',
          'Informações de saúde': () => [
            `Alergias: ${person.alergias || 'Nenhuma registrada'}`,
            `Condições: ${person.condicoes || 'Nenhuma registrada'}`
          ].join('\n'),
          'Medicamentos de uso diário': () => person.medicamentos || 'Nenhum registrado.'
        };
      }
    }
  );

  renderizar();
})();
