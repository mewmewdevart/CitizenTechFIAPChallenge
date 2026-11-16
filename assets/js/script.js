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

for (const menuSuspenso of document.querySelectorAll('.barra-topo details')) {
  menuSuspenso.addEventListener('toggle', () => {
    if (!menuSuspenso.open) return;
    if (menuSuspenso.classList.contains('menu-notificacoes')) {
      menuSuspenso.querySelector('.botao-icone--notificacao')?.removeAttribute('data-nova-notificacao');
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
    <h2 id="titulo-sair-conta">Sair da sua conta?</h2>
    <p>Você será redirecionado para a tela inicial do Mutirão nesta sessão.</p>
    <div class="dialogo-mvp__acoes">
      <button type="button" class="botao botao--secundario" data-cancelar-saida>Cancelar</button>
      <button type="button" class="botao botao--perigo" data-confirmar-saida>Sair da conta</button>
    </div>
  `;
  dialogo.addEventListener('click', evento => {
    if (evento.target === dialogo) dialogo.close();
  });
  dialogo.querySelector('[data-cancelar-saida]')?.addEventListener('click', () => dialogo.close());
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

const campoBusca = document.querySelector('#campo-busca');
const listaResultados = document.querySelector('#resultados-busca');
const statusBusca = document.querySelector('#status-busca');
const itensPesquisaveis = [
  ...linksMenu.map(link => ({ href: link.getAttribute('href'), rotulo: link.textContent.trim() })),
  { href: 'meu-perfil.html', rotulo: 'Meu perfil' },
  { href: 'configuracoes.html', rotulo: 'Configurações' },
  { href: 'privacidade.html', rotulo: 'Política de Privacidade e Termos' },
  { href: 'ficha.html', rotulo: 'Ficha da pessoa acompanhada · Maria das Dores (Mari)' }
].filter((item, indice, lista) => item.href && lista.findIndex(entrada => entrada.href === item.href) === indice);

function renderizarResultados() {
  if (!campoBusca || !listaResultados || !statusBusca) return;
  const termo = campoBusca.value.trim().toLocaleLowerCase('pt-BR');
  const correspondencias = itensPesquisaveis.filter(item => item.rotulo.toLocaleLowerCase('pt-BR').includes(termo));

  listaResultados.replaceChildren(...correspondencias.map(item => {
    const itemLista = document.createElement('li');
    const resultado = document.createElement('a');
    resultado.href = item.href;
    resultado.textContent = item.rotulo;
    resultado.addEventListener('click', () => campoBusca.closest('dialog')?.close());
    itemLista.append(resultado);
    return itemLista;
  }));

  statusBusca.textContent = correspondencias.length
    ? `${correspondencias.length} ${correspondencias.length === 1 ? 'item encontrado' : 'itens encontrados'}.`
    : 'Nenhum item encontrado.';
}

campoBusca?.addEventListener('input', renderizarResultados);
renderizarResultados();
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
