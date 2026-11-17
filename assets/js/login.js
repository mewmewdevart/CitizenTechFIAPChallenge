(() => {
  const form = document.querySelector('[data-login-form]');
  if (!form) return;

  const statusEl = document.querySelector('[data-login-status]');
  const emailInput = form.elements.email;
  const senhaInput = form.elements.senha;
  const btnEsqueci = document.querySelector('[data-login-esqueci]');
  const btnCadastro = document.querySelector('[data-login-cadastro]');

  const limparErros = () => {
    emailInput?.removeAttribute('aria-invalid');
    senhaInput?.removeAttribute('aria-invalid');
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.remove('login__status--erro');
    }
  };

  const mostrarErro = (campo, mensagem) => {
    if (campo) {
      campo.setAttribute('aria-invalid', 'true');
      campo.focus();
    }
    if (statusEl) {
      statusEl.textContent = mensagem;
      statusEl.classList.add('login__status--erro');
    }
  };

  const validarLogin = () => {
    limparErros();
    const email = String(emailInput?.value || '').trim();
    const senha = String(senhaInput?.value || '').trim();

    if (!email) {
      mostrarErro(emailInput, 'Informe seu e-mail para entrar.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarErro(emailInput, 'Informe um e-mail válido (ex.: nome@dominio.com).');
      return false;
    }
    if (!senha) {
      mostrarErro(senhaInput, 'Informe sua senha para entrar.');
      return false;
    }
    if (senha.length < 4) {
      mostrarErro(senhaInput, 'A senha deve ter pelo menos 4 caracteres.');
      return false;
    }
    return true;
  };

  emailInput?.addEventListener('input', limparErros);
  senhaInput?.addEventListener('input', limparErros);

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    if (!validarLogin()) return;
    window.location.href = 'home.html';
  });

  btnEsqueci?.addEventListener('click', evento => evento.preventDefault());
  btnCadastro?.addEventListener('click', evento => evento.preventDefault());
})();
