(() => {
  const pagina = document.querySelector('[data-pagina-mvp]');
  if (!pagina) return;

  const tipoPagina = pagina.dataset.paginaMvp;
  const dadosSalvos = {};

  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const salvarDados = mensagem => {
    if (elementoStatus) elementoStatus.textContent = mensagem;
  };

  const camposSensiveis = {
    carteira: {
      mascarado: '•••• •••• •••• 2048',
      real: '4128 9910 3304 2048',
      visivelFicha: false,
      visivelForm: false,
      rotulo: 'carteirinha'
    },
    cpf: {
      mascarado: '***.***.***-**',
      real: '123.456.789-00',
      visivelFicha: false,
      visivelForm: false,
      rotulo: 'CPF'
    },
    rg: {
      mascarado: '**.***.***-*',
      real: '12.345.678-9',
      visivelFicha: false,
      visivelForm: false,
      rotulo: 'RG'
    }
  };

  const obterValorMascarado = chave => {
    const info = camposSensiveis[chave];
    if (!info) return '';
    if (chave === 'carteira') {
      const digitos = info.real.replace(/\D/g, '');
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
    const textoFicha = pagina.querySelector(`[data-pessoa-campo="${chave}"]`);
    if (textoFicha) {
      textoFicha.textContent = info.visivelFicha ? info.real : obterValorMascarado(chave);
    }
    const botaoFicha = pagina.querySelector(`.ficha__campo-oculto[data-alternar-oculto="${chave}"]`);
    atualizarBotaoOculto(botaoFicha, info.visivelFicha, info.rotulo);

    const formulario = pagina.querySelector('[data-formulario-mvp="ficha"]');
    const inputForm = formulario?.elements?.[chave];
    if (inputForm) {
      inputForm.value = info.visivelForm ? info.real : obterValorMascarado(chave);
    }
    const botaoForm = formulario?.querySelector(`.editar-ficha__botao-oculto[data-alternar-oculto="${chave}"]`);
    atualizarBotaoOculto(botaoForm, info.visivelForm, info.rotulo);
  };

  const sanitizarHtmlEditor = html => {
    const template = document.createElement('template');
    template.innerHTML = String(html ?? '');
    const tagsPermitidas = new Set(['B', 'STRONG', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV']);
    const limparNo = no => {
      [...no.childNodes].forEach(filho => {
        if (filho.nodeType !== Node.ELEMENT_NODE) return;
        if (!tagsPermitidas.has(filho.tagName)) {
          filho.replaceWith(document.createTextNode(filho.textContent || ''));
          return;
        }
        [...filho.attributes].forEach(attr => filho.removeAttribute(attr.name));
        limparNo(filho);
      });
    };
    limparNo(template.content);
    return template.innerHTML.trim();
  };

  const sincronizarEditorRico = editor => {
    if (!editor) return;
    const area = editor.querySelector('[data-editor-alvo]');
    if (!area) return;
    const chave = area.dataset.editorAlvo;
    const inputOculto = pagina.querySelector(`[data-input-editor="${chave}"]`);
    if (inputOculto) {
      inputOculto.value = sanitizarHtmlEditor(area.innerHTML);
    }
    editor.querySelectorAll('[data-comando-editor]').forEach(botao => {
      try {
        botao.setAttribute('aria-pressed', String(document.queryCommandState(botao.dataset.comandoEditor)));
      } catch {
        botao.setAttribute('aria-pressed', 'false');
      }
    });
  };

  const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caractere]);

  const gerarChaveData = (ano, mes, dia) => [
    ano,
    String(mes + 1).padStart(2, '0'),
    String(dia).padStart(2, '0')
  ].join('-');

  const formatarData = (chave, opcoes) =>
    new Intl.DateTimeFormat('pt-BR', opcoes).format(new Date(`${chave}T12:00:00`));

  const capitalizarPrimeira = texto => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '');

  const hoje = '2026-11-10';
  let diaSelecionado = hoje;

  const eventosIniciais = [
    { dia: hoje, hora: '14:00', titulo: 'Consulta na UBS', local: 'UBS do bairro · Ana da Silva (Aninha)' },
    { dia: '2026-11-18', hora: '14:00', titulo: 'Geriatria', local: 'Ana da Silva (Aninha)' },
    { dia: '2026-11-21', hora: '08:00', titulo: 'Hemoglobina glicada', local: 'UBS do bairro' }
  ];

  const relatosIniciais = {
    [hoje]: [
      [
        'Beatriz da Silva (Bea)',
        'Cuidadora · Turno 07h–12h',
        'Tarefa relacionada · Retirar medicamento na UBS · Ocorrência · Metformina das 08h não administrada',
        'Confirmei a consulta das 14h. A metformina das 08h não foi administrada e o motivo não foi informado. Caso não apareça ninguém para assumir o turno seguinte, posso estender meu turno até 13h.',
        'Ana leva a pasta e retira o medicamento na UBS. A volta está combinada com Paulo.\nA agendar consulta com otorrinolaringologista. Antes de agendar, confirme se o convênio cobre a consulta.'
      ],
      [
        'Ana da Silva (Aninha)',
        'Filha · Contato de referência · Turno 00h–07h',
        'Tarefa relacionada · Levar a pasta da consulta',
        'Separei os documentos e deixei a pasta na bolsa azul.',
        'Levar a pasta para a consulta das 14h.'
      ]
    ],
    '2026-11-09': []
  };

  const obterRelatosDia = dia => [...(relatosIniciais[dia] || []), ...(dadosSalvos.reports?.[dia] || [])];
  const formatarDataCurta = dia => capitalizarPrimeira(formatarData(dia, { weekday: 'long', day: 'numeric', month: 'long' }));

  const containerMes = pagina.querySelector('[data-mes]');
  let anoAtual = 2026;
  let mesAtual = 10;

  const renderizarMes = () => {
    if (!containerMes) return;
    containerMes.querySelector('[data-titulo-mes]').textContent = capitalizarPrimeira(formatarData(
      gerarChaveData(anoAtual, mesAtual, 1),
      { month: 'long', year: 'numeric' }
    ));
    const gradeDias = containerMes.querySelector('.calendario-mensal__dias');
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();
    let conteudo = '<span aria-hidden="true"></span>'.repeat(primeiroDiaSemana);

    for (let dia = 1; dia <= new Date(anoAtual, mesAtual + 1, 0).getDate(); dia++) {
      const chave = gerarChaveData(anoAtual, mesAtual, dia);
      const simbolos = chave === '2026-11-09' ? '✓' : obterRelatosDia(chave).length ? '•' : '';
      const descricoes = {
        '✓': ', relatos completos',
        '•': ', com relatos'
      };
      const rotulo = formatarDataCurta(chave) + (simbolos ? descricoes[simbolos] : '');
      conteudo += `<button type="button" data-selecionar-dia="${chave}" aria-pressed="${chave === diaSelecionado}" aria-label="${rotulo}">${dia}${simbolos ? `<small aria-hidden="true"> ${simbolos}</small>` : ''}</button>`;
    }

    gradeDias.innerHTML = conteudo;
  };

  const renderizarRelatos = () => {
    const containerRelatos = pagina.querySelector('[data-relatos]');
    if (!containerRelatos) return;

    const itens = obterRelatosDia(diaSelecionado);
    const resumo = itens.length
      ? `<p class="ficha__relatos-resumo">${diaSelecionado === hoje ? 'Relatos parciais · ' : ''}${itens.length} ${itens.length === 1 ? 'turno registrado' : 'turnos registrados'}</p>`
      : (diaSelecionado === '2026-11-09'
        ? '<p class="ficha__relatos-resumo">Todos os turnos com relato. Os textos deste dia não estão disponíveis na demonstração.</p>'
        : '<p class="ficha__relatos-resumo">Nenhum relato nesta data.</p>');

    containerRelatos.innerHTML = `${resumo}<h3>${formatarDataCurta(diaSelecionado)}</h3>${itens.map(([nome, papel, contexto, relato, proximo]) => {
      const avatar = nome.startsWith('Ana')
        ? 'icone-mascote-espeto.svg'
        : nome.startsWith('Beatriz')
          ? 'icone-mascote-trevo.svg'
          : 'icone-mascote-cubado.svg';
      const partes = papel.split(' · ');
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
        <p>${escaparHtml(relato)}</p>
        ${proximo ? `<div class="ficha__proximo-turno"><strong>Para o próximo turno</strong><p>${escaparHtml(proximo).replaceAll('\n', '<br>')}</p></div>` : ''}
      </article>`;
    }).join('')}`;
  };

  const renderizarPessoa = () => {
    if (!dadosSalvos.person) return;
    const { nome, apelido } = dadosSalvos.person;
    pagina.querySelectorAll('[data-pessoa-nome]').forEach(no => {
      no.textContent = nome + (apelido ? ` (${apelido})` : '');
    });
    const nomeCompletoEl = pagina.querySelector('[data-pessoa-nome-completo]');
    if (nomeCompletoEl) nomeCompletoEl.textContent = nome;

    const formulario = pagina.querySelector('[data-formulario-mvp="ficha"]');
    if (!formulario) return;
    const campos = formulario.elements;
    campos.nome.value = nome;
    campos.apelido.value = apelido;

    const mascoteAtual = dadosSalvos.person.mascote || 'assets/media/mascotes/icone-mascote-minhoca.svg';
    if (dadosSalvos.person.mascote) {
      pagina.querySelectorAll('.ficha__mascote, .ficha__alerta-mascote').forEach(img => {
        img.src = mascoteAtual;
      });
      const inputMascote = formulario.querySelector('[data-input-mascote]');
      if (inputMascote) inputMascote.value = mascoteAtual;
      formulario.querySelectorAll('.editar-ficha__mascote-cartao').forEach(cartao => {
        const ativo = cartao.dataset.mascote === mascoteAtual;
        cartao.setAttribute('aria-pressed', String(ativo));
        const rotulo = cartao.querySelector('span');
        if (rotulo) rotulo.textContent = ativo ? 'Selecionado' : 'Selecionar';
      });
    }

    if ('foto' in dadosSalvos.person) {
      const temFoto = dadosSalvos.person.foto !== '';
      const imgRetrato = pagina.querySelector('.ficha__retrato > img:first-child');
      const imgMascoteRetrato = pagina.querySelector('.ficha__mascote');
      const imgPrevia = formulario.querySelector('[data-foto-previa]');
      const botaoRemoverFoto = formulario.querySelector('[data-remover-foto]');
      const botaoFoto = formulario.querySelector('[data-botao-foto]');

      if (imgRetrato) imgRetrato.src = temFoto ? dadosSalvos.person.foto : mascoteAtual;
      if (imgMascoteRetrato) imgMascoteRetrato.hidden = !temFoto;
      if (imgPrevia) {
        imgPrevia.src = temFoto ? dadosSalvos.person.foto : mascoteAtual;
        if (temFoto) {
          delete imgPrevia.dataset.fotoRemovida;
        } else {
          imgPrevia.dataset.fotoRemovida = 'true';
        }
      }
      if (botaoRemoverFoto) botaoRemoverFoto.hidden = !temFoto;
      if (botaoFoto) botaoFoto.textContent = temFoto ? 'Trocar foto' : 'Adicionar foto';
    }

    if (dadosSalvos.person.telefoneFixo || dadosSalvos.person.celular) {
      const fixo = dadosSalvos.person.telefoneFixo || '';
      const cel = dadosSalvos.person.celular || '';
      if (campos.telefoneFixo) campos.telefoneFixo.value = fixo;
      if (campos.celular) campos.celular.value = cel;
      const elTelefones = pagina.querySelector('[data-pessoa-campo="telefones"]');
      if (elTelefones) {
        const partes = [fixo && `Fixo ${fixo}`, cel && `Celular ${cel}`].filter(Boolean);
        elTelefones.textContent = partes.join(' · ') || 'Não informado';
      }
    }

    pagina.querySelectorAll('[data-pessoa-campo]').forEach(no => {
      const chave = no.dataset.pessoaCampo;
      if (chave in camposSensiveis) {
        sincronizarCampoSensivel(chave);
        return;
      }
      if (!(chave in dadosSalvos.person)) return;
      const valor = dadosSalvos.person[chave];
      if (campos[chave]) campos[chave].value = valor;

      if (chave === 'historicoSaude') {
        const htmlSeguro = sanitizarHtmlEditor(valor);
        no.innerHTML = htmlSeguro || 'Não informado';
        const areaEditor = formulario.querySelector('[data-editor-alvo="historicoSaude"]');
        if (areaEditor) {
          areaEditor.innerHTML = htmlSeguro;
          sincronizarEditorRico(areaEditor.closest('[data-editor-rico]'));
        }
      } else if (chave === 'alergias' || chave === 'condicoes') {
        const itens = String(valor || '')
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
        no.innerHTML = itens.length
          ? itens.map(item => `<span class="ficha__etiqueta ficha__etiqueta--alerta">${escaparHtml(item)}</span>`).join(' ')
          : 'Nenhuma registrada';
        const listaModal = formulario.querySelector(`[data-lista-etiquetas="${chave}"]`);
        if (listaModal) {
          listaModal.querySelectorAll('.ficha__etiqueta').forEach(etiqueta => etiqueta.remove());
          const inputEtiqueta = listaModal.querySelector('.editar-ficha__input-etiqueta');
          itens.forEach(item => {
            const span = document.createElement('span');
            span.className = 'ficha__etiqueta ficha__etiqueta--alerta';
            span.innerHTML = `${escaparHtml(item)} <button type="button" class="editar-ficha__remover-etiqueta" aria-label="Remover ${escaparHtml(item)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
            listaModal.insertBefore(span, inputEtiqueta);
          });
        }
      } else if (chave === 'nascimento' && valor) {
        const nascimento = formatarData(valor, { day: 'numeric', month: 'long', year: 'numeric' });
        let anos = Number(hoje.slice(0, 4)) - Number(valor.slice(0, 4));
        if (hoje.slice(5) < valor.slice(5)) anos--;
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
  };

  const renderizar = () => {
    renderizarMes();
    if (tipoPagina === 'ficha') {
      renderizarRelatos();
      renderizarPessoa();
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
      const span = document.createElement('span');
      span.className = 'ficha__etiqueta ficha__etiqueta--alerta';
      span.innerHTML = `${escaparHtml(valor)} <button type="button" class="editar-ficha__remover-etiqueta" aria-label="Remover ${escaparHtml(valor)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
      lista.insertBefore(span, lista.querySelector('.editar-ficha__input-etiqueta'));
      sincronizarInputEtiquetas(lista);
    }
  };

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
            if (valorAtual) info.real = valorAtual;
          }
          info.visivelForm = !info.visivelForm;
        } else {
          info.visivelFicha = !info.visivelFicha;
        }
        sincronizarCampoSensivel(chave);
      }
    }

    if (botao.hasAttribute('data-mvp-imprimir')) window.print();

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

    if (botao.dataset.comandoEditor) {
      const editor = botao.closest('[data-editor-rico]');
      const area = editor?.querySelector('[data-editor-alvo]');
      if (area) {
        area.focus();
        document.execCommand(botao.dataset.comandoEditor, false, null);
        sincronizarEditorRico(editor);
      }
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

    if (evento.key === 'Enter' || evento.key === ' ' || evento.key === ',') {
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
    const leitor = new FileReader();
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

  pagina.addEventListener('input', evento => {
    const areaEditor = evento.target.closest('[data-editor-alvo]');
    if (areaEditor) sincronizarEditorRico(areaEditor.closest('[data-editor-rico]'));
  });

  pagina.addEventListener('keyup', evento => {
    const areaEditor = evento.target.closest('[data-editor-alvo]');
    if (areaEditor) sincronizarEditorRico(areaEditor.closest('[data-editor-rico]'));
  });

  pagina.addEventListener('mouseup', evento => {
    const areaEditor = evento.target.closest('[data-editor-alvo]');
    if (areaEditor) sincronizarEditorRico(areaEditor.closest('[data-editor-rico]'));
  });

  pagina.addEventListener('submit', evento => {
    const formulario = evento.target;
    const tipoFormulario = formulario.dataset.formularioMvp;
    if (!tipoFormulario) return;

    evento.preventDefault();
    if (tipoFormulario === 'ficha') {
      formulario.querySelectorAll('[data-editor-rico]').forEach(sincronizarEditorRico);
      formulario.querySelectorAll('.editar-ficha__input-etiqueta').forEach(inputEtiqueta => {
        if (!inputEtiqueta.value.trim()) return;
        adicionarEtiqueta(inputEtiqueta.closest('[data-lista-etiquetas]'), inputEtiqueta.value);
        inputEtiqueta.value = '';
      });
    }
    const campos = Object.fromEntries(new FormData(formulario));
    let mensagem = '';

    if (tipoFormulario === 'ficha') {
      Object.keys(camposSensiveis).forEach(chave => {
        const valorInformado = (campos[chave] || '').trim();
        if (valorInformado && valorInformado !== obterValorMascarado(chave)) {
          camposSensiveis[chave].real = valorInformado;
        }
        campos[chave] = camposSensiveis[chave].real;
      });
      const previaFoto = formulario.querySelector('[data-foto-previa]');
      if (previaFoto?.dataset.fotoRemovida === 'true') {
        campos.foto = '';
      } else if (previaFoto?.dataset.fotoAtualizada) {
        campos.foto = previaFoto.dataset.fotoAtualizada;
      } else if (dadosSalvos.person && 'foto' in dadosSalvos.person) {
        campos.foto = dadosSalvos.person.foto;
      } else {
        campos.foto = 'assets/media/foto-perfil-maria.png';
      }
      dadosSalvos.person = campos;
      mensagem = 'Ficha atualizada nesta sessão (as alterações são temporárias).';
    }

    if (tipoFormulario === 'relato') {
      ((dadosSalvos.reports ||= {})[campos.dia] ||= []).push([
        'Zé da Manga',
        'Administrador',
        '',
        campos.relato,
        campos.recado
      ]);
      mensagem = 'Relato salvo no Diário de turno.';
    }

    if (campos.dia && tipoFormulario === 'relato') {
      diaSelecionado = campos.dia;
      anoAtual = Number(diaSelecionado.slice(0, 4));
      mesAtual = Number(diaSelecionado.slice(5, 7)) - 1;
    }

    formulario.closest('dialog')?.close();
    if (tipoFormulario !== 'ficha') formulario.reset();
    salvarDados(mensagem);
    renderizar();
  });

  const dialogoCompartilhar = pagina.querySelector('[data-previa-compartilhar]')?.closest('dialog');
  if (dialogoCompartilhar) {
    const previa = dialogoCompartilhar.querySelector('textarea');
    const retorno = dialogoCompartilhar.querySelector('[data-status-compartilhar]');
    const secoes = {
      'Consultas e exames': () => eventosIniciais.map(item => `${item.dia} · ${item.hora} · ${item.titulo}`).join('\n'),
      'Informações de saúde': () => 'Alergia registrada: dipirona.',
      'Medicamentos de uso diário': () => 'Losartana · 08h. Metformina · 08h e 20h.'
    };

    const atualizarPrevia = () => {
      previa.value = [...dialogoCompartilhar.querySelectorAll('input:checked')]
        .map(input => `${input.value}\n${secoes[input.value]()}`)
        .join('\n\n');
      dialogoCompartilhar.querySelectorAll('[data-compartilhar]').forEach(botao => {
        botao.disabled = !previa.value;
      });
      retorno.textContent = '';
    };

    document.querySelector(`[data-dialogo="${dialogoCompartilhar.id}"]`)?.addEventListener('click', atualizarPrevia);
    dialogoCompartilhar.addEventListener('change', atualizarPrevia);
    dialogoCompartilhar.addEventListener('click', async evento => {
      const modo = evento.target.closest('[data-compartilhar]')?.dataset.compartilhar;
      if (!modo || !previa.value) return;

      try {
        if (modo === 'whatsapp') {
          window.open(`https://wa.me/?text=${encodeURIComponent(previa.value)}`, '_blank', 'noopener,noreferrer');
        } else if (modo === 'email') {
          window.location.href = `mailto:?subject=${encodeURIComponent('Mutirão · Resumo de cuidado')}&body=${encodeURIComponent(previa.value)}`;
        } else if (modo === 'native' && navigator.share) {
          await navigator.share({ text: previa.value });
          retorno.textContent = 'Compartilhamento concluído.';
        } else if (modo === 'copy' && navigator.clipboard) {
          await navigator.clipboard.writeText(previa.value);
          retorno.textContent = 'Mensagem copiada.';
        } else {
          previa.focus();
          previa.select();
          retorno.textContent = 'Selecione e copie a mensagem para compartilhar.';
        }
      } catch (erro) {
        if (erro.name === 'AbortError') return;
        previa.focus();
        previa.select();
        retorno.textContent = 'Selecione e copie a mensagem manualmente.';
      }
    });
  }

  renderizar();
  if (tipoPagina === 'ficha') {
    document.querySelector('#barra-lateral a[href="pessoas.html"]')?.setAttribute('aria-current', 'page');
  }
})();
