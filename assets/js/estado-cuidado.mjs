/** @typedef {'mari' | 'flavio-pneu'} PerfilId */

const IDS_PERFIS = /** @type {const} */ (['mari', 'flavio-pneu']);
const CHAVE_SESSAO = 'mutirao-mvp-estado-v2';
const CHAVE_LEGADA = 'mutirao-mvp-estado-v1';
const LISTAS = [
  'equipeCuidado', 'insumos', 'portaRemedios', 'events', 'tasks', 'documents',
  'recadosMural', 'coberturasRede', 'rotinasSemanais', 'itensExtras', 'itensExcluidos', 'participantesExtras',
  'convites', 'historicoConvites', 'historicoAtribuicoes', 'pedidosFolga', 'lembretesExecutados',
  'recadosEnviados', 'chamados'
];
const MAPAS = [
  'estoqueInicial', 'escalasFixas', 'lacunasTurno', 'covered', 'shiftEdits', 'reports',
  'registrosDose', 'itensEditados', 'estoqueBase', 'reposicoesEstoque', 'atribuicoesTurno',
  'reacoesRecados'
];

const objeto = valor => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
/** @param {unknown} id @returns {id is PerfilId} */
const perfilValido = id => IDS_PERFIS.some(fixo => fixo === id);
const congelar = valor => {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar);
    Object.freeze(valor);
  }
  return valor;
};

function comporPerfil(base, salvo = {}) {
  const { perfis, perfilAtivoId, perfilUsuario, ...dados } = objeto(salvo) ? salvo : {};
  const person = { ...base.person, ...(objeto(dados.person) ? dados.person : {}) };
  for (const chave of Object.keys(base.person)) {
    if (typeof person[chave] !== 'string') person[chave] = '';
  }
  person.nome = typeof person.nome === 'string' && person.nome.trim() ? person.nome.trim() : base.person.nome;
  person.apelido = typeof person.apelido === 'string' ? person.apelido.trim() : '';
  if (person.cobertura === 'Sem turnos definidos') person.cobertura = '';
  if (person.carteira === 'Não informado') person.carteira = '';
  const perfil = { ...base, ...dados, id: base.id, person };

  for (const chave of LISTAS) {
    perfil[chave] = Array.isArray(dados[chave]) ? dados[chave] : Array.isArray(base[chave]) ? base[chave] : [];
  }
  for (const chave of MAPAS) {
    perfil[chave] = objeto(dados[chave]) ? dados[chave] : objeto(base[chave]) ? base[chave] : {};
  }

  if (Array.isArray(dados.tasks) && Array.isArray(base.tasks)) {
    const tarefasBase = new Map(base.tasks.map(tarefa => [tarefa.id, tarefa]));
    perfil.tasks = dados.tasks.map(tarefa => ({ ...tarefasBase.get(tarefa.id), ...tarefa }));
  }

  if (base.id === 'mari') {
    const anterior = '18h|Metformina';
    const atual = '20h|Metformina';
    if (perfil.registrosDose[anterior] && !perfil.registrosDose[atual]) {
      perfil.registrosDose = { ...perfil.registrosDose, [atual]: perfil.registrosDose[anterior] };
      delete perfil.registrosDose[anterior];
    }
  }
  return perfil;
}

export async function carregarBaseCuidado() {
  const resposta = await fetch(new URL('../data/perfis-acompanhados.json', import.meta.url));
  if (!resposta.ok) throw new Error('A base de fichas está indisponível.');
  return resposta.json();
}

/** Mantém a conta comum e aplica cada alteração à ficha selecionada na sessão. */
export function criarBancoCuidado(base, armazenamento) {
  if (!perfilValido(base?.perfilAtivoId) || !objeto(base.perfilUsuario) ||
      !IDS_PERFIS.every(id => base.perfis?.[id]?.id === id &&
        typeof base.perfis[id].person?.nome === 'string' && base.perfis[id].person.nome.trim())) {
    throw new Error('A base deve declarar Mari, Flavio e o administrador.');
  }

  const ler = chave => {
    try {
      const dados = JSON.parse(armazenamento.getItem(chave));
      return objeto(dados) ? dados : null;
    } catch {
      return null;
    }
  };

  const lerSessao = () => {
    const atual = ler(CHAVE_SESSAO);
    const antigo = atual ? null : ler(CHAVE_LEGADA);
    const dados = atual || antigo || {};
    // Formato anterior à seleção de fichas, originalmente dedicado à Mari.
    const idLegado = !dados.perfis && objeto(dados.person) ? dados.id || 'mari' : null;
    const rascunhos = idLegado && perfilValido(idLegado) ? { [idLegado]: dados } : dados.perfis;
    const registros = Object.fromEntries(IDS_PERFIS
      .filter(id => objeto(rascunhos?.[id]))
      .map(id => [id, rascunhos[id]]));
    const legadoTransferido = antigo && IDS_PERFIS.some(id => registros[id]?.administradorRede);
    const conta = { ...base.perfilUsuario, ...(objeto(dados.perfilUsuario) ? dados.perfilUsuario : {}) };
    if (legadoTransferido && conta.papel === 'Participante') conta.papel = base.perfilUsuario.papel;
    const selecionado = idLegado || dados.perfilAtivoId;
    return {
      perfilAtivoId: perfilValido(selecionado) ? selecionado : base.perfilAtivoId,
      perfilUsuario: conta,
      perfis: registros
    };
  };

  let sessao = lerSessao();
  const montarFicha = (id, dados = sessao) =>
    comporPerfil(base.perfis[id], dados.perfis[id]);
  const montarEstado = dados => congelar({
    ...montarFicha(dados.perfilAtivoId, dados),
    perfilAtivoId: dados.perfilAtivoId,
    perfilUsuario: dados.perfilUsuario
  });
  let estado = montarEstado(sessao);

  const persistir = proxima => {
    armazenamento.setItem(CHAVE_SESSAO, JSON.stringify(proxima));
    sessao = proxima;
    estado = montarEstado(sessao);
    return estado;
  };

  return {
    obterEstado: () => estado,
    obterPerfis: () => IDS_PERFIS.map(id => congelar(montarFicha(id))),
    mudouNoHistorico: () => JSON.stringify(lerSessao()) !== JSON.stringify(sessao),
    selecionar(id) {
      if (!perfilValido(id) || id === sessao.perfilAtivoId) return false;
      persistir({ ...sessao, perfilAtivoId: id });
      return true;
    },
    atualizar(transformar) {
      const id = sessao.perfilAtivoId;
      const rascunho = structuredClone(estado);
      const proximo = transformar(rascunho);
      if (!objeto(proximo) || proximo.id !== id || proximo.perfilAtivoId !== id ||
          Object.hasOwn(proximo, 'perfis') || !objeto(proximo.person) || !objeto(proximo.perfilUsuario)) {
        throw new Error('A alteração precisa pertencer à ficha selecionada.');
      }

      const { perfilAtivoId, perfilUsuario, person, ...ficha } = proximo;
      const dadosBase = comporPerfil(base.perfis[id]);
      const alteracoes = Object.fromEntries(Object.entries(ficha)
        .filter(([chave, valor]) => JSON.stringify(valor) !== JSON.stringify(dadosBase[chave])));
      const camposEditados = Object.fromEntries(Object.entries(person)
        .filter(([chave, valor]) => valor !== dadosBase.person[chave]));
      if (Object.keys(camposEditados).length) alteracoes.person = camposEditados;
      return persistir({
        perfilAtivoId,
        perfilUsuario,
        perfis: { ...sessao.perfis, [id]: alteracoes }
      });
    }
  };
}
