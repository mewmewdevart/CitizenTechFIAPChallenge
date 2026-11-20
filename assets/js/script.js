const CHAVE_TEMA = 'mutirao-tema';
const TEMAS = ['neutro', 'acolhedor'];
const FONTES_TEMA_ACOLHEDOR = 'https://fonts.googleapis.com/css2?family=Gloock&family=Gochi+Hand&family=Onest:wght@400;600;700&display=swap';

function obterTemaSalvo() {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    return TEMAS.includes(salvo) ? salvo : 'neutro';
  } catch {
    return 'neutro';
  }
}

function aplicarTema(tema) {
  const acolhedor = tema === 'acolhedor';
  document.documentElement.classList.toggle('tema--acolhedor', acolhedor);
  if (acolhedor && !document.querySelector(`link[href="${FONTES_TEMA_ACOLHEDOR}"]`)) {
    const fontes = document.createElement('link');
    fontes.rel = 'stylesheet';
    fontes.href = FONTES_TEMA_ACOLHEDOR;
    document.head.append(fontes);
  }
  for (const botao of document.querySelectorAll('[data-tema]')) {
    botao.setAttribute('aria-pressed', String(botao.dataset.tema === tema));
  }
}

function definirTema(tema) {
  const valido = TEMAS.includes(tema) ? tema : 'neutro';
  try {
    localStorage.setItem(CHAVE_TEMA, valido);
  } catch {
    return aplicarTema(valido);
  }
  aplicarTema(valido);
}

aplicarTema(obterTemaSalvo());

window.MutiraoTema = {
  restaurar() {
    try {
      localStorage.removeItem(CHAVE_TEMA);
    } catch {
      // Ignora erro caso localStorage esteja indisponível.
    }
    return aplicarTema('neutro');
  }
};

for (const botao of document.querySelectorAll('[data-tema]')) {
  botao.addEventListener('click', () => definirTema(botao.dataset.tema));
}

window.addEventListener('storage', evento => {
  if (evento.key === CHAVE_TEMA) aplicarTema(obterTemaSalvo());
});

const alternarMenu = document.querySelector('#alternar-menu');
const telaMobile = window.matchMedia('(width < 1150px)');
const botaoMais = document.querySelector('#botao-mais');
const linksMenu = [...document.querySelectorAll('#barra-lateral nav a')];
const atalhosInferiores = [...document.querySelectorAll('.barra-inferior a')];
const perfilMobile = document.querySelector('.barra-lateral__perfil-mobile');
const CHAVE_MENU_STORAGE = 'mutirao-menu-aberto';
let gatilhoMenu = alternarMenu;

function obterNomePagina(href) {
  return new URL(href, location.href).pathname.split('/').pop() || 'home.html';
}

function obterEstadoInicialMenuDesktop() {
  try {
    const salvo = sessionStorage.getItem(CHAVE_MENU_STORAGE);
    return salvo === null ? true : salvo === 'true';
  } catch {
    return true;
  }
}

function definirMenu(aberto, persistir = false) {
  document.body.classList.toggle('menu-fechado', !aberto);
  alternarMenu?.setAttribute('aria-expanded', String(aberto));
  botaoMais?.setAttribute('aria-expanded', String(aberto && telaMobile.matches));

  if (persistir && !telaMobile.matches) {
    try {
      sessionStorage.setItem(CHAVE_MENU_STORAGE, String(aberto));
    } catch {
      // Ignora erro caso o navegador bloqueie storage local
    }
  }
}

