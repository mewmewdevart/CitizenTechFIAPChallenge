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

for (const botao of document.querySelectorAll('[data-tema]')) {
  botao.addEventListener('click', () => definirTema(botao.dataset.tema));
}

window.addEventListener('storage', evento => {
  if (evento.key === CHAVE_TEMA) aplicarTema(obterTemaSalvo());
});

const alternarMenu = document.querySelector('#alternar-menu');
const telaMobile = window.matchMedia('(width < 1024px)');
const botaoMais = document.querySelector('#botao-mais');
const linksMenu = [...document.querySelectorAll('#barra-lateral nav a')];
const atalhosInferiores = [...document.querySelectorAll('.barra-inferior a')];
const perfilMobile = document.querySelector('.barra-lateral__perfil-mobile');
const CHAVE_MENU_STORAGE = 'mutirao-menu-aberto';
let gatilhoMenu = alternarMenu;

function obterNomePagina(href) {
  return new URL(href, location.href).pathname.split('/').pop() || 'index.html';
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
  const paginaAtual = location.pathname.split('/').pop() || 'index.html';
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

function renderizarNotificacoes() {
  if (!listaNotificacoes || !gatilhoNotificacoes) return;
  listaNotificacoes.querySelectorAll('[data-notificacao-local]').forEach(item => item.remove());
  listaNotificacoes.prepend(...notificacoesLocais.map(({ titulo, descricao, destino }) => {
    const item = document.createElement('li');
    item.className = 'notificacao';
    item.dataset.notificacaoLocal = '';
    const link = document.createElement('a');
    link.className = 'notificacao__link';
    link.href = destino === 'configuracoes.html' ? destino : 'ajuda.html#formulario-ajuda';
    const bloco = document.createElement('div');
    const nome = document.createElement('h3');
    const texto = document.createElement('p');
    nome.textContent = titulo;
    texto.textContent = descricao;
    bloco.append(nome, texto);
    link.append(bloco);
    item.append(link);
    return item;
  }));

  const novas = notificacoesLocais.filter(item => !item.lida).length;
  const total = listaNotificacoes.children.length;
  gatilhoNotificacoes.setAttribute('aria-label', 'Notificações (' + total + ' itens' + (novas ? ', ' + novas + ' novas' : '') + ')');
  gatilhoNotificacoes.toggleAttribute('data-nova-notificacao', novas > 0);
}

window.MutiraoNotificacoes = {
  registrar(titulo, descricao, destino) {
    notificacoesLocais.unshift({ titulo, descricao, destino, lida: false });
    notificacoesLocais = notificacoesLocais.slice(0, 12);
    salvarNotificacoes();
    renderizarNotificacoes();
  }
};

renderizarNotificacoes();

for (const menuSuspenso of document.querySelectorAll('.barra-topo details')) {
  menuSuspenso.addEventListener('toggle', () => {
    if (!menuSuspenso.open) return;
    if (menuSuspenso.classList.contains('menu-notificacoes')) {
      notificacoesLocais.forEach(item => { item.lida = true; });
      salvarNotificacoes();
      renderizarNotificacoes();
    }
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

const criarDialogoSair = () => {
  let dialogo = document.querySelector('#dialogo-sair-conta');
  if (dialogo) return dialogo;

  dialogo = document.createElement('dialog');
  dialogo.id = 'dialogo-sair-conta';
  dialogo.className = 'dialogo-mvp';
  dialogo.setAttribute('aria-labelledby', 'titulo-sair-conta');
  dialogo.innerHTML = `
    <div class="dialogo-mvp__cabecalho">
      <h2 id="titulo-sair-conta">Voltar ao Início?</h2>
      <button type="button" class="botao-icone" data-cancelar-saida aria-label="Fechar">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
    </div>
    <p>As alterações da demonstração continuam disponíveis nesta aba.</p>
    <div class="dialogo-mvp__acoes">
      <button type="button" class="botao botao--secundario" data-cancelar-saida>Cancelar</button>
      <button type="button" class="botao botao--perigo" data-confirmar-saida>Voltar ao Início</button>
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
    location.href = 'index.html';
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
  { href: 'privacidade.html', rotulo: 'Política de Privacidade e Termos' },
  { href: 'ficha.html', rotulo: 'Ficha da pessoa acompanhada · Maria das Dores (Mari)' }
].filter((item, indice, lista) => item.href && lista.findIndex(entrada => entrada.href === item.href) === indice);

const gatilhoBuscaTopo = document.querySelector('.barra-topo [data-dialogo="dialogo-busca"]');

function inicializarBuscaTopo() {
  if (!gatilhoBuscaTopo) return;

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
  campo.placeholder = 'Ex.: Agenda ou Documentos';
  campo.setAttribute('aria-label', 'Buscar uma página');
  campo.setAttribute('autocomplete', 'off');

  const painel = document.createElement('div');
  painel.id = 'busca-topo-painel';
  painel.className = 'busca-topo__painel';
  painel.hidden = true;

  const status = document.createElement('p');
  status.className = 'busca-topo__status';
  status.setAttribute('role', 'status');

  const lista = document.createElement('ul');
  lista.id = 'resultados-busca-topo';
  lista.className = 'busca-topo__lista';

  painel.append(status, lista);
  gatilhoBuscaTopo.replaceWith(container);
  container.append(gatilhoBuscaTopo, campo, painel);

  function renderizarResultados() {
    const normalizar = texto => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
    const termo = normalizar(campo.value.trim());
    const correspondencias = itensPesquisaveis.filter(item => normalizar(item.rotulo).includes(termo));

    lista.replaceChildren(...correspondencias.map(item => {
      const itemLista = document.createElement('li');
      const resultado = document.createElement('a');
      resultado.href = item.href;
      resultado.textContent = item.rotulo;
      resultado.addEventListener('click', () => definirBuscaAberta(false));
      itemLista.append(resultado);
      return itemLista;
    }));

    status.textContent = correspondencias.length
      ? `${correspondencias.length} ${correspondencias.length === 1 ? 'item encontrado' : 'itens encontrados'}.`
      : 'Nenhuma página encontrada. Tente outro nome ou use o menu.';
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
    }
  }

  gatilhoBuscaTopo.addEventListener('click', () => {
    const aberta = !container.classList.contains('busca-topo--aberta');
    definirBuscaAberta(aberta);
  });

  campo.addEventListener('input', renderizarResultados);

  document.addEventListener('click', evento => {
    if (container.classList.contains('busca-topo--aberta') && !container.contains(evento.target)) {
      definirBuscaAberta(false);
    }
  });

  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && container.classList.contains('busca-topo--aberta')) {
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

function inicializarPontoBot() {
  const pontoBotSrc = 'https://mutirao-pontobot-frontend.vercel.app/pontobot.js';
  if (!document.querySelector(`script[src="${pontoBotSrc}"]`)) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = pontoBotSrc;
    document.head.append(script);
  }
  if (!document.querySelector('ponto-bot') && document.body) {
    const bot = document.createElement('ponto-bot');
    bot.dataset.app = 'https://mutirao-citizen-tech.vercel.app/';
    document.body.append(bot);
  }
}

inicializarPontoBot();

function sincronizarPerfilGlobal() {
  try {
    const bruto = sessionStorage.getItem('mutirao-mvp-estado-v1') || localStorage.getItem('mutirao-mvp-estado-v1');
    if (!bruto) return;
    const estado = JSON.parse(bruto);
    const pessoa = estado?.person;
    if (pessoa?.nome) {
      const nome = pessoa.apelido ? `${pessoa.nome} (${pessoa.apelido})` : pessoa.nome;
      document.querySelectorAll('.seletor-pessoa > summary, #titulo-pessoa, [data-identidade-acompanhada]').forEach(item => {
        item.textContent = nome;
      });
    }
    const perfil = estado?.perfilUsuario;
    if (!perfil) return;

    const avatar = perfil.foto || perfil.mascote;
    if (avatar) {
      document.querySelectorAll('.menu-perfil summary img, .barra-lateral__perfil-mobile img').forEach(img => {
        img.src = avatar;
      });
    }

    const nomeExibido = (perfil.nome || '').trim();
    const vinculo = (perfil.vinculo || 'Neto').trim();
    const papel = (perfil.papel || 'Administrador').trim();
    if (nomeExibido) {
      const resumoTopo = document.querySelector('.menu-perfil summary');
      const nomeTopo = resumoTopo?.querySelector('strong');
      const papelTopo = resumoTopo?.querySelector('small');
      if (nomeTopo) nomeTopo.textContent = vinculo ? `${nomeExibido} · ${vinculo}` : nomeExibido;
      if (papelTopo) papelTopo.textContent = papel;
      if (resumoTopo) resumoTopo.setAttribute('aria-label', `Menu do perfil de ${nomeExibido}`);
      const perfilMobile = document.querySelector('.barra-lateral__perfil-mobile');
      const nomeMobile = perfilMobile?.querySelector('strong');
      const papelMobile = perfilMobile?.querySelector('small');
      if (nomeMobile) nomeMobile.textContent = nomeExibido;
      if (papelMobile) papelMobile.textContent = `${papel} · Meu perfil`;
    }
  } catch {
    // Ignora estado ausente ou inválido
  }
}

sincronizarPerfilGlobal();
window.addEventListener('mutirao:perfil-atualizado', sincronizarPerfilGlobal);
window.addEventListener('mutirao:pessoa-atualizada', sincronizarPerfilGlobal);
window.addEventListener('storage', evento => {
  if (evento.key === 'mutirao-mvp-estado-v1') sincronizarPerfilGlobal();
});

function sincronizarStatusMedicamentos() {
  const core = window.MutiraoCuidado;
  const linha = document.querySelector('.cartao-status [data-status-medicamento]');
  if (!core || !linha) return;
  const doses = core.obterDoses();
  const ocorrencia = doses.find(dose => dose.estado === 'nao-administrado');
  const proxima = doses.find(dose => dose.estado === 'prevista' && dose.momento !== 'passado');
  const destaque = ocorrencia || proxima;
  linha.classList.toggle('cartao-status__linha--alerta', Boolean(ocorrencia));
  linha.querySelector('strong').textContent = destaque
    ? `${destaque.hora.padStart(3, '0')} · ${destaque.nome}` : 'Nenhuma dose futura';
  linha.querySelector('small').textContent = ocorrencia ? 'Não administrada'
    : proxima ? 'Prevista' : 'Veja os registros de hoje';
}

document.addEventListener('DOMContentLoaded', sincronizarStatusMedicamentos);
window.addEventListener('mutirao:cuidado-atualizado', sincronizarStatusMedicamentos);
