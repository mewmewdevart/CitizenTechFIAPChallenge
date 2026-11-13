const toggle = document.querySelector('#toggle');
const mobile = window.matchMedia('(width < 1024px)');
const more = document.querySelector('#more');
const links = [...document.querySelectorAll('#sidebar nav a')];
const shortcuts = [...document.querySelectorAll('.bottom-nav a')];
const moreProfile = document.querySelector('.more-profile');
const MENU_STORAGE_KEY = 'mutirao-menu-open';
let menuTrigger = toggle;

function getPageName(href) {
  return new URL(href, location.href).pathname.split('/').pop() || 'index.html';
}

function getInitialDesktopMenuState() {
  try {
    const saved = sessionStorage.getItem(MENU_STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

function setMenu(open, persist = false) {
  document.body.classList.toggle('menu-closed', !open);
  toggle?.setAttribute('aria-expanded', String(open));
  more?.setAttribute('aria-expanded', String(open && mobile.matches));

  if (persist && !mobile.matches) {
    try {
      sessionStorage.setItem(MENU_STORAGE_KEY, String(open));
    } catch {
      // Ignora erro caso o navegador bloqueie storage local
    }
  }
}

function updateCurrent() {
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  for (const link of [...links, ...shortcuts]) {
    if (getPageName(link.href) === currentPage) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const inSidebar = currentPage === 'meu-perfil.html' || links.some(link => getPageName(link.href) === currentPage);
  const inShortcuts = shortcuts.some(link => getPageName(link.href) === currentPage);
  more?.classList.toggle('active', inSidebar && !inShortcuts);
}

for (const button of [toggle, more].filter(Boolean)) {
  button.addEventListener('click', () => {
    menuTrigger = button;
    const open = toggle?.getAttribute('aria-expanded') !== 'true';
    setMenu(open, true);
    if (open && mobile.matches) moreProfile?.focus();
  });
}

mobile.addEventListener('change', () => {
  setMenu(mobile.matches ? false : getInitialDesktopMenuState());
});

for (const link of [...links, ...shortcuts, moreProfile].filter(Boolean)) {
  link.addEventListener('click', () => {
    if (mobile.matches) {
      setMenu(false);
      (shortcuts.includes(link) ? link : menuTrigger)?.focus();
    }
  });
}

for (const dropdown of document.querySelectorAll('.topbar details')) {
  dropdown.addEventListener('toggle', () => {
    if (!dropdown.open) return;
    for (const other of document.querySelectorAll('.topbar details[open]')) {
      if (other !== dropdown) other.open = false;
    }
  });
}

document.addEventListener('click', event => {
  for (const dropdown of document.querySelectorAll('.topbar details[open]')) {
    if (!dropdown.contains(event.target) || event.target.closest('a')) dropdown.open = false;
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  const dropdown = document.querySelector('.topbar details[open]');
  if (dropdown) {
    dropdown.open = false;
    dropdown.querySelector('summary')?.focus();
  } else if (mobile.matches && toggle?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuTrigger?.focus();
  }
});

for (const button of document.querySelectorAll('[data-dialog]')) {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.dialog)?.showModal();
  });
}

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
}

const query = document.querySelector('#search-query');
const results = document.querySelector('#results');
const searchStatus = document.querySelector('#search-status');
const searchableItems = [
  ...links.map(link => ({ href: link.getAttribute('href'), label: link.textContent.trim() })),
  { href: 'meu-perfil.html', label: 'Meu perfil' }
].filter((item, index, list) => item.href && list.findIndex(entry => entry.href === item.href) === index);

function renderResults() {
  if (!query || !results || !searchStatus) return;
  const term = query.value.trim().toLocaleLowerCase('pt-BR');
  const matches = searchableItems.filter(item => item.label.toLocaleLowerCase('pt-BR').includes(term));

  results.replaceChildren(...matches.map(item => {
    const listItem = document.createElement('li');
    const result = document.createElement('a');
    result.href = item.href;
    result.textContent = item.label;
    result.addEventListener('click', () => query.closest('dialog')?.close());
    listItem.append(result);
    return listItem;
  }));

  searchStatus.textContent = matches.length
    ? `${matches.length} ${matches.length === 1 ? 'item encontrado' : 'itens encontrados'}.`
    : 'Nenhum item encontrado.';
}

query?.addEventListener('input', renderResults);
renderResults();
setMenu(mobile.matches ? false : getInitialDesktopMenuState());
updateCurrent();
