(() => {
  const pagina = document.querySelector('[data-pagina-mvp="direitos"]');
  const core = window.MutiraoCuidado;
  if (!pagina || !core) return;

  const { anunciarStatus, escaparHtml, obterEstado } = core;
  const elementoStatus = pagina.querySelector('[data-mvp-status]');
  const listaResultados = pagina.querySelector('[data-simulador-resultados]');
  const tituloResultado = pagina.querySelector('[data-simulador-titulo]');
  const selosIdade = [...pagina.querySelectorAll('[data-simulador-idade-selo]')];
  const textoProgresso = pagina.querySelector('[data-simulador-progresso]');
  const barraProgresso = pagina.querySelector('[data-simulador-barra]');
  const botaoAnterior = pagina.querySelector('[data-simulador-anterior]');
  const textoBotaoAnterior = botaoAnterior?.querySelector('span');
  const botaoProximo = pagina.querySelector('[data-simulador-proximo]');
  const botaoConcluir = pagina.querySelector('[data-simulador-concluir]');
  const etapas = [...pagina.querySelectorAll('[data-etapa]')];
  const passos = [...pagina.querySelectorAll('[data-passo]')];
  const formPerguntas = pagina.querySelector('[data-etapa="perguntas"]');
  let passoAtual = 0;

  const calcularIdade = nascimento => {
    if (!nascimento) return 79;
    const hoje = new Date('2026-11-10T12:00:00');
    const nasc = new Date(`${nascimento}T12:00:00`);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const mesDiff = hoje.getMonth() - nasc.getMonth();
    if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nasc.getDate())) idade -= 1;
    return idade;
  };

  const idadePessoa = calcularIdade(obterEstado().person?.nascimento);
  selosIdade.forEach(selo => {
    const comOrigem = selo.textContent.includes('(da ficha)');
    selo.textContent = comOrigem ? `${idadePessoa} anos (da ficha)` : `${idadePessoa} anos`;
  });

  const respostas = {
    moradia: null,
    renda: null,
    aposentadoriaIncapacidade: null,
    assistencia: null,
    cadunico: null,
    saudeEspecializada: null,
    tratamentoFora: null
  };

  const passoTemResposta = indice => {
    const grupo = passos[indice]?.querySelector('[data-simulador-grupo]')?.dataset.simuladorGrupo;
    return Boolean(grupo && respostas[grupo]);
  };

  const atualizarBotaoAvanco = () => {
    const respondida = passoTemResposta(passoAtual);
    if (botaoProximo) botaoProximo.disabled = !respondida;
    if (botaoConcluir) botaoConcluir.disabled = !respondida;
  };

  const reiniciarRespostas = () => {
    Object.keys(respostas).forEach(chave => {
      respostas[chave] = null;
    });
    pagina.querySelectorAll('[data-simulador-grupo] [data-simulador-valor]').forEach(btn => {
      btn.setAttribute('aria-pressed', 'false');
    });
  };

  const mostrarEtapa = nome => {
    etapas.forEach(etapa => {
      etapa.hidden = etapa.dataset.etapa !== nome;
    });
    pagina.querySelector('[data-simulador-painel]')?.classList.toggle('direitos-banner', nome === 'inicial');
  };

  const atualizarPasso = (indice, moverFoco = false) => {
    if (!passos.length) return;
    passoAtual = Math.max(0, Math.min(indice, passos.length - 1));
    passos.forEach((passo, idx) => {
      passo.hidden = idx !== passoAtual;
    });
    if (textoProgresso) {
      textoProgresso.textContent = `Pergunta ${passoAtual + 1} de ${passos.length}`;
    }
    if (barraProgresso) {
      barraProgresso.style.width = `${((passoAtual + 1) / passos.length) * 100}%`;
    }
    if (textoBotaoAnterior) {
      textoBotaoAnterior.textContent = passoAtual === 0 ? 'Voltar ao início' : 'Pergunta anterior';
    }
    const ultimoPasso = passoAtual === passos.length - 1;
    if (botaoProximo) botaoProximo.hidden = ultimoPasso;
    if (botaoConcluir) botaoConcluir.hidden = !ultimoPasso;
    atualizarBotaoAvanco();

    if (moverFoco) {
      passos[passoAtual]?.querySelector('h3')?.focus({ preventScroll: true });
    }
  };

  const calcularDireitos = () => {
    const idosa60 = idadePessoa >= 60;
    const idosa65 = idadePessoa >= 65;
    const rendaDesconhecida = respostas.renda === 'nao-sei';
    const rendaAteUmQuarto = respostas.renda === 'ate-um-quarto';
    const rendaAteMeio = rendaAteUmQuarto || respostas.renda === 'ate-meio';
    const precisaAjuda = respostas.assistencia === 'integral' || respostas.assistencia === 'parcial';

    const bpcElegivel = idosa65 && rendaAteUmQuarto && respostas.aposentadoriaIncapacidade === 'nao';
    const acrescimoElegivel = respostas.aposentadoriaIncapacidade === 'sim' && respostas.assistencia === 'integral';
    const tarifaElegivel = rendaAteMeio;
    const ceafElegivel = respostas.saudeEspecializada === 'sim';
    const reabilitacaoElegivel = respostas.saudeEspecializada === 'sim';
    const tfdElegivel = respostas.tratamentoFora === 'sim';

    return [
      {
        titulo: 'Farmácia Popular',
        icone: 'fa-solid fa-pills',
        detalhe: 'Confira a lista de itens e os requisitos de retirada no canal oficial do programa.',
        selo: 'Consultar critérios oficiais',
        classeSelo: 'selo--neutro',
        elegivel: false,
        link: 'https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular',
        rotuloLink: 'Ver lista no gov.br'
      },
      {
        titulo: 'Direito a acompanhante no SUS',
        icone: 'fa-solid fa-user-group',
        detalhe: idosa60
          ? 'Pela lei (Estatuto da Pessoa Idosa), quem tem 60 anos ou mais pode ter alguém junto quando fica internado ou em observação no hospital.'
          : 'Pela lei, quem tem 60 anos ou mais pode ter alguém junto durante a internação.',
        selo: idosa60 ? 'Pode se aplicar' : 'Consultar critérios oficiais',
        classeSelo: idosa60 ? 'selo--sucesso' : 'selo--neutro',
        elegivel: idosa60,
        link: 'https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm',
        rotuloLink: 'Ler Lei nº 10.741'
      },
      {
        titulo: 'BPC (1 salário mínimo por mês)',
        icone: 'fa-solid fa-hand-holding-heart',
        detalhe: 'Consulte o INSS para confirmar idade, renda familiar, CadÚnico e acumulação com outros benefícios.',
        selo: rendaDesconhecida || respostas.aposentadoriaIncapacidade === 'nao-sei' ? 'Faltam informações' : bpcElegivel ? 'Pode se aplicar' : 'Consultar critérios oficiais',
        classeSelo: bpcElegivel ? 'selo--atencao' : 'selo--neutro',
        elegivel: bpcElegivel,
        link: 'https://www.gov.br/pt-br/servicos/solicitar-beneficio-assistencial-ao-idoso',
        rotuloLink: 'Consultar critérios do BPC'
      },
      {
        titulo: '25% a mais na aposentadoria',
        icone: 'fa-solid fa-percent',
        detalhe: acrescimoElegivel
          ? 'Para quem é aposentado por invalidez e precisa de um cuidador o tempo todo.'
          : 'Só para quem é aposentado por invalidez e precisa de ajuda o tempo todo.',
        selo: respostas.aposentadoriaIncapacidade === 'nao-sei' ? 'Faltam informações' : acrescimoElegivel ? 'Pode se aplicar' : 'Consultar critérios oficiais',
        classeSelo: acrescimoElegivel ? 'selo--atencao' : 'selo--neutro',
        elegivel: acrescimoElegivel,
        link: 'https://www.gov.br/pt-br/servicos/solicitar-acrescimo-de-25-por-cento-na-aposentadoria-por-incapacidade-permanente-aposentadoria-por-invalidez',
        rotuloLink: 'Ver regras no gov.br'
      },
      {
        titulo: 'Desconto na conta de luz (Tarifa Social)',
        icone: 'fa-solid fa-bolt',
        detalhe: 'Consulte a distribuidora ou o canal oficial para verificar os critérios de renda, cadastro e consumo.',
        selo: rendaDesconhecida || respostas.cadunico === 'nao-sei' ? 'Faltam informações' : tarifaElegivel ? 'Pode se aplicar' : 'Consultar critérios oficiais',
        classeSelo: tarifaElegivel ? (respostas.cadunico === 'em-dia' ? 'selo--sucesso' : 'selo--info') : 'selo--neutro',
        elegivel: tarifaElegivel,
        link: 'https://www.gov.br/aneel/pt-br/assuntos/tarifas/tarifa-social',
        rotuloLink: 'Consultar Tarifa Social na ANEEL'
      },
      {
        titulo: 'Melhor em Casa (o SUS atende em casa)',
        icone: 'fa-solid fa-house-medical',
        detalhe: precisaAjuda
          ? 'A equipe do SUS pode atender em casa, se o médico indicar. Peça o encaminhamento no posto de saúde ou no hospital.'
          : 'Para quem não consegue sair da cama ou precisa de cuidados todo dia em casa.',
        selo: precisaAjuda ? 'Pode se aplicar' : 'Consultar critérios oficiais',
        classeSelo: precisaAjuda ? 'selo--atencao' : 'selo--neutro',
        elegivel: precisaAjuda,
        link: 'https://www.gov.br/saude/pt-br/composicao/saes/melhor-em-casa',
        rotuloLink: 'Saber mais'
      },
      {
        titulo: 'Remédios caros de graça (CEAF)',
        icone: 'fa-solid fa-prescription-bottle-medical',
        detalhe: ceafElegivel
          ? 'A doença dela pode estar na lista do SUS. Veja os papéis e o laudo na Secretaria de Saúde do estado.'
          : 'Para tratamentos longos com remédios caros que estão na lista do SUS.',
        selo: respostas.saudeEspecializada === 'nao-sei' ? 'Faltam informações' : ceafElegivel ? 'Pode se aplicar' : 'Consultar critérios oficiais',
        classeSelo: ceafElegivel ? 'selo--atencao' : 'selo--neutro',
        elegivel: ceafElegivel,
        link: 'https://www.gov.br/saude/pt-br/composicao/sectics/daf/ceaf',
        rotuloLink: 'Ver as regras'
      },
      {
        titulo: 'Fisioterapia e aparelhos no SUS',
        icone: 'fa-solid fa-wheelchair',
        detalhe: reabilitacaoElegivel
          ? 'O SUS tem fisioterapia e pode dar cadeira de rodas, andador e outros aparelhos depois de uma avaliação no posto de saúde.'
          : 'O SUS oferece depois de uma avaliação, para quem precisa de fisioterapia ou de ajuda para andar.',
        selo: respostas.saudeEspecializada === 'nao-sei' ? 'Faltam informações' : reabilitacaoElegivel ? 'Pode se aplicar' : 'Consultar critérios oficiais',
        classeSelo: reabilitacaoElegivel ? 'selo--atencao' : 'selo--neutro',
        elegivel: reabilitacaoElegivel,
        link: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/saude-da-pessoa-com-deficiencia',
        rotuloLink: 'Ver rede no gov.br'
      },
      {
        titulo: 'Tratamento em outra cidade (TFD)',
        icone: 'fa-solid fa-van-shuttle',
        detalhe: tfdElegivel
          ? 'O SUS pode ajudar com a viagem e a estadia para se tratar em outra cidade. Pergunte na Secretaria de Saúde da sua cidade.'
          : 'Só quando o tratamento não existe na sua cidade.',
        selo: respostas.tratamentoFora === 'nao-sei' ? 'Faltam informações' : tfdElegivel ? 'Pode se aplicar' : 'Consultar critérios oficiais',
        classeSelo: tfdElegivel ? 'selo--atencao' : 'selo--neutro',
        elegivel: tfdElegivel,
        link: 'https://wiki.saude.gov.br/regulacao/index.php/Tratamento_Fora_do_Domic%C3%ADlio_(TFD)',
        rotuloLink: 'Ver as regras'
      }
    ].sort((a, b) => Number(b.elegivel) - Number(a.elegivel));
  };

  const renderizarResultado = () => {
    const itens = calcularDireitos();
    if (tituloResultado) {
      tituloResultado.textContent = 'Serviços e benefícios para a Mari consultar';
    }
    const resumoRespostasEl = pagina.querySelector('[data-simulador-resumo-respostas]');
    if (resumoRespostasEl) {
      const rotuloSelecionado = grupo => {
        const valor = respostas[grupo];
        const botao = valor && pagina.querySelector(`[data-simulador-grupo="${grupo}"] [data-simulador-valor="${valor}"]`);
        return botao ? botao.textContent.replace(/\s+/g, ' ').trim() : '';
      };
      const resumoPartes = [
        rotuloSelecionado('moradia') && `Moradia: ${rotuloSelecionado('moradia')}`,
        rotuloSelecionado('renda') && `Renda: ${rotuloSelecionado('renda')}`,
        rotuloSelecionado('cadunico') && `CadÚnico: ${rotuloSelecionado('cadunico')}`
      ].filter(Boolean);
      resumoRespostasEl.textContent = resumoPartes.length ? `Suas respostas · ${resumoPartes.join(' · ')}` : '';
    }
    if (listaResultados) {
      listaResultados.innerHTML = itens.map(item => `
        <li class="direitos-simulador__resultado-item ${item.elegivel ? 'direitos-simulador__resultado-item--elegivel' : ''}">
          <span class="apoio__icone" aria-hidden="true"><i class="${escaparHtml(item.icone)}"></i></span>
          <div class="direitos-simulador__resultado-conteudo">
            <div class="direitos-simulador__resultado-topo">
              <strong>${escaparHtml(item.titulo)}</strong>
              <span class="selo ${item.classeSelo}">${escaparHtml(item.selo)}</span>
            </div>
            <p>${escaparHtml(item.detalhe)}</p>
            <a class="botao botao--secundario botao--pequeno" href="${escaparHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escaparHtml(item.rotuloLink)} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
          </div>
        </li>
      `).join('');
    }
  };

  pagina.addEventListener('click', async evento => {
    if (evento.target.closest('[data-simulador-iniciar]') || evento.target.closest('[data-simulador-refazer]')) {
      reiniciarRespostas();
      mostrarEtapa('perguntas');
      atualizarPasso(0, true);
      return;
    }

    if (evento.target.closest('[data-simulador-anterior]')) {
      if (passoAtual === 0) {
        mostrarEtapa('inicial');
      } else {
        atualizarPasso(passoAtual - 1, true);
      }
      return;
    }

    if (evento.target.closest('[data-simulador-proximo]')) {
      if (!passoTemResposta(passoAtual)) return;
      atualizarPasso(passoAtual + 1, true);
      return;
    }

    const opcao = evento.target.closest('[data-simulador-grupo] [data-simulador-valor]');
    if (opcao) {
      const grupo = opcao.closest('[data-simulador-grupo]').dataset.simuladorGrupo;
      respostas[grupo] = opcao.dataset.simuladorValor;
      opcao.closest('[data-simulador-grupo]').querySelectorAll('[data-simulador-valor]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn === opcao));
      });
      atualizarBotaoAvanco();
      return;
    }

    if (evento.target.closest('[data-simulador-copiar]')) {
      const itens = calcularDireitos();
      const texto = [
        `Mutirão · Direitos da Mari (${idadePessoa} anos)`,
        ...itens.map(i => `• ${i.titulo} (${i.selo}): ${i.detalhe}`),
        'Confirme as regras no CRAS, no INSS ou no posto (UBS), de acordo com o serviço.'
      ].join('\n');

      try {
        await navigator.clipboard.writeText(texto);
        anunciarStatus(elementoStatus, 'Resumo copiado. Agora é só colar no grupo da família.');
      } catch {
        anunciarStatus(elementoStatus, 'Não deu para copiar sozinho.');
      }
    }
  });

  formPerguntas?.addEventListener('submit', evento => {
    evento.preventDefault();
    if (!passoTemResposta(passoAtual)) return;
    renderizarResultado();
    mostrarEtapa('resultado');
    tituloResultado?.focus();
  });

  mostrarEtapa('inicial');

  // --- Serviços na sua cidade (IBGE + ViaCEP) ---
  const painelLocalidade = pagina.querySelector('[data-localidade-painel]');
  if (painelLocalidade) {
    const formLocalidade = painelLocalidade.querySelector('[data-localidade-form]');
    const campoCep = painelLocalidade.querySelector('[data-localidade-cep]');
    const botaoCep = painelLocalidade.querySelector('[data-localidade-buscar-cep]');
    const selectUf = painelLocalidade.querySelector('[data-localidade-uf]');
    const selectMunicipio = painelLocalidade.querySelector('[data-localidade-municipio]');
    const erroLocalidade = painelLocalidade.querySelector('[data-localidade-erro]');
    const blocoResultado = painelLocalidade.querySelector('[data-localidade-resultado]');
    const textoIbge = painelLocalidade.querySelector('[data-localidade-ibge]');
    const textoNomeCidade = painelLocalidade.querySelector('[data-localidade-nome]');
    const descUbs = painelLocalidade.querySelector('[data-localidade-ubs-desc]');
    const linkUbs = painelLocalidade.querySelector('[data-localidade-link-ubs]');
    const descCras = painelLocalidade.querySelector('[data-localidade-cras-desc]');
    const linkCras = painelLocalidade.querySelector('[data-localidade-link-cras]');

    const limparErroLocalidade = () => {
      if (erroLocalidade) {
        erroLocalidade.textContent = '';
        erroLocalidade.hidden = true;
      }
      campoCep?.removeAttribute('aria-invalid');
    };

    const mostrarErroLocalidade = mensagem => {
      if (erroLocalidade) {
        erroLocalidade.textContent = mensagem;
        erroLocalidade.hidden = false;
      }
      if (blocoResultado) blocoResultado.hidden = true;
    };

    const exibirLocalidade = ({ cidade, uf, bairro = '', ibge = '' }) => {
      if (!cidade || !uf || !blocoResultado) return;
      limparErroLocalidade();
      const tituloLocal = bairro ? `${bairro} · ${cidade} (${uf})` : `${cidade} (${uf})`;
      if (textoNomeCidade) textoNomeCidade.textContent = tituloLocal;
      if (textoIbge) textoIbge.textContent = ibge ? `Código IBGE: ${ibge}` : `UF: ${uf}`;

      const termoBase = bairro ? `${bairro} ${cidade} ${uf}` : `${cidade} ${uf}`;
      if (descUbs) {
        descUbs.textContent = `Postos de saúde perto de ${tituloLocal} para consultas e encaminhamentos.`;
      }
      if (linkUbs) {
        linkUbs.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`UBS ${termoBase}`)}`;
        linkUbs.setAttribute('aria-label', `Ver postos perto de ${tituloLocal} no mapa (abre em outra aba)`);
      }
      if (descCras) {
        descCras.textContent = `Ache o CRAS de ${cidade} (${uf}) para fazer ou atualizar o Cadastro Único e pedir o BPC.`;
      }
      if (linkCras) {
        linkCras.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`CRAS ${termoBase}`)}`;
        linkCras.setAttribute('aria-label', `Ver CRAS em ${tituloLocal} no mapa (abre em outra aba)`);
      }

      blocoResultado.hidden = false;
      anunciarStatus(elementoStatus, `Serviços públicos de ${tituloLocal}.`);
    };

    let requisicaoMunicipiosId = 0;
    let abortControllerMunicipios = null;

    const carregarMunicipios = async (uf, ibgeSelecionado = '') => {
      if (!selectMunicipio) return;
      const idAtual = ++requisicaoMunicipiosId;
      if (abortControllerMunicipios) abortControllerMunicipios.abort();

      if (!uf) {
        abortControllerMunicipios = null;
        selectMunicipio.innerHTML = '<option value="">Escolha o estado primeiro</option>';
        selectMunicipio.disabled = true;
        return;
      }

      abortControllerMunicipios = new AbortController();
      selectMunicipio.disabled = true;
      selectMunicipio.innerHTML = '<option value="">Carregando cidades...</option>';

      try {
        const resposta = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`, {
          signal: abortControllerMunicipios.signal
        });
        if (!resposta.ok) throw new Error('Não deu para carregar as cidades');
        const municipios = await resposta.json();
        if (idAtual !== requisicaoMunicipiosId) return;

        selectMunicipio.innerHTML = '<option value="">Escolha a cidade...</option>' +
          municipios.map(m => `<option value="${escaparHtml(String(m.id))}" data-nome="${escaparHtml(m.nome)}">${escaparHtml(m.nome)}</option>`).join('');
        selectMunicipio.disabled = false;

        if (ibgeSelecionado) {
          selectMunicipio.value = String(ibgeSelecionado);
        }
      } catch (erro) {
        if (erro?.name === 'AbortError' || idAtual !== requisicaoMunicipiosId) return;
        selectMunicipio.innerHTML = '<option value="">Não deu para carregar</option>';
        mostrarErroLocalidade('Não deu para buscar as cidades agora.');
      }
    };

    const carregarEstados = async () => {
      if (!selectUf) return;
      try {
        const resposta = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        if (!resposta.ok) throw new Error('Não deu para carregar os estados');
        const estados = await resposta.json();
        selectUf.innerHTML = '<option value="">Escolha o estado...</option>' +
          estados.map(e => `<option value="${escaparHtml(e.sigla)}">${escaparHtml(e.nome)} (${escaparHtml(e.sigla)})</option>`).join('');
      } catch {
        selectUf.innerHTML = '<option value="">Fora do ar agora</option>';
      }
    };

    campoCep?.addEventListener('input', () => {
      const digitos = campoCep.value.replace(/\D/g, '').slice(0, 8);
      campoCep.value = digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
      limparErroLocalidade();
    });

    let acaoLocalidadeId = 0;
    let abortControllerCep = null;

    selectUf?.addEventListener('change', () => {
      acaoLocalidadeId += 1;
      if (abortControllerCep) abortControllerCep.abort();
      limparErroLocalidade();
      if (blocoResultado) blocoResultado.hidden = true;
      if (selectMunicipio) selectMunicipio.value = '';
      carregarMunicipios(selectUf.value);
    });

    selectMunicipio?.addEventListener('change', () => {
      acaoLocalidadeId += 1;
      if (abortControllerCep) abortControllerCep.abort();
      const opcao = selectMunicipio.selectedOptions[0];
      const cidade = opcao?.dataset.nome;
      const uf = selectUf?.value;
      if (cidade && uf) {
        exibirLocalidade({ cidade, uf, ibge: selectMunicipio.value });
      }
    });

    formLocalidade?.addEventListener('submit', async evento => {
      evento.preventDefault();
      const cepLimpo = (campoCep?.value || '').replace(/\D/g, '');
      if (cepLimpo.length !== 8) {
        mostrarErroLocalidade('Digite um CEP com 8 números.');
        campoCep?.focus();
        return;
      }

      const idCep = ++acaoLocalidadeId;
      if (abortControllerCep) abortControllerCep.abort();
      abortControllerCep = new AbortController();

      limparErroLocalidade();
      botaoCep?.setAttribute('aria-busy', 'true');
      if (botaoCep) botaoCep.disabled = true;

      try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
          signal: abortControllerCep.signal
        });
        if (!resposta.ok) throw new Error('Não deu para buscar o CEP');
        const dados = await resposta.json();
        if (idCep !== acaoLocalidadeId) return;
        if (dados.erro) {
          mostrarErroLocalidade('Não achamos esse CEP. Confira os números ou escolha o estado e a cidade.');
          campoCep?.focus();
          return;
        }

        if (selectUf) {
          selectUf.value = dados.uf;
          await carregarMunicipios(dados.uf, dados.ibge);
          if (idCep !== acaoLocalidadeId) return;
        }
        exibirLocalidade({
          cidade: dados.localidade,
          uf: dados.uf,
          bairro: dados.bairro || '',
          ibge: dados.ibge || ''
        });
      } catch (erro) {
        if (erro?.name === 'AbortError' || idCep !== acaoLocalidadeId) return;
        mostrarErroLocalidade('Não deu para buscar o CEP agora. Tente escolher o estado e a cidade ao lado.');
      } finally {
        botaoCep?.removeAttribute('aria-busy');
        if (botaoCep) botaoCep.disabled = false;
      }
    });

    carregarEstados();
  }
})();
