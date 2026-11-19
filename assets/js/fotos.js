(() => {
  const LIMITE_ARQUIVO = 2 * 1024 * 1024;
  const LIMITE_DATA_URL = 64 * 1024;
  const LADO_MAXIMO = 320;
  const TIPOS = ['image/jpeg', 'image/png'];

  function finalizarAvatar(img, falhou) {
    img.removeAttribute('data-avatar-pendente');
    const alternativa = img.dataset.avatarAlternativo;
    if (falhou && alternativa && img.getAttribute('src') !== alternativa) {
      delete img.dataset.avatarAlternativo;
      img.src = alternativa;
    }
  }

  for (const tipo of ['load', 'error']) {
    document.addEventListener(tipo, evento => {
      const img = evento.target;
      if (img instanceof HTMLImageElement && img.hasAttribute('data-avatar-alternativo')) {
        finalizarAvatar(img, tipo === 'error');
      }
    }, true);
  }

  function aplicarAvatar(img, foto, mascote) {
    if (!img) return;
    if (!foto) {
      delete img.dataset.avatarFoto;
      delete img.dataset.avatarAlternativo;
      img.removeAttribute('data-avatar-pendente');
      if (img.getAttribute('src') !== mascote) img.src = mascote;
      return;
    }
    // Evita novas tentativas da mesma URL após usar o mascote de fallback.
    if (img.dataset.avatarFoto === foto && img.getAttribute('src') === mascote) return;
    img.dataset.avatarFoto = foto;
    img.dataset.avatarAlternativo = mascote;
    if (img.getAttribute('src') !== foto) img.src = foto;
    img.toggleAttribute('data-avatar-pendente', !img.complete);
    if (img.complete) finalizarAvatar(img, img.naturalWidth === 0);
  }

  async function prepararFoto(arquivo) {
    if (!TIPOS.includes(arquivo.type)) throw new Error('Escolha uma foto JPG ou PNG.');
    if (arquivo.size > LIMITE_ARQUIVO) throw new Error('A foto é grande demais. Use uma de até 2 MB.');

    const url = URL.createObjectURL(arquivo);
    try {
      const imagem = new Image();
      await new Promise((resolver, rejeitar) => {
        imagem.addEventListener('load', resolver, { once: true });
        imagem.addEventListener('error', rejeitar, { once: true });
        imagem.src = url;
      });
      const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.naturalWidth, imagem.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
      const contexto = canvas.getContext('2d');
      if (!contexto) throw new Error('Canvas indisponível.');
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      for (const qualidade of [0.82, 0.65, 0.45]) {
        const foto = canvas.toDataURL('image/webp', qualidade);
        if (foto !== 'data:,' && foto.length <= LIMITE_DATA_URL) return foto;
      }
    } catch {
      throw new Error('Não deu para preparar essa foto. Escolha outra imagem.');
    } finally {
      URL.revokeObjectURL(url);
    }
    throw new Error('Não deu para reduzir essa foto. Escolha uma imagem menor.');
  }

  function controlarEnvio(input, aplicarFoto) {
    if (!input) return () => {};
    const form = input.form;
    const retorno = document.createElement('p');
    retorno.setAttribute('role', 'status');
    retorno.className = 'foto-upload-status';
    (input.closest('.editar-ficha__foto-linha') || input).after(retorno);
    let pendente = null;

    const cancelar = () => {
      pendente = null;
      input.value = '';
      retorno.textContent = '';
    };

    input.addEventListener('change', async () => {
      const arquivo = input.files?.[0];
      if (!arquivo) return;
      const envio = {};
      pendente = envio;
      retorno.textContent = 'Preparando a foto…';
      try {
        const foto = await prepararFoto(arquivo);
        if (pendente !== envio) return;
        aplicarFoto(foto);
        retorno.textContent = '';
      } catch (erro) {
        if (pendente !== envio) return;
        retorno.textContent = erro.message;
      } finally {
        if (pendente === envio) {
          pendente = null;
          input.value = '';
        }
      }
    });

    form?.addEventListener('submit', evento => {
      if (!pendente) return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
      retorno.textContent = 'Aguarde a preparação da foto antes de salvar.';
    }, true);
    form?.closest('dialog')?.addEventListener('close', cancelar);
    return cancelar;
  }

  window.MutiraoFotos = { aplicarAvatar, controlarEnvio };
})();
