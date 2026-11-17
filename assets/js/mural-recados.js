(() => {
  const mural = document.querySelector('[data-mural]');
  const core = window.MutiraoCuidado;
  if (!mural || !core) return;

  const { obterEstado, atualizarEstado, escaparHtml, anunciarStatus } = core;

  const dialogo = document.getElementById('dialogo-figurinhas');
  const abas = dialogo.querySelector('[data-figurinhas-abas]');
  const grade = dialogo.querySelector('[data-figurinhas-grade]');
  const contexto = dialogo.querySelector('[data-figurinhas-contexto]');
  const botaoTirar = dialogo.querySelector('[data-tirar-figurinha]');
  const total = document.querySelector('[data-mural-total]');
  const elementoStatus = document.querySelector('[data-mvp-status]');

  const PERSONAGENS = [
    { id: 'ze', nome: 'Cubado' },
    { id: 'mari', nome: 'Idosa' },
    { id: 'bea', nome: 'Cuidadora' },
    { id: 'aninha', nome: 'Espeto' },
    { id: 'paul', nome: 'Pingo' },
    { id: 'minhoca', nome: 'Minhoca' },
    { id: 'trevo', nome: 'Trevo' }
  ];

  const EMOCOES = {
    joinha: 'joinha', coracao: 'com coração', risada: 'rindo', gratidao: 'agradecendo', tchau: 'acenando', cafe: 'com café',
    beijinho: 'mandando beijo', comemorando: 'comemorando', abraco: 'abraçando', tranquila: 'tranquila', ok: 'tudo certo',
    carinho: 'carinho', alegria: 'alegria', oculos: 'de óculos escuros', chorando: 'chorando', festa: 'festa',
    oi: 'oi', sono: 'com sono', flor: 'com uma flor', triste: 'triste', apaixonado: 'apaixonado',
    forca: 'força', relaxado: 'relaxado', bravo: 'bravo', chateado: 'chateado', surpresa: 'surpresa'
  };

  const FIGURINHAS = {
    mari: ['joinha', 'coracao', 'risada', 'gratidao', 'tchau', 'cafe'],
    bea: ['joinha', 'beijinho', 'comemorando', 'abraco', 'tranquila', 'ok'],
    aninha: ['carinho', 'alegria', 'coracao', 'oculos', 'chorando', 'festa'],
    minhoca: ['oi', 'coracao', 'tranquila', 'comemorando', 'sono', 'flor'],
    paul: ['joinha', 'alegria', 'coracao', 'oculos', 'triste', 'apaixonado'],
    ze: ['forca', 'carinho', 'relaxado', 'comemorando', 'bravo', 'coracao'],
    trevo: ['coracao', 'festa', 'tranquila', 'chateado', 'surpresa', 'apaixonado']
  };

  const RECADOS = [
    {
      id: 'recado-aninha',
      autor: 'Aninha',
      data: '11/11',
      texto: 'Zé, obrigada por segurar todas as noites. Graças a você eu consigo dormir um pouco.',
      cor: 'manteiga',
      pino: 'lilas',
      giro: -2,
      figurinhas: [{ id: 'mari-coracao', por: 'Aninha' }]
    },
    {
      id: 'recado-paul',
      autor: 'Paul',
      data: '12/11',
      texto: 'Zé, a vó fala de você com o maior carinho. Obrigado por cuidar dela com tanto amor!',
      cor: 'branco',
      pino: 'amarelo',
      giro: 1.5,
      figurinhas: [{ id: 'minhoca-flor', por: 'Paul' }]
    },
    {
      id: 'recado-bea',
      autor: 'Bea',
      data: '9/11',
      texto: 'A Dona Mari dormiu tranquila depois da sua visita. Obrigada!',
      cor: 'manteiga',
      pino: 'lilas',
      giro: -1,
      figurinhas: []
    }
  ];

  const LUGARES = ['esquerda', 'direita', 'base'];
  let recadoEmFoco = null;
  let personagemAtivo = 'ze';
  let ultimaColada = null;

  const descrever = id => {
    const [personagem, emocao] = id.split('-');
    const nome = PERSONAGENS.find(item => item.id === personagem)?.nome || personagem;
    return `${nome} ${EMOCOES[emocao] || emocao}`;
  };

  const obterReacoes = () => obterEstado().reacoesRecados || {};

  const montarFigurinha = (figurinha, lugar, minha, recado) => {
    const imagem = `<img src="assets/media/figurinhas/${escaparHtml(figurinha.id)}.webp" alt="" width="72" height="72" loading="lazy">`;
    const selo = `<span class="figurinha-colada__quem" data-quem="${escaparHtml(figurinha.por)}" aria-hidden="true">${escaparHtml(figurinha.por.charAt(0))}</span>`;
    const animar = minha && ultimaColada === recado.id ? ' figurinha-colada--nova' : '';
    if (minha) {
      return `<button type="button" class="figurinha-colada figurinha-colada--${lugar}${animar}" data-tirar-da="${escaparHtml(recado.id)}" aria-label="Sua figurinha: ${escaparHtml(descrever(figurinha.id))}. Trocar ou tirar">${imagem}${selo}</button>`;
    }
    return `<span class="figurinha-colada figurinha-colada--${lugar}" role="img" aria-label="Figurinha ${escaparHtml(descrever(figurinha.id))}, colada por ${escaparHtml(figurinha.por)}">${imagem}${selo}</span>`;
  };

  const renderizar = () => {
    const reacoes = obterReacoes();
    const perfilUsuario = obterEstado().perfilUsuario;
    const quemReagiu = (perfilUsuario?.apelido || perfilUsuario?.nome || 'Zé').trim().split(/\s+/)[0] || 'Zé';
    total.textContent = `${RECADOS.length} esta semana`;
    mural.innerHTML = RECADOS.map(recado => {
      const coladas = recado.figurinhas.map((figurinha, indice) => montarFigurinha(figurinha, LUGARES[indice], false, recado));
      if (reacoes[recado.id]) {
        const lugarReacao = recado.figurinhas.length < 2 ? 'direita' : 'base';
        coladas.push(montarFigurinha({ id: reacoes[recado.id], por: quemReagiu }, lugarReacao, true, recado));
      }
      return `<li class="recado-postit recado-postit--${recado.cor}" style="--giro: ${recado.giro}deg">
        <span class="recado-postit__pino recado-postit__pino--${recado.pino}" aria-hidden="true"></span>
        ${coladas.join('')}
        <blockquote>${escaparHtml(recado.texto)}</blockquote>
        <p class="recado-postit__autor">— ${escaparHtml(recado.autor)}, ${escaparHtml(recado.data)}</p>
        <div class="recado-postit__acoes">
          <button type="button" class="botao botao--terciario botao--pequeno" data-abrir-recado="${escaparHtml(recado.autor)}">Responder</button>
          <button type="button" class="botao botao--terciario botao--pequeno" data-reagir="${escaparHtml(recado.id)}" aria-label="Reagir ao recado de ${escaparHtml(recado.autor)} com uma figurinha"><i class="fa-regular fa-face-smile" aria-hidden="true"></i> Reagir</button>
        </div>
      </li>`;
    }).join('');
    ultimaColada = null;
  };

  const renderizarAbas = () => {
    abas.innerHTML = PERSONAGENS.map(personagem => `<button type="button" role="tab" id="aba-figurinha-${personagem.id}" aria-selected="${personagem.id === personagemAtivo}" tabindex="${personagem.id === personagemAtivo ? 0 : -1}" data-personagem="${personagem.id}">
      <img src="assets/media/figurinhas/${personagem.id}-${FIGURINHAS[personagem.id][0]}.webp" alt="" width="32" height="32">${escaparHtml(personagem.nome)}
    </button>`).join('');
    grade.setAttribute('aria-labelledby', `aba-figurinha-${personagemAtivo}`);
    const atual = obterReacoes()[recadoEmFoco?.id];
    grade.innerHTML = FIGURINHAS[personagemAtivo].map(emocao => {
      const id = `${personagemAtivo}-${emocao}`;
      return `<button type="button" class="figurinhas__item" data-colar="${id}" aria-pressed="${atual === id}" aria-label="${escaparHtml(descrever(id))}">
        <img src="assets/media/figurinhas/${id}.webp" alt="" width="88" height="88" loading="lazy">
      </button>`;
    }).join('');
  };

  const abrirSeletor = id => {
    recadoEmFoco = RECADOS.find(recado => recado.id === id);
    if (!recadoEmFoco) return;
    contexto.textContent = `A figurinha fica colada no recado de ${recadoEmFoco.autor}.`;
    botaoTirar.hidden = !obterReacoes()[id];
    renderizarAbas();
    dialogo.showModal();
  };

  const colar = figurinha => {
    if (!recadoEmFoco) return;
    const id = recadoEmFoco.id;
    atualizarEstado(estado => ({ ...estado, reacoesRecados: { ...(estado.reacoesRecados || {}), [id]: figurinha } }));
    ultimaColada = id;
    dialogo.close();
    renderizar();
    mural.querySelector(`[data-tirar-da="${id}"]`)?.focus();
    anunciarStatus(elementoStatus, `Figurinha colada no recado de ${recadoEmFoco.autor}.`);
  };

  const tirar = () => {
    if (!recadoEmFoco) return;
    const id = recadoEmFoco.id;
    atualizarEstado(estado => {
      const reacoes = { ...(estado.reacoesRecados || {}) };
      delete reacoes[id];
      return { ...estado, reacoesRecados: reacoes };
    });
    dialogo.close();
    renderizar();
    mural.querySelector(`[data-reagir="${id}"]`)?.focus();
    anunciarStatus(elementoStatus, `Figurinha tirada do recado de ${recadoEmFoco.autor}.`);
  };

  mural.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-reagir], [data-tirar-da]');
    if (botao) abrirSeletor(botao.dataset.reagir || botao.dataset.tirarDa);
  });

  abas.addEventListener('click', evento => {
    const aba = evento.target.closest('[data-personagem]');
    if (!aba) return;
    personagemAtivo = aba.dataset.personagem;
    renderizarAbas();
    abas.querySelector(`[data-personagem="${personagemAtivo}"]`)?.focus();
  });

  abas.addEventListener('keydown', evento => {
    if (!['ArrowRight', 'ArrowLeft'].includes(evento.key)) return;
    const indice = PERSONAGENS.findIndex(item => item.id === personagemAtivo);
    const passo = evento.key === 'ArrowRight' ? 1 : -1;
    personagemAtivo = PERSONAGENS[(indice + passo + PERSONAGENS.length) % PERSONAGENS.length].id;
    renderizarAbas();
    abas.querySelector(`[data-personagem="${personagemAtivo}"]`)?.focus();
    evento.preventDefault();
  });

  grade.addEventListener('click', evento => {
    const item = evento.target.closest('[data-colar]');
    if (item) colar(item.dataset.colar);
  });

  botaoTirar.addEventListener('click', tirar);

  renderizar();
})();
