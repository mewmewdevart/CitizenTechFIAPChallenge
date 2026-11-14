(() => {
  const pagina = document.querySelector('[data-pagina-mvp="agenda"]');
  if (!pagina) return;

  const dadosSalvos = {};
  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const registrarStatus = mensagem => {
    if (elementoStatus) elementoStatus.textContent = mensagem;
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
  let diaSemana = hoje;
  let diaTurno = hoje;

  const eventosIniciais = [
    { dia: hoje, hora: '14:00', titulo: 'Consulta na UBS', local: 'UBS do bairro · Ana da Silva (Aninha)' },
    { dia: '2026-11-18', hora: '14:00', titulo: 'Geriatria', local: 'Ana da Silva (Aninha)' },
    { dia: '2026-11-21', hora: '08:00', titulo: 'Hemoglobina glicada', local: 'UBS do bairro' }
  ];

  const lacunasTurno = {
    [hoje]: ['12h–13h', 'Descoberto'],
    '2026-11-11': ['00h–24h', 'Descoberto'],
    '2026-11-12': ['08h–14h', 'Parcial'],
    '2026-11-13': ['14h–18h', 'Parcial']
  };

  const equipeCuidado = [
    { nome: 'Ana da Silva (Aninha)', avatar: 'icone-mascote-espeto.svg' },
    { nome: 'Beatriz da Silva (Bea)', avatar: 'icone-mascote-trevo.svg' },
    { nome: 'Paulo da Silva (Paul)', avatar: 'icone-mascote-pingo.svg' },
    { nome: 'Zé da Manga', avatar: 'icone-mascote-cubado.svg' }
  ];

  const sortearIntegrantes = quantidade => {
    const lista = [...equipeCuidado];
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista.slice(0, quantidade);
  };

  const escalasSemana = {};
  const obterEscalaDia = dia => {
    if (dia === hoje) {
      return [
        { horario: '00h–07h', pessoa: equipeCuidado[0] },
        { horario: '07h–12h', pessoa: equipeCuidado[1] },
        { horario: '12h–13h', pessoa: null, lacuna: true },
        { horario: '13h–19h', pessoa: equipeCuidado[2] },
        { horario: '19h–24h', pessoa: equipeCuidado[3] }
      ];
    }
    if (!escalasSemana[dia]) {
      const sorteados = sortearIntegrantes(4);
      if (dia === '2026-11-11') {
        escalasSemana[dia] = [{ horario: '00h–24h', pessoa: null, lacuna: true }];
      } else if (dia === '2026-11-12') {
        escalasSemana[dia] = [
          { horario: '00h–08h', pessoa: sorteados[0] },
          { horario: '08h–14h', pessoa: null, lacuna: true },
          { horario: '14h–19h', pessoa: sorteados[1] },
          { horario: '19h–24h', pessoa: sorteados[2] }
        ];
      } else if (dia === '2026-11-13') {
        escalasSemana[dia] = [
          { horario: '00h–07h', pessoa: sorteados[0] },
          { horario: '07h–14h', pessoa: sorteados[1] },
          { horario: '14h–18h', pessoa: null, lacuna: true },
          { horario: '18h–24h', pessoa: sorteados[2] }
        ];
      } else {
        escalasSemana[dia] = [
          { horario: '00h–07h', pessoa: sorteados[0] },
          { horario: '07h–13h', pessoa: sorteados[1] },
          { horario: '13h–19h', pessoa: sorteados[2] },
          { horario: '19h–24h', pessoa: sorteados[3] }
        ];
      }
    }
    return escalasSemana[dia];
  };

  const obterTodosEventos = () =>
    [...eventosIniciais, ...(dadosSalvos.events || [])].sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));

  const obterEventosDia = dia => obterTodosEventos().filter(item => item.dia === dia);
  const possuiLacuna = dia => Boolean(lacunasTurno[dia] && !dadosSalvos.covered?.[dia]);
  const formatarDataCurta = dia => capitalizarPrimeira(formatarData(dia, { weekday: 'long', day: 'numeric', month: 'short' }));

  const avatarMascote = arquivo =>
    `<img class="agenda__avatar" alt="" src="assets/media/mascotes/${arquivo}" width="40" height="40">`;

  const criarEtiquetaCobertura = dia => {
    const rotulo = possuiLacuna(dia) ? lacunasTurno[dia][1] : 'Coberto';
    const parcial = rotulo === 'Parcial';
    const modificador = possuiLacuna(dia) ? (parcial ? 'agenda__etiqueta--atencao' : 'agenda__etiqueta--alerta') : 'agenda__etiqueta--sucesso';
    const icone = possuiLacuna(dia) ? (parcial ? 'icone-atencao.svg' : 'icone-sem-cobertura.svg') : 'icone-coberto.svg';
    return `<span class="agenda__etiqueta ${modificador}"><img alt="" src="assets/media/icones/${icone}">${rotulo}</span>`;
  };

  const criarBotaoAcaoTurno = (rotulo, dialogo, dia) =>
    `<button type="button" class="botao botao--secundario" data-dialogo-dinamico="${dialogo}" data-dia="${dia}">${rotulo}</button>`;

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
      const temEvento = obterEventosDia(chave).length > 0;
      const temLacuna = possuiLacuna(chave);
      const rotulo = formatarDataCurta(chave) + (temEvento ? ', compromisso' : '') + (temLacuna ? ', horário sem cobertura' : '');
      const indicadores = [
        temEvento ? '<span class="calendario-mensal__indicador--evento">●</span>' : '',
        temLacuna ? '<span class="calendario-mensal__indicador--alerta">▲</span>' : ''
      ].join('');
      conteudo += `<button type="button" data-selecionar-dia="${chave}" aria-pressed="${chave === diaSelecionado}" aria-label="${rotulo}">${dia}${indicadores ? `<small class="calendario-mensal__indicadores" aria-hidden="true">${indicadores}</small>` : ''}</button>`;
    }

    gradeDias.innerHTML = conteudo;
  };

  const renderizarAgenda = () => {
    const itens = obterEventosDia(diaSelecionado);
    pagina.querySelector('[data-eventos]').innerHTML = itens.map(item => {
      const ehConsultaUbs = item.dia === hoje && item.titulo === 'Consulta na UBS';
      return `<article class="agenda__evento">
        <div class="agenda__tarefa">
          ${avatarMascote('icone-mascote-espeto.svg')}
          <div>
            <strong>${escaparHtml(item.hora.replace(':00', 'h'))} · ${escaparHtml(item.titulo)}</strong>
            <p>${escaparHtml([item.local, item.acompanhante].filter(Boolean).join(' · '))}</p>
          </div>
          ${ehConsultaUbs ? '<button class="botao botao--secundario" type="button" data-agenda-consulta>Ver compromisso</button>' : ''}
        </div>
        ${ehConsultaUbs ? `<div class="agenda__preparacao">
          <strong>Preparação e transporte</strong>
          <p>Levar a pasta da consulta · Ana da Silva (Aninha)</p>
          <p>Volta combinada · Paulo da Silva (Paul)</p>
        </div>` : ''}
      </article>`;
    }).join('') || '<p class="agenda__vazio">Nenhum compromisso nesta data.</p>';

    pagina.querySelector('[data-tarefas-diarias]').hidden = diaSelecionado !== hoje;

    const blocoLacuna = pagina.querySelector('[data-lacuna-dia]');
    blocoLacuna.hidden = !possuiLacuna(diaSelecionado);
    pagina.querySelector('[data-titulo-lacuna]').textContent = `${lacunasTurno[diaSelecionado]?.[0] || ''} · Turno sem cobertura`;
    pagina.querySelector('[data-resumo-dia]').textContent =
      `${itens.length} ${itens.length === 1 ? 'consulta' : 'consultas'}` +
      (possuiLacuna(diaSelecionado) ? ' · 1 turno sem cobertura' : '') +
      (diaSelecionado === hoje ? ' · Tarefas e medicamentos' : ` · ${formatarDataCurta(diaSelecionado)}`);

    const semana = Array.from({ length: 7 }, (_, i) => gerarChaveData(2026, 10, 9 + i));
    pagina.querySelector('[data-semana]').innerHTML = semana.map(dia =>
      `<button type="button" data-dia-semana="${dia}" aria-pressed="${diaSemana === dia}">
        <span>${capitalizarPrimeira(formatarData(dia, { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(',', ''))}</span>
        ${criarEtiquetaCobertura(dia)}
      </button>`
    ).join('');

    const linhaDescoberto = dia => `<div class="agenda__lacuna">
      <span class="agenda__icone-descoberto" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>
      <div>
        <strong>${lacunasTurno[dia][0]} · Turno sem cobertura</strong>
        <p>A Maria não pode ficar sozinha!</p>
      </div>
      ${criarBotaoAcaoTurno('Cobrir horário', 'dialogo-cobrir-horario', dia)}
    </div>`;

    const renderizarTurno = (horario, pessoa, dia) => `<div class="agenda__turno">
      ${avatarMascote(pessoa.avatar)}
      <div><strong>${horario}</strong><p>${escaparHtml(pessoa.nome)} · Coberto</p></div>
      ${pessoa.nome === 'Zé da Manga' && dia >= hoje ? criarBotaoAcaoTurno('Solicitar troca', 'dialogo-solicitar-troca', dia) : ''}
    </div>`;

    pagina.querySelector('[data-turnos]').innerHTML = obterEscalaDia(diaSemana).map(item => {
      if (item.lacuna) {
        return dadosSalvos.covered?.[diaSemana]
          ? renderizarTurno(item.horario, equipeCuidado[3], diaSemana)
          : linhaDescoberto(diaSemana);
      }
      return renderizarTurno(item.horario, item.pessoa, diaSemana);
    }).join('');

    pagina.querySelector('[data-lacunas]').innerHTML = Object.keys(lacunasTurno).filter(possuiLacuna).map(dia =>
      `<button class="agenda__link-lacuna" type="button" data-dia-semana="${dia}">
        <span>${formatarDataCurta(dia)}<small>${dia === '2026-11-11' ? 'Dia inteiro · ' : ''}${lacunasTurno[dia][0]}</small></span>
        ${criarEtiquetaCobertura(dia)}
      </button>`
    ).join('') || '<p>Todos os horários estão cobertos.</p>';
  };

  const renderizar = () => {
    renderizarMes();
    renderizarAgenda();
  };

  pagina.addEventListener('click', evento => {
    if (evento.target.closest('[data-ver-turno]')) {
      diaSemana = diaSelecionado;
      renderizarAgenda();
    }

    const botao = evento.target.closest('button');
    if (!botao) return;

    if (botao.hasAttribute('data-agenda-consulta')) {
      document.getElementById('dialogo-consulta-ubs')?.showModal();
    }

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

    if (botao.dataset.diaSemana) {
      diaSemana = botao.dataset.diaSemana;
      renderizarAgenda();
      pagina.querySelector(`[data-dia-semana="${diaSemana}"]`)?.focus();
    }

    if (botao.dataset.dialogoDinamico) {
      diaTurno = botao.dataset.dia;
      const dialogo = document.getElementById(botao.dataset.dialogoDinamico);
      if (dialogo) {
        dialogo.querySelector('[data-contexto-turno]').textContent =
          `${formatarDataCurta(diaTurno)} · ${botao.dataset.dialogoDinamico === 'dialogo-solicitar-troca' ? 'Turno de Zé da Manga' : lacunasTurno[diaTurno][0]}`;
        dialogo.showModal();
      }
    }

    if (botao.hasAttribute('data-agenda-exportar')) {
      const escaparIcs = valor => valor.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
      const carimbo = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const eventosMes = obterTodosEventos().filter(item => item.dia.startsWith('2026-11'));
      const linhas = eventosMes.flatMap((item, indice) => [
        'BEGIN:VEVENT',
        `UID:mutirao-${item.dia}-${item.hora}-${indice}@mutirao.local`,
        `DTSTAMP:${carimbo}`,
        `DTSTART;TZID=America/Sao_Paulo:${item.dia.replaceAll('-', '')}T${item.hora.replace(':', '')}00`,
        `SUMMARY:${escaparIcs(item.titulo)}`,
        `LOCATION:${escaparIcs(item.local)}`,
        `DESCRIPTION:${escaparIcs(item.acompanhante || '')}`,
        'END:VEVENT'
      ]);
      const calendario = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mutirao//Agenda//PT-BR',
        'BEGIN:VTIMEZONE', 'TZID=America/Sao_Paulo', 'BEGIN:STANDARD', 'DTSTART:20190217T000000',
        'TZOFFSETFROM:-0200', 'TZOFFSETTO:-0300', 'TZNAME:BRT', 'END:STANDARD', 'END:VTIMEZONE',
        ...linhas, 'END:VCALENDAR', ''
      ].join('\r\n');
      const url = URL.createObjectURL(new Blob([calendario], { type: 'text/calendar;charset=utf-8' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: 'agenda-mutirao-novembro-2026.ics' });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });

  pagina.addEventListener('submit', evento => {
    const formulario = evento.target;
    const tipoFormulario = formulario.dataset.formularioMvp;
    if (!tipoFormulario) return;

    evento.preventDefault();
    const campos = Object.fromEntries(new FormData(formulario));
    let mensagem = '';

    if (tipoFormulario === 'evento') {
      (dadosSalvos.events ||= []).push(campos);
      diaSelecionado = campos.dia;
      anoAtual = Number(diaSelecionado.slice(0, 4));
      mesAtual = Number(diaSelecionado.slice(5, 7)) - 1;
      mensagem = 'Compromisso salvo na Agenda.';
    }

    if (tipoFormulario === 'cobertura') {
      (dadosSalvos.covered ||= {})[diaTurno] = true;
      diaSemana = diaTurno;
      mensagem = 'Turno assumido por Zé da Manga.';
    }

    if (tipoFormulario === 'troca') {
      (dadosSalvos.swaps ||= []).push({ dia: diaTurno, mensagem: campos.mensagem });
      mensagem = 'Solicitação de troca registrada nesta sessão.';
    }

    formulario.closest('dialog')?.close();
    if (tipoFormulario !== 'cobertura') formulario.reset();
    registrarStatus(mensagem);
    renderizar();
    if (tipoFormulario === 'cobertura') {
      pagina.querySelector(`[data-dia-semana="${diaSemana}"]`)?.focus();
    }
  });

  const dialogoCompartilhar = pagina.querySelector('[data-previa-compartilhar]')?.closest('dialog');
  if (dialogoCompartilhar) {
    const previa = dialogoCompartilhar.querySelector('textarea');
    const retorno = dialogoCompartilhar.querySelector('[data-status-compartilhar]');
    const secoes = {
      'Compromissos': () => obterTodosEventos()
        .filter(item => item.dia >= '2026-11-09' && item.dia <= '2026-11-15')
        .map(item => `${item.dia} · ${item.hora} · ${item.titulo}`)
        .join('\n'),
      'Escala de turnos': () => Object.keys(lacunasTurno)
        .map(dia => `${dia} · ${lacunasTurno[dia][0]}${possuiLacuna(dia) ? ` · ${lacunasTurno[dia][1]}` : ' · Zé da Manga'}`)
        .join('\n'),
      'Tarefas': () => 'Retirar medicamento na UBS após a consulta.'
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
          window.location.href = `mailto:?subject=${encodeURIComponent('Mutirão · Agenda da Mari')}&body=${encodeURIComponent(previa.value)}`;
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
})();