function atualizarPaginaAtual() {
  const paginaAtual = location.pathname.split('/').pop() || 'home.html';
  for (const link of [...linksMenu, ...atalhosInferiores]) {
    if (obterNomePagina(link.href) === paginaAtual) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const naBarraLateral = paginaAtual === 'meu-perfil.html' || linksMenu.some(link => obterNomePagina(link.href) === paginaAtual);
  const nosAtalhos = atalhosInferiores.some(link => obterNomePagina(link.href) === paginaAtual);
  botaoMais?.classList.toggle('barra-inferior__item--ativo', naBarraLateral && !nosAtalhos);
}

for (const botao of [alternarMenu, botaoMais].filter(Boolean)) {
  botao.addEventListener('click', () => {
    gatilhoMenu = botao;
    const aberto = alternarMenu?.getAttribute('aria-expanded') !== 'true';
    definirMenu(aberto, true);
    if (aberto && telaMobile.matches) perfilMobile?.focus();
  });
}

telaMobile.addEventListener('change', () => {
  definirMenu(telaMobile.matches ? false : obterEstadoInicialMenuDesktop());
});

for (const link of [...linksMenu, ...atalhosInferiores, perfilMobile].filter(Boolean)) {
  link.addEventListener('click', () => {
    if (telaMobile.matches) {
      definirMenu(false);
      (atalhosInferiores.includes(link) ? link : gatilhoMenu)?.focus();
    }
  });
}

const painelNotificacoes = document.querySelector('.menu-notificacoes');
const listaNotificacoes = painelNotificacoes?.querySelector('.menu-notificacoes__lista');
const gatilhoNotificacoes = painelNotificacoes?.querySelector('summary');
const CHAVE_NOTIFICACOES = 'mutirao-notificacoes-sessao-v1';
let notificacoesLocais = [];

try {
  const salvo = JSON.parse(sessionStorage.getItem(CHAVE_NOTIFICACOES) || '[]');
  if (Array.isArray(salvo)) notificacoesLocais = salvo;
} catch {
  // Mantém as notificações desta página quando o armazenamento estiver indisponível.
}

function salvarNotificacoes() {
  try {
    sessionStorage.setItem(CHAVE_NOTIFICACOES, JSON.stringify(notificacoesLocais));
  } catch {
    // O painel continua funcional nesta página.
  }
}

const somNotificacao = new Audio('assets/media/sounds/pop-sound-effect.mp3');

function lerConfiguracoesSessao() {
  try {
    return JSON.parse(sessionStorage.getItem('mutirao-configuracoes-sessao-v1') || '{}');
  } catch {
    return {};
  }
}

function preferenciaAtiva(chave, padrao = true) {
  const cfg = lerConfiguracoesSessao();
  return chave in cfg ? Boolean(cfg[chave]) : padrao;
}

function tocarSomNotificacao() {
  if (!preferenciaAtiva('notificacoesSom', true)) return;
  try {
    somNotificacao.currentTime = 0;
    somNotificacao.play().catch(() => { });
  } catch {
    // Ignora caso o navegador bloqueie áudio antes de interação.
  }
}

function resolverAvatarNotificacao(avatar) {
  return avatar || window.MutiraoCuidado?.obterUsuarioAtual().avatar || 'assets/media/mascotes/icone-mascote-cubado.svg';
}

function renderizarNotificacoes() {
  const core = window.MutiraoCuidado;
  if (!core || !listaNotificacoes || !gatilhoNotificacoes) return;
  listaNotificacoes.setAttribute('aria-live', 'polite');
  const locais = notificacoesLocais.filter(item => item.perfilId === core.obterPerfilAtivoId());
  renderizarAvisosDaRotina(core);
  listaNotificacoes.prepend(...locais.map(({ titulo, descricao, destino, avatar, lida }) => {
    const item = document.createElement('li');
    item.className = 'notificacao';
    item.dataset.notificacaoLocal = '';
    if (!lida) item.dataset.naoLida = 'true';
    const link = document.createElement('a');
    link.className = 'notificacao__link';
    link.href = destino || 'home.html';
    const img = document.createElement('img');
    img.className = 'notificacao__avatar';
    img.src = resolverAvatarNotificacao(avatar);
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    const bloco = document.createElement('div');
    const nome = document.createElement('h3');
    const texto = document.createElement('p');
    nome.textContent = titulo;
    texto.textContent = descricao;
    bloco.append(nome, texto);
    const seta = document.createElement('i');
    seta.className = 'fa-solid fa-chevron-right notificacao__seta';
    seta.setAttribute('aria-hidden', 'true');
    link.append(img, bloco, seta);
    item.append(link);
    return item;
  }));

  const novas = locais.filter(item => !item.lida).length;
  const total = listaNotificacoes.children.length;
  if (!total) {
    const item = document.createElement('li');
    item.className = 'notificacao__vazio';
    item.textContent = 'Nenhum aviso para esta ficha.';
    listaNotificacoes.append(item);
  }
  gatilhoNotificacoes.classList.toggle('botao-icone--notificacao', total > 0);
  gatilhoNotificacoes.setAttribute('aria-label', 'Notificações (' + total + ' itens' + (novas ? ', ' + novas + ' novas' : '') + ')');
  if (novas > 0) gatilhoNotificacoes.setAttribute('data-nova-notificacao', 'true');
  else gatilhoNotificacoes.removeAttribute('data-nova-notificacao');
}

window.MutiraoNotificacoes = {
  registrar(titulo, descricao, destino, avatar) {
    const perfilId = window.MutiraoCuidado?.obterPerfilAtivoId();
    if (!perfilId) return;
    const outros = notificacoesLocais.filter(item => item.perfilId !== perfilId);
    const locais = notificacoesLocais.filter(item => item.perfilId === perfilId);
    locais.unshift({ perfilId, titulo, descricao, destino, avatar: resolverAvatarNotificacao(avatar), lida: false });
    notificacoesLocais = [...locais.slice(0, 12), ...outros];
    salvarNotificacoes();
    renderizarNotificacoes();
    tocarSomNotificacao();
  },
  limpar() {
    notificacoesLocais = [];
    try {
      sessionStorage.removeItem(CHAVE_NOTIFICACOES);
    } catch {
      // Ignora quando o armazenamento estiver indisponível.
    }
    renderizarNotificacoes();
  }
};

renderizarNotificacoes();

for (const menuSuspenso of document.querySelectorAll('.barra-topo details')) {
  menuSuspenso.addEventListener('toggle', () => {
    if (menuSuspenso.classList.contains('menu-notificacoes')) {
      if (menuSuspenso.open) {
        gatilhoNotificacoes?.removeAttribute('data-nova-notificacao');
      } else {
        const perfilId = window.MutiraoCuidado?.obterPerfilAtivoId();
        notificacoesLocais.forEach(item => {
          if (perfilId && item.perfilId === perfilId) item.lida = true;
        });
        salvarNotificacoes();
        renderizarNotificacoes();
      }
    }
    if (!menuSuspenso.open) return;
    for (const outro of document.querySelectorAll('.barra-topo details[open]')) {
      if (outro !== menuSuspenso) outro.open = false;
    }
  });
}

document.addEventListener('click', evento => {
  for (const menuSuspenso of document.querySelectorAll('.barra-topo details[open]')) {
    if (!menuSuspenso.contains(evento.target) || evento.target.closest('a')) menuSuspenso.open = false;
  }
});

document.addEventListener('keydown', evento => {
  if (evento.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  const menuSuspenso = document.querySelector('.barra-topo details[open]');
  if (menuSuspenso) {
    menuSuspenso.open = false;
    menuSuspenso.querySelector('summary')?.focus();
  } else if (telaMobile.matches && alternarMenu?.getAttribute('aria-expanded') === 'true') {
    definirMenu(false);
    gatilhoMenu?.focus();
  }
});

for (const botao of document.querySelectorAll('[data-dialogo]')) {
  if (botao.dataset.dialogo === 'dialogo-busca') continue;
  botao.addEventListener('click', () => {
    document.getElementById(botao.dataset.dialogo)?.showModal();
  });
}

for (const dialogo of document.querySelectorAll('dialog')) {
  dialogo.addEventListener('click', evento => {
    if (evento.target === dialogo) dialogo.close();
  });
}

if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype._mutiraoFocusAjustado) {
  const showModalOriginal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype._mutiraoFocusAjustado = true;

  const focarPrimeiroCampoDialogo = dialogo => {
    const form = dialogo.querySelector('form:not([method="dialog"])');
    if (!form) return;
    const candidatos = form.querySelectorAll(
      'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"]'
    );
    const primeiroCampo = [...candidatos].find(el => el.offsetParent !== null && !el.closest('[hidden]'));
    if (primeiroCampo) primeiroCampo.focus({ preventScroll: true });
  };

  const restaurarFocoDialogo = dialogo => {
    const { _disparadorFoco: disparador, _containerRetorno: container } = dialogo;
    dialogo.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    dialogo.querySelectorAll('.formulario-mvp__erro').forEach(el => {
      el.textContent = '';
    });

    requestAnimationFrame(() => {
      if (dialogo.open) return;
      if (disparador && document.contains(disparador) && !disparador.disabled && disparador.offsetParent !== null) {
        if (!document.activeElement || document.activeElement === document.body) {
          disparador.focus({ preventScroll: true });
        }
        return;
      }
      if (!document.activeElement || document.activeElement === document.body) {
        const destino = (container && document.contains(container) ? container : null)
          || document.querySelector('main#conteudo, #conteudo');
        if (!destino) return;
        if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
        destino.focus({ preventScroll: true });
      }
    });
  };

  HTMLDialogElement.prototype.showModal = function showModalComFoco() {
    const disparador = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this._disparadorFoco = disparador && !this.contains(disparador) ? disparador : (this._disparadorFoco || null);
    this._containerRetorno = this._disparadorFoco?.closest('section, article, main, [data-pagina-mvp]') || this._containerRetorno || null;
    if (!this._mutiraoCloseVinculado) {
      this._mutiraoCloseVinculado = true;
      this.addEventListener('close', () => restaurarFocoDialogo(this));
    }
    showModalOriginal.call(this);
    focarPrimeiroCampoDialogo(this);
  };
}

const criarDialogoSair = () => {
  let dialogo = document.querySelector('#dialogo-sair-conta');
  if (dialogo) return dialogo;

  dialogo = document.createElement('dialog');
  dialogo.id = 'dialogo-sair-conta';
  dialogo.className = 'dialogo-mvp';
  dialogo.setAttribute('aria-labelledby', 'titulo-sair-conta');
  dialogo.innerHTML = `
    <div class="dialogo-mvp__cabecalho">
      <h2 id="titulo-sair-conta">Sair da conta?</h2>
      <button type="button" class="botao-icone" data-cancelar-saida aria-label="Fechar">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
    <p>Você voltará para a tela de entrada. As alterações da demonstração continuam salvas nesta aba.</p>
    <div class="dialogo-mvp__acoes">
      <button type="button" class="botao botao--secundario" data-cancelar-saida>Cancelar</button>
      <button type="button" class="botao botao--perigo" data-confirmar-saida>Sair</button>
    </div>
  `;
  dialogo.addEventListener('click', evento => {
    if (evento.target === dialogo) dialogo.close();
  });
  dialogo.querySelectorAll('[data-cancelar-saida]').forEach(botao => {
    botao.addEventListener('click', () => dialogo.close());
  });
  dialogo.querySelector('[data-confirmar-saida]')?.addEventListener('click', () => {
    try {
      sessionStorage.removeItem(CHAVE_MENU_STORAGE);
    } catch {
      // Ignora erro caso o navegador bloqueie storage local
    }
    location.href = 'login.html';
  });
  document.body.append(dialogo);
  return dialogo;
};

for (const botaoSair of document.querySelectorAll('[data-acao="sair"]')) {
  botaoSair.addEventListener('click', () => {
    criarDialogoSair().showModal();
  });
}

const itensPesquisaveis = [
  ...linksMenu.map(link => ({ href: link.getAttribute('href'), rotulo: link.textContent.trim() })),
  { href: 'meu-perfil.html', rotulo: 'Meu perfil' },
  { href: 'configuracoes.html', rotulo: 'Configurações' },
  { href: 'privacidade.html', rotulo: 'Privacidade e regras de uso' },
  { href: 'ficha.html', rotulo: 'Ficha de quem recebe cuidado' }
].filter((item, indice, lista) => item.href && lista.findIndex(entrada => entrada.href === item.href) === indice);

const gatilhoBuscaTopo = document.querySelector('.barra-topo [data-busca-topo], .barra-topo [data-dialogo="dialogo-busca"]');

function inicializarBuscaTopo() {
  if (!gatilhoBuscaTopo) return;

  const chaveRecentes = () => {
    const id = window.MutiraoCuidado?.obterPerfilAtivoId();
    return id ? 'mutirao-buscas-recentes-v2:' + id : null;
  };
  const SINONIMOS = {
    remedio: ['medicamento', 'dose', 'pilula', 'comprimido'],
    remedios: ['medicamento', 'dose', 'pilula', 'comprimido'],
    medicamento: ['remedio', 'dose', 'estoque'],
    estoque: ['fralda', 'fraldas', 'insumo', 'reposicao'],
    consulta: ['agenda', 'exame', 'medico', 'ubs'],
    calendario: ['agenda', 'turno', 'compromisso'],
    alergia: ['ficha'],
    emergencia: ['ficha', 'contato', 'ajuda'],
    tema: ['configuracoes', 'acolhedor', 'neutro', 'acessibilidade'],
    fonte: ['acessibilidade', 'contraste', 'configuracoes'],
    folga: ['perfil', 'cuidar', 'turno']
  };

  const container = document.createElement('div');
  container.className = 'busca-topo';

  gatilhoBuscaTopo.removeAttribute('data-dialogo');
  gatilhoBuscaTopo.setAttribute('type', 'button');
  gatilhoBuscaTopo.setAttribute('aria-expanded', 'false');
  gatilhoBuscaTopo.setAttribute('aria-controls', 'busca-topo-painel');
  gatilhoBuscaTopo.classList.add('busca-topo__gatilho');

  const campo = document.createElement('input');
  campo.id = 'campo-busca-topo';
  campo.type = 'search';
  campo.className = 'busca-topo__input';
  campo.placeholder = 'Buscar remédios, agenda, documentos...';
  campo.setAttribute('aria-label', 'Buscar no sistema');
  campo.setAttribute('autocomplete', 'off');

  const botaoLimpar = document.createElement('button');
  botaoLimpar.type = 'button';
  botaoLimpar.className = 'busca-topo__limpar';
  botaoLimpar.hidden = true;
  botaoLimpar.setAttribute('aria-label', 'Limpar busca');
  botaoLimpar.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

  const atalho = document.createElement('kbd');
  atalho.className = 'busca-topo__atalho';
  atalho.setAttribute('aria-hidden', 'true');
  atalho.textContent = 'Ctrl K';

  const painel = document.createElement('div');
  painel.id = 'busca-topo-painel';
  painel.className = 'busca-topo__painel';
  painel.hidden = true;

  const recentesEl = document.createElement('div');
  recentesEl.className = 'busca-topo__recentes';
  recentesEl.hidden = true;

  const status = document.createElement('p');
  status.className = 'busca-topo__status';
  status.setAttribute('role', 'status');

  const lista = document.createElement('ul');
  lista.id = 'resultados-busca-topo';
  lista.className = 'busca-topo__lista';

  painel.append(recentesEl, status, lista);
  gatilhoBuscaTopo.replaceWith(container);
  container.append(gatilhoBuscaTopo, campo, botaoLimpar, atalho, painel);

  const obterRecentes = () => {
    const chave = chaveRecentes();
    if (!chave) return [];
    try {
      const salvo = JSON.parse(sessionStorage.getItem(chave) || '[]');
      return Array.isArray(salvo) ? salvo : [];
    } catch {
      return [];
    }
  };

  const salvarRecente = termoBruto => {
    const limpo = termoBruto.trim();
    const chave = chaveRecentes();
    if (!chave || limpo.length < 2) return;
    const atual = obterRecentes().filter(item => item.toLowerCase() !== limpo.toLowerCase());
    atual.unshift(limpo);
    try {
      sessionStorage.setItem(chave, JSON.stringify(atual.slice(0, 4)));
    } catch {
      // Ignora erro caso sessionStorage esteja indisponível
    }
  };

  const obterItensBusca = () => {
    const core = window.MutiraoCuidado;
    const basePaginas = itensPesquisaveis.map(item => ({
      href: item.href,
      rotulo: item.rotulo,
      detalhe: 'Página do sistema',
      categoria: 'Páginas',
      icone: 'fa-regular fa-compass',
      busca: item.rotulo
    }));
    if (!core) return basePaginas;

    const estado = core.obterEstado();
    const doses = core.obterDoses(estado);
    const medicamentosMap = new Map();
    doses.forEach(dose => {
      const atual = medicamentosMap.get(dose.itemId) || { nome: dose.nome, horarios: [], naoAdministrada: false };
      atual.horarios.push(dose.hora);
      if (dose.estado === 'nao-administrado') atual.naoAdministrada = true;
      medicamentosMap.set(dose.itemId, atual);
    });
    const itensMeds = [...medicamentosMap.values()].map(med => ({
      href: 'medicamentos.html',
      rotulo: med.nome,
      detalhe: `Horários: ${med.horarios.join(', ')}${med.naoAdministrada ? ' · Atenção' : ''}`,
      categoria: 'Medicamentos',
      icone: 'fa-solid fa-pills',
      busca: `${med.nome} medicamento remedio horario ${med.horarios.join(' ')}`
    }));

    const itensCompromissos = (core.obterCompromissos ? core.obterCompromissos(estado) : []).map(evt => ({
      href: `agenda.html?dia=${encodeURIComponent(evt.dia)}&compromisso=${encodeURIComponent(evt.id)}`,
      rotulo: evt.titulo,
      detalhe: `${core.formatarDataCurta ? core.formatarDataCurta(evt.dia) : evt.dia} · ${evt.hora.replace(':00', 'h')}${evt.local ? ` · ${evt.local}` : ''}`,
      categoria: 'Agenda',
      icone: 'fa-regular fa-calendar',
      busca: `${evt.titulo} agenda consulta exame ${evt.local || ''} ${evt.acompanhante || ''}`
    }));

    const itensDocs = (estado.documents || []).map(doc => ({
      href: `documentos.html?documento=${encodeURIComponent(doc.id)}`,
      rotulo: doc.titulo,
      detalhe: `${doc.categoria || 'Documento'}${doc.vinculo ? ` · ${doc.vinculo}` : ''}`,
      categoria: 'Documentos',
      icone: 'fa-regular fa-file-lines',
      busca: `${doc.titulo} ${doc.categoria || ''} documento receita exame ${doc.observacoes || ''}`
    }));

    const equipe = core.obterParticipantesRede(estado).map(pessoa => ({
      href: pessoa.ehUsuarioAtual ? 'meu-perfil.html' : 'pessoas.html',
      rotulo: pessoa.nome,
      detalhe: `${pessoa.papel} · ${pessoa.turno || 'Rede de cuidado'}`,
      categoria: 'Pessoas da rede',
      icone: 'fa-solid fa-user-group',
      busca: `${pessoa.nome} ${pessoa.papel} pessoa cuidador rede`
    }));

    const extras = [
      { href: 'medicamentos.html', rotulo: 'Medicamentos e rotina de doses', detalhe: 'Remédios, horários e porta-remédios', categoria: 'Ações rápidas', icone: 'fa-solid fa-pills', busca: 'remedio remedios medicamento medicamentos pilula comprimido dose doses horario horarios rotina tomar administracao atrasado porta remedios' },
      { href: 'medicamentos.html?estoque=1', rotulo: 'Materiais e o que tem em casa', detalhe: 'Materiais, remédios e reposição', categoria: 'Ações rápidas', icone: 'fa-solid fa-boxes-stacked', busca: 'insumo insumos fralda fraldas estoque reposicao repor acabando baixo unidade material materiais' },
      { href: 'direitos.html', rotulo: 'Direitos, benefícios e serviços', detalhe: 'SUS, BPC/LOAS, Farmácia Popular e CRAS', categoria: 'Páginas', icone: 'fa-solid fa-circle-info', busca: 'servico servicos direito direitos beneficio beneficios sus ubs farmacia popular bpc loas inss cras caps estatuto idoso transporte gratuidade auxilio lei guia' },
      { href: 'agenda.html', rotulo: 'Agenda e quem cuida em cada horário', detalhe: 'Escala semanal, consultas e exames', categoria: 'Ações rápidas', icone: 'fa-regular fa-calendar', busca: 'agenda turno turnos escala cobertura cobrir horario calendario compromisso consulta exame' },
      { href: 'ficha.html', rotulo: 'Ficha de saúde, alergias e diário', detalhe: `${estado.person.alergias ? estado.person.alergias + ' · Histórico de saúde' : 'Histórico de saúde e alergias'}`, categoria: 'Ações rápidas', icone: 'fa-regular fa-id-card', busca: `alergia alergias ficha saude historico cirurgia diario relato emergencia convenio imprimir resumo ${estado.person?.alergias || ''}` },
      { href: 'meu-perfil.html', rotulo: 'Cuidar de quem cuida e folgas', detalhe: 'Check-in emocional, horas e pedidos de folga', categoria: 'Ações rápidas', icone: 'fa-regular fa-heart', busca: 'cuidar folga descanso sobrecarga humor perfil recado' },
      { href: 'configuracoes.html', rotulo: 'Configurações, tema e acessibilidade', detalhe: 'Tema acolhedor, alto contraste e fonte', categoria: 'Páginas', icone: 'fa-solid fa-gear', busca: 'configuracao configuracoes tema acolhedor neutro contraste fonte acessibilidade som' },
      { href: 'ajuda.html', rotulo: 'Ajuda, dúvidas e suporte', detalhe: 'Perguntas frequentes e contato', categoria: 'Páginas', icone: 'fa-regular fa-circle-question', busca: 'ajuda suporte duvida duvidas orientacao contato' },
      { href: 'privacidade.html', rotulo: 'Privacidade e proteção de dados', detalhe: 'Uso dos dados e LGPD', categoria: 'Páginas', icone: 'fa-solid fa-shield-halved', busca: 'privacidade dados lgpd seguranca' }
    ];

    const insumosExtras = (estado.itensExtras || [])
      .filter(item => item.tipo === 'Insumo')
      .map(item => ({
        href: 'medicamentos.html?estoque=1',
        rotulo: item.nome,
        detalhe: 'Material · O que tem em casa',
        categoria: 'Medicamentos',
        icone: 'fa-solid fa-boxes-stacked',
        busca: `${item.nome} insumo estoque medicamento`
      }));

    return [...itensMeds, ...insumosExtras, ...itensCompromissos, ...itensDocs, ...equipe, ...extras, ...basePaginas];
  };

  const normalizar = texto => String(texto || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');

  const distanciaUm = (a, b) => {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0; let j = 0; let dif = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++dif > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
    return dif + (a.length - i) + (b.length - j) <= 1;
  };

  const palavraCasa = (palavra, tokensTexto, textoCompleto) => {
    if (textoCompleto.includes(palavra)) return 1;
    const sinonimos = SINONIMOS[palavra] || [];
    if (sinonimos.some(sin => textoCompleto.includes(sin))) return 0.8;
    if (palavra.length >= 4 && tokensTexto.some(tok => tok.length >= 4 && distanciaUm(palavra, tok))) return 0.6;
    return 0;
  };

  const destacarTexto = (texto, palavras) => {
    if (!palavras.length) return document.createTextNode(texto);
    const frag = document.createDocumentFragment();
    const norm = normalizar(texto);
    let idx = 0;
    const regex = new RegExp(palavras.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
    let match;
    while ((match = regex.exec(norm)) !== null) {
      if (match.index > idx) frag.append(document.createTextNode(texto.slice(idx, match.index)));
      const mark = document.createElement('mark');
      mark.textContent = texto.slice(match.index, match.index + match[0].length);
      frag.append(mark);
      idx = match.index + match[0].length;
    }
    if (idx < texto.length) frag.append(document.createTextNode(texto.slice(idx)));
    return frag;
  };

  function renderizarResultados() {
    const bruto = campo.value.trim();
    const termo = normalizar(bruto);
    const palavras = termo.split(/\s+/).filter(Boolean);
    container.classList.toggle('busca-topo--com-texto', Boolean(bruto));
    botaoLimpar.hidden = !bruto;

    const recentes = obterRecentes();
    if (!palavras.length && recentes.length) {
      recentesEl.hidden = false;
      recentesEl.replaceChildren();
      const rotulo = document.createElement('span');
      rotulo.className = 'busca-topo__recentes-rotulo';
      rotulo.textContent = 'Recentes:';
      recentesEl.append(rotulo);
      recentes.forEach(termoRecente => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'busca-topo__chip';
        chip.textContent = termoRecente;
        chip.addEventListener('click', () => {
          campo.value = termoRecente;
          renderizarResultados();
          campo.focus();
        });
        recentesEl.append(chip);
      });
    } else {
      recentesEl.hidden = true;
    }

    const todos = obterItensBusca();
    const pontuar = item => {
      const rotuloNorm = normalizar(item.rotulo);
      const detalheNorm = normalizar(item.detalhe);
      const buscaNorm = normalizar(item.busca);
      const tudo = `${rotuloNorm} ${detalheNorm} ${buscaNorm}`;
      const tokens = tudo.split(/[^a-z0-9]+/).filter(Boolean);
      let score = 0;
      for (const p of palavras) {
        const peso = palavraCasa(p, tokens, tudo);
        if (!peso) return 0;
        score += peso;
        if (rotuloNorm.includes(p)) score += 3;
        else if (detalheNorm.includes(p)) score += 1.5;
      }
      if (rotuloNorm.startsWith(termo)) score += 6;
      else if (rotuloNorm.includes(termo)) score += 4;
      return score;
    };

    const correspondencias = (palavras.length
      ? todos
        .map(item => ({ item, score: pontuar(item) }))
        .filter(entrada => entrada.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(entrada => entrada.item)
      : todos.filter(item => item.categoria === 'Ações rápidas' || item.categoria === 'Medicamentos').slice(0, 6)
    ).slice(0, 10);

    const elementos = [];
    let categoriaAtual = '';
    correspondencias.forEach(item => {
      if (palavras.length && item.categoria !== categoriaAtual) {
        categoriaAtual = item.categoria;
        const grupo = document.createElement('li');
        grupo.className = 'busca-topo__grupo';
        grupo.setAttribute('role', 'presentation');
        grupo.textContent = categoriaAtual;
        elementos.push(grupo);
      }
      const itemLista = document.createElement('li');
      const resultado = document.createElement('a');
      resultado.href = item.href;

      const iconeWrap = document.createElement('span');
      iconeWrap.className = 'busca-topo__item-icone';
      iconeWrap.setAttribute('aria-hidden', 'true');
      iconeWrap.innerHTML = `<i class="${item.icone || 'fa-regular fa-file'}"></i>`;

      const textoWrap = document.createElement('span');
      textoWrap.className = 'busca-topo__item-texto';
      const tituloEl = document.createElement('strong');
      tituloEl.append(destacarTexto(item.rotulo, palavras));
      const detalheEl = document.createElement('small');
      detalheEl.textContent = item.detalhe;
      textoWrap.append(tituloEl, detalheEl);

      resultado.append(iconeWrap, textoWrap);
      resultado.addEventListener('click', () => {
        if (bruto) salvarRecente(bruto);
        definirBuscaAberta(false);
      });
      itemLista.append(resultado);
      elementos.push(itemLista);
    });

    lista.replaceChildren(...elementos);
    lista.querySelectorAll('a').forEach(link => { link.tabIndex = -1; });

    status.textContent = palavras.length
      ? (correspondencias.length
        ? `${correspondencias.length} ${correspondencias.length === 1 ? 'resultado inteligente' : 'resultados inteligentes'}`
        : 'Nenhum resultado encontrado. Tente outro termo, sinônimo ou nome.')
      : 'Sugestões rápidas para você';
  }

  function definirBuscaAberta(aberta) {
    container.classList.toggle('busca-topo--aberta', aberta);
    gatilhoBuscaTopo.setAttribute('aria-expanded', String(aberta));
    painel.hidden = !aberta;
    if (aberta) {
      for (const outro of document.querySelectorAll('.barra-topo details[open]')) outro.open = false;
      renderizarResultados();
      requestAnimationFrame(() => campo.focus());
    } else {
      campo.value = '';
      container.classList.remove('busca-topo--com-texto');
      botaoLimpar.hidden = true;
    }
  }

  gatilhoBuscaTopo.addEventListener('click', () => {
    const aberta = !container.classList.contains('busca-topo--aberta');
    definirBuscaAberta(aberta);
  });

  campo.addEventListener('focus', () => {
    if (!container.classList.contains('busca-topo--aberta')) definirBuscaAberta(true);
  });

  botaoLimpar.addEventListener('click', () => {
    campo.value = '';
    renderizarResultados();
    campo.focus();
  });

  campo.addEventListener('input', renderizarResultados);

  campo.addEventListener('keydown', evento => {
    if (evento.key === 'ArrowDown') {
      const primeiro = lista.querySelector('a');
      if (primeiro) {
        evento.preventDefault();
        primeiro.focus();
      }
    } else if (evento.key === 'Enter' && campo.value.trim()) {
      const primeiro = lista.querySelector('a');
      if (primeiro) {
        evento.preventDefault();
        primeiro.click();
      }
    }
  });

  lista.addEventListener('keydown', evento => {
    const links = [...lista.querySelectorAll('a')];
    const atual = links.indexOf(document.activeElement);
    if (atual === -1) return;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      links[(atual + 1) % links.length]?.focus();
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (atual === 0) campo.focus();
      else links[atual - 1]?.focus();
    }
  });

  container.addEventListener('focusout', evento => {
    if (evento.relatedTarget && !container.contains(evento.relatedTarget) && container.classList.contains('busca-topo--aberta')) {
      definirBuscaAberta(false);
    }
  });

  document.addEventListener('click', evento => {
    if (container.classList.contains('busca-topo--aberta') && !container.contains(evento.target)) {
      definirBuscaAberta(false);
    }
  });

  document.addEventListener('keydown', evento => {
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
      evento.preventDefault();
      definirBuscaAberta(true);
      return;
    }
    if (evento.key === 'Escape' && container.classList.contains('busca-topo--aberta')) {
      if (campo.value) {
        campo.value = '';
        renderizarResultados();
        campo.focus();
        return;
      }
      definirBuscaAberta(false);
      gatilhoBuscaTopo.focus();
    }
  });
}

inicializarBuscaTopo();
definirMenu(telaMobile.matches ? false : obterEstadoInicialMenuDesktop());
atualizarPaginaAtual();

const barraTopo = document.querySelector('.barra-topo');
if (barraTopo && 'ResizeObserver' in window) {
  const sincronizarAlturaBarraTopo = () => {
    document.documentElement.style.setProperty('--topbar-altura-atual', `${barraTopo.offsetHeight}px`);
  };
  new ResizeObserver(sincronizarAlturaBarraTopo).observe(barraTopo);
  sincronizarAlturaBarraTopo();
}

if (!document.querySelector('ponto-bot')) {
  const app = new URL('./', document.baseURI);
  const script = document.createElement('script');
  script.type = 'module';
  script.src = new URL('assets/pontobot/pontobot.js', app).href;
  const bot = document.createElement('ponto-bot');
  bot.dataset.app = app.href;
  document.head.append(script);
  document.body.append(bot);
}

function renderizarSeletorPessoas() {
  const core = window.MutiraoCuidado;
  if (!core?.obterPerfisAcompanhados) return;
  const perfis = core.obterPerfisAcompanhados();
  document.querySelectorAll('.seletor-pessoa').forEach(seletor => {
    const painel = seletor.querySelector('.painel-flutuante');
    if (!painel) return;
    painel.innerHTML = `
      <div class="seletor-pessoa__lista" role="group" aria-label="Pessoas acompanhadas">
        ${perfis.map(p => `
          <button type="button" class="seletor-pessoa__opcao${p.ativo ? ' seletor-pessoa__opcao--ativo' : ''}" data-selecionar-perfil="${core.escaparHtml(p.id)}" aria-current="${p.ativo}">
            <span>
              <strong>${core.escaparHtml(p.nomeCompleto)}</strong>
              <small>Admin: ${core.escaparHtml(p.administrador)}</small>
            </span>
            ${p.ativo ? '<i class="fa-solid fa-check" aria-hidden="true"></i>' : ''}
          </button>
        `).join('')}
      </div>
    `;
  });
}

document.addEventListener('click', evento => {
  const botao = evento.target.closest('[data-selecionar-perfil]');
  if (!botao) return;
  const core = window.MutiraoCuidado;
  if (!core) return;
  try {
    if (!core.selecionarPerfilAcompanhado(botao.dataset.selecionarPerfil)) {
      const seletor = botao.closest('details');
      seletor.open = false;
      seletor.querySelector('summary')?.focus();
      return;
    }
  } catch {
    const seletor = botao.closest('details');
    seletor.open = false;
    document.getElementById('erro-persistencia-mutirao')?.focus();
    return;
  }

  // O contexto de um compromisso, documento ou dose pertence à ficha anterior.
  const destino = new URL(location.href);
  for (const chave of ['compromisso', 'documento', 'dose']) destino.searchParams.delete(chave);
  if (destino.href === location.href) location.reload();
  else location.replace(destino.href);
});

function renderizarAvisosDaRotina(core) {
  const estado = core.obterEstado();
  const nome = core.nomePessoaAcompanhada(estado);
  const avisos = [];
  const lacunas = core.obterLacunasDia(core.HOJE, estado);
  if (lacunas.length) {
    avisos.push({
      alerta: true,
      href: 'agenda.html',
      titulo: 'Horário sem ninguém',
      texto: `${nome} · Hoje, das ${lacunas[0].horario}.`
    });
  }
  const dosesPrevistas = core.obterDoses(estado).filter(d => d.estado === 'prevista' && d.momento !== 'passado');
  if (dosesPrevistas.length) {
    const proxima = dosesPrevistas[0];
    avisos.push({
      alerta: false,
      href: 'medicamentos.html',
      titulo: 'Próximo remédio',
      texto: `${nome} · ${proxima.nome} às ${proxima.hora}.`
    });
  }
  const relatorioHoje = (estado.reports?.[core.HOJE] || [])[0];
  if (relatorioHoje?.[4]) {
    avisos.push({
      alerta: false,
      href: 'ficha.html#diario',
      titulo: 'Recado do turno',
      texto: `${nome} · ${relatorioHoje[4]}`
    });
  }

  listaNotificacoes.innerHTML = avisos.map(a => `
      <li class="notificacao${a.alerta ? ' notificacao--alerta' : ''}">
        <a class="notificacao__link" href="${a.href}">
          <div>
            <h3>${core.escaparHtml(a.titulo)}</h3>
            <p>${core.escaparHtml(a.texto)}</p>
          </div>
          <i class="fa-solid fa-chevron-right notificacao__seta" aria-hidden="true"></i>
        </a>
      </li>
  `).join('');
}

function sincronizarPerfilGlobal() {
  const core = window.MutiraoCuidado;
  if (!core) return;
  const pessoa = core.obterEstado().person;
  const nome = core.nomePessoaAcompanhada();
  document.querySelectorAll('.seletor-pessoa > summary, #titulo-pessoa, [data-identidade-acompanhada]').forEach(item => {
    item.textContent = nome;
  });
  document.querySelectorAll('[data-avatar-acompanhada]').forEach(img => {
    window.MutiraoFotos.aplicarAvatar(img, pessoa.fotoMiniatura || pessoa.foto,
      pessoa.mascote || 'assets/media/mascotes/icone-mascote-forma.svg');
  });
  document.querySelectorAll('[data-cobertura-acompanhada]').forEach(item => {
    item.textContent = 'Necessidade de acompanhamento: ' + core.obterDescricaoAcompanhamento().toLocaleLowerCase('pt-BR');
  });
  renderizarSeletorPessoas();
  renderizarNotificacoes();

  const usuario = core.obterUsuarioAtual();
  document.querySelectorAll('[data-usuario-rede-selo]').forEach(item => {
    item.textContent = [usuario.nome, usuario.vinculo].filter(Boolean).join(' · ');
  });
  document.querySelectorAll('.menu-perfil summary img, .barra-lateral__perfil-mobile img').forEach(img => {
    window.MutiraoFotos.aplicarAvatar(img, usuario.foto, usuario.mascote);
  });
  const topo = document.querySelector('.menu-perfil summary');
  if (topo) {
    topo.querySelector('strong').textContent = [usuario.nome, usuario.vinculo].filter(Boolean).join(' · ');
    topo.querySelector('small').textContent = usuario.papel;
    topo.setAttribute('aria-label', `Menu do perfil de ${usuario.nome}`);
  }
  const mobile = document.querySelector('.barra-lateral__perfil-mobile');
  if (mobile) {
    mobile.querySelector('strong').textContent = usuario.nome;
    mobile.querySelector('small').textContent = `${usuario.papel} · Meu perfil`;
  }
}

window.addEventListener('mutirao:cuidado-pronto', sincronizarPerfilGlobal);
window.addEventListener('mutirao:cuidado-atualizado', sincronizarPerfilGlobal);

function sincronizarStatusCuidado() {
  const core = window.MutiraoCuidado;
  if (!core) return;
  const linhaTurno = document.querySelector('[data-status-turno]');
  if (linhaTurno) {
    const turno = core.obterTurnoAtual();
    const lacunaAtual = !turno && core.obterLacunaAtual();
    const img = linhaTurno.querySelector('img');
    const detalheTurno = linhaTurno.querySelector('small');
    img.hidden = !turno;
    if (turno) window.MutiraoFotos.aplicarAvatar(img, turno.pessoa.foto,
      `assets/media/mascotes/${turno.pessoa.avatar || "icone-mascote-forma.svg"}`);
    linhaTurno.querySelector('strong').textContent = turno?.pessoa.nome || (lacunaAtual ? 'Horário sem ninguém' : 'Sem turno agora');
    detalheTurno.textContent = turno?.horario || (lacunaAtual ? 'Veja na Agenda' : '');
    detalheTurno.hidden = !detalheTurno.textContent;
  }
  const linha = document.querySelector('.cartao-status [data-status-medicamento]');
  const cartao = linha?.closest('.cartao-status');
  if (!core || !linha || !cartao) return;

  cartao.querySelectorAll('[data-status-medicamento-extra]').forEach(el => el.remove());

  const doses = core.obterDoses();
  const ocorrencias = doses.filter(dose => dose.estado === 'nao-administrado');
  const atrasadas = doses.filter(dose => dose.estado === 'prevista' && dose.momento === 'passado');
  const proxima = doses.find(dose => dose.estado === 'prevista' && dose.momento !== 'passado');
  const grupoProximo = proxima
    ? doses.filter(dose => dose.hora === proxima.hora && dose.estado === 'prevista')
    : [];
  const ehAlerta = Boolean(ocorrencias.length || atrasadas.length);
  const detalheMed = linha.querySelector('small');

  linha.classList.toggle('cartao-status__linha--alerta', ehAlerta);
  if (!doses.length) {
    linha.querySelector('strong').textContent = 'Nenhum remédio';
    detalheMed.textContent = '';
  } else if (ocorrencias.length) {
    linha.querySelector('strong').textContent = `${ocorrencias.length} ${ocorrencias.length === 1 ? 'remédio para dar' : 'remédios para dar'}`;
    detalheMed.textContent = 'Não foi dado';
  } else if (atrasadas.length) {
    linha.querySelector('strong').textContent = `${atrasadas.length} ${atrasadas.length === 1 ? 'remédio atrasado' : 'remédios atrasados'}`;
    detalheMed.textContent = `Previsto para ${atrasadas[0].hora}`;
  } else if (grupoProximo.length) {
    linha.querySelector('strong').textContent = 'Tem remédio para dar';
    detalheMed.textContent = `Próximo horário às ${proxima.hora.padStart(3, '0')}`;
  } else {
    linha.querySelector('strong').textContent = 'Nenhum remédio para mais tarde';
    detalheMed.textContent = 'Veja o que já foi anotado hoje';
  }
  detalheMed.hidden = !detalheMed.textContent;
}

window.addEventListener('mutirao:cuidado-pronto', sincronizarStatusCuidado);
window.addEventListener('mutirao:cuidado-atualizado', sincronizarStatusCuidado);

(() => {
  const resumirEstado = estado => ({
    perfilAtivoId: estado.perfilAtivoId,
    registrosDose: JSON.stringify(estado?.registrosDose || {}),
    estoque: JSON.stringify([estado?.estoqueBase || {}, estado?.historicoEstoque || []]),
    itens: JSON.stringify([estado?.itensExtras || [], estado?.itensEditados || {}, estado?.itensExcluidos || []]),
    turnos: JSON.stringify([
      estado?.covered || {},
      estado?.shiftEdits || {},
      estado?.coberturasRede || [],
      estado?.atribuicoesTurno || {},
      estado?.rotinasSemanais || [],
      estado?.janelaAcompanhamento || null
    ]),
    events: JSON.stringify(estado?.events || []),
    reports: JSON.stringify(estado?.reports || {}),
    documents: JSON.stringify(estado?.documents || []),
    convites: JSON.stringify(estado?.convites || []),
    perfil: JSON.stringify(estado?.perfilUsuario || {}),
    person: JSON.stringify(estado?.person || {})
  });

  let anterior = null;
  const inicializar = () => {
    const core = window.MutiraoCuidado;
    if (core && !anterior) anterior = resumirEstado(core.obterEstado());
  };

  window.addEventListener('mutirao:cuidado-pronto', inicializar);
  window.addEventListener('mutirao:cuidado-atualizado', () => {
    const core = window.MutiraoCuidado;
    if (!core) return;
    const estadoAtualObj = core.obterEstado();
    const atual = resumirEstado(estadoAtualObj);
    if (!anterior || anterior.perfilAtivoId !== atual.perfilAtivoId) {
      anterior = atual;
      return;
    }
    const usuario = core.obterUsuarioAtual ? core.obterUsuarioAtual() : { nome: 'Zé da Silva' };
    const primeiroNome = String(usuario.nome || 'Zé').trim().split(/\s+/)[0] || 'Zé';

    const descreverMudancaDose = () => {
      try {
        const regAnt = JSON.parse(anterior.registrosDose);
        const regAtual = estadoAtualObj.registrosDose || {};
        const todasChaves = new Set([...Object.keys(regAnt), ...Object.keys(regAtual)]);
        for (const chaveDose of todasChaves) {
          if (JSON.stringify(regAnt[chaveDose]) !== JSON.stringify(regAtual[chaveDose])) {
            const [hora, id] = chaveDose.split('|');
            const nomeMed = estadoAtualObj.itensEditados?.[id]?.nome
              || estadoAtualObj.itensExtras?.find(item => (item.chave || item.nome) === id)?.nome
              || id;
            const novo = regAtual[chaveDose];
            if (novo?.estado === 'administrado') {
              return ['Remédio dado', `${primeiroNome} registrou ${nomeMed} (${hora}).`, 'medicamentos.html'];
            }
            if (novo?.estado === 'nao-administrado') {
              return ['Remédio não dado', `${primeiroNome} marcou ${nomeMed} (${hora}) como não dado.`, 'medicamentos.html'];
            }
            return ['Medicação reaberta', `${primeiroNome} desfez a anotação de ${nomeMed} (${hora}).`, 'medicamentos.html'];
          }
        }
      } catch {
        // Usa texto genérico se não for possível comparar as chaves.
      }
      const apelido = estadoAtualObj?.person?.apelido || estadoAtualObj?.person?.nome || 'quem recebe cuidado';
      return ['Medicação atualizada', `${primeiroNome} atualizou uma medicação de ${apelido}.`, 'medicamentos.html'];
    };

    if (atual.registrosDose !== anterior.registrosDose) {
      if (preferenciaAtiva('notificacoesMedicacao', true)) {
        const [titulo, descricao, destino] = descreverMudancaDose();
        window.MutiraoNotificacoes.registrar(titulo, descricao, destino, usuario.avatar);
      }
    }

    const apelidoPessoa = estadoAtualObj?.person?.apelido || estadoAtualObj?.person?.nome || 'quem recebe cuidado';
    const ultimoEstoque = estadoAtualObj.historicoEstoque?.[0]?.item;
    const permitirMedicacao = preferenciaAtiva('notificacoesMedicacao', true);
    const permitirRelatos = preferenciaAtiva('notificacoesRelatos', true);
    const regras = [
      ['estoque', 'Estoque atualizado', ultimoEstoque ? `${primeiroNome} atualizou o estoque de ${ultimoEstoque}.` : `${primeiroNome} atualizou o estoque de itens.`, 'medicamentos.html', permitirMedicacao],
      ['itens', 'Itens atualizados', `${primeiroNome} atualizou a lista de medicamentos.`, 'medicamentos.html', permitirMedicacao],
      ['turnos', 'Turno atualizado', `${primeiroNome} mudou quem cuida num horário.`, 'agenda.html', permitirRelatos],
      ['events', 'Agenda atualizada', `${primeiroNome} atualizou um compromisso na agenda.`, 'agenda.html', permitirRelatos],
      ['reports', 'Novo relato no diário', `${primeiroNome} escreveu no diário.`, 'ficha.html#diario', permitirRelatos],
      ['documents', 'Documentos atualizados', `${primeiroNome} atualizou os documentos de ${apelidoPessoa}.`, 'documentos.html', true],
      ['convites', 'Rede atualizada', `${primeiroNome} atualizou os participantes da rede.`, 'pessoas.html', true],
      ['perfil', 'Perfil atualizado', `${primeiroNome} atualizou os dados do perfil.`, 'meu-perfil.html', true],
      ['person', 'Ficha atualizada', `${primeiroNome} atualizou a ficha de ${apelidoPessoa}.`, 'ficha.html', true]
    ];
    for (const [chave, titulo, descricao, destino, ativo] of regras) {
      if (ativo && atual[chave] !== anterior[chave]) {
        window.MutiraoNotificacoes.registrar(titulo, descricao, destino, usuario.avatar);
      }
    }
    renderizarNotificacoes();
    anterior = atual;
  });
})();
