(() => {
  'use strict';

  const formulario = document.querySelector('#formulario-ajuda');
  if (!formulario) return;

  const retorno = document.querySelector('#ajuda-retorno');
  const campos = [...formulario.querySelectorAll('[required]')];

  campos.forEach(campo => {
    campo.addEventListener('input', () => {
      campo.setCustomValidity('');
      campo.removeAttribute('aria-invalid');
      if (retorno) retorno.textContent = '';
    });
  });

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    campos.forEach(campo => {
      const preenchido = Boolean(campo.value.trim());
      campo.setCustomValidity(preenchido ? '' : 'Preencha este campo.');
      if (!preenchido || !campo.checkValidity()) {
        campo.setAttribute('aria-invalid', 'true');
      } else {
        campo.removeAttribute('aria-invalid');
      }
    });

    if (!formulario.reportValidity()) return;

    const email = formulario.querySelector('#ajuda-email')?.value.trim();
    formulario.reset();
    if (retorno) {
      retorno.textContent = `Mensagem registrada! Responderemos no e-mail ${email} em breve.`;
    }
  });
})();
