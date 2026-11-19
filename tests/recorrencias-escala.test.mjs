import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { carregarBaseCuidado, criarBancoCuidado } from '../assets/js/estado-cuidado.mjs';

const base = JSON.parse(readFileSync(new URL('../assets/data/perfis-acompanhados.json', import.meta.url)));
const fonte = readFileSync(new URL('../assets/js/nucleo-cuidado.js', import.meta.url), 'utf8')
  .replace("import('./estado-cuidado.mjs')", 'moduloEstado');

function montarCore(sessao, buscarBase) {
  const eventos = [];
  const window = { addEventListener() {}, dispatchEvent(evento) { eventos.push(evento.type); } };
  const status = { setAttribute() {}, append() {}, remove() { this.removido = true; } };
  const secao = { inert: true, removeAttribute() {} };
  const main = { hidden: false, prepend() {} };
  const document = {
    documentElement: { dataset: { cuidado: 'carregando' } },
    addEventListener: (_evento, callback) => queueMicrotask(callback),
    querySelector: seletor => ({
      main,
      '[data-status-inicial-cuidado]': status,
      '[data-base-cuidado]': { href: 'https://mutirao.test/assets/data/perfis-acompanhados.json' }
    })[seletor] || null,
    querySelectorAll: seletor => seletor.includes('[data-cuidado-conteudo]') ? [secao] : [],
    getElementById: () => null,
    createElement: () => ({ addEventListener() {}, setAttribute() {} })
  };
  runInNewContext(fonte, {
    window, document, Event, queueMicrotask, fetch: buscarBase,
    sessionStorage: { getItem: chave => sessao.get(chave) ?? null, setItem: (chave, valor) => sessao.set(chave, valor) },
    moduloEstado: { criarBancoCuidado, carregarBaseCuidado }
  }, { filename: 'nucleo-cuidado.js' });
  return { pronto: window.MutiraoCuidadoPronto, document, main, secao, status, eventos };
}

const respostaComBase = () => ({ ok: true, json: async () => structuredClone(base) });

function criarCore(sessao = new Map()) {
  return montarCore(sessao, respostaComBase).pronto;
}

test('mantém a estrutura visível enquanto a base atrasa e então libera os dados', async () => {
  const rede = Promise.withResolvers();
  const { pronto, document, main, secao, status, eventos } = montarCore(new Map(), () => rede.promise);
  assert.equal(main.hidden, false);
  assert.equal(secao.inert, true);
  assert.equal(document.documentElement.dataset.cuidado, 'carregando');
  rede.resolve(respostaComBase());
  await pronto;
  await Promise.resolve();
  assert.deepEqual(eventos, ['mutirao:cuidado-pronto']);
  assert.equal(document.documentElement.dataset.cuidado, 'pronto');
  assert.equal(secao.inert, false);
  assert.equal(status.removido, true);
});

test('mantém a estrutura visível e as ações protegidas quando a base falha', async () => {
  const { pronto, document, main, secao, status, eventos } = montarCore(new Map(), () => ({ ok: false }));
  assert.equal(await pronto, null);
  assert.equal(main.hidden, false);
  assert.equal(document.documentElement.dataset.cuidado, 'erro');
  assert.equal(secao.inert, true);
  assert.match(status.textContent, /Não foi possível/);
  assert.deepEqual(eventos, []);
});

function diasDoCenario(core) {
  const base = new Date(core.HOJE + 'T12:00:00');
  const aPartirDe = dias => {
    const data = new Date(base);
    data.setDate(data.getDate() + dias);
    return core.gerarChaveData(data.getFullYear(), data.getMonth(), data.getDate());
  };
  return { hoje: core.HOJE, amanha: aPartirDe(1), proximaSemana: aPartirDe(7), duasSemanas: aPartirDe(14) };
}

function assumir(core, dia, inicio, fim, escopo) {
  core.atualizarEstado(estado => core.assumirTurno(estado, dia, { inicio, fim, gapInicio: inicio, gapFim: fim }, escopo));
}

function turnos(core, dia) {
  return Array.from(core.construirLinhaDoTempoDia(dia).filter(seg => seg.tipo === 'turno'),
    seg => [seg.inicio, seg.fim, seg.pessoa.nome]);
}

test('encerrar a série não ressuscita uma ocorrência cancelada, inclusive com cobertura antiga', async () => {
  for (const legado of [false, true]) {
    const sessao = new Map();
    const core = await criarCore(sessao);
    const { hoje, proximaSemana } = diasDoCenario(core);
    assumir(core, hoje, 8, 12, core.ESCOPO_TURNO.semanal);
    assert.equal(core.obterEstado().covered[hoje], undefined);

    if (legado) {
      core.atualizarEstado(estado => ({ ...estado, covered: { [hoje]: [{ inicio: 8, fim: 12 }] } }));
    }
    core.atualizarEstado(estado => core.aplicarIntervaloZe(estado, hoje, 8, 12, 0, 0));
    assert.equal(core.obterRotuloLacuna(hoje), 'Descoberto');
    assert.equal(core.obterRotuloLacuna(proximaSemana), 'Coberto');

    const reaberto = await criarCore(sessao);
    const [{ id }] = reaberto.obterRotinasSemanais();
    reaberto.atualizarEstado(estado => reaberto.removerRotinaSemanal(estado, id));
    assert.equal(reaberto.obterRotuloLacuna(hoje), 'Sem turnos');
    assert.equal(reaberto.obterRotuloLacuna(proximaSemana), 'Sem turnos');
  }
});

test('une as horas diárias e semanais da mesma pessoa e mantém cobertura quando uma regra sobreposta é retirada', async () => {
  const core = await criarCore();
  const { hoje, amanha, proximaSemana } = diasDoCenario(core);
  assumir(core, hoje, 8, 12, core.ESCOPO_TURNO.semanal);
  assumir(core, amanha, 9, 13, core.ESCOPO_TURNO.diario);
  const { nomeComApelido } = core.obterUsuarioAtual();
  assert.deepEqual(turnos(core, proximaSemana), [[8, 13, nomeComApelido]]);
  assert.deepEqual(Array.from(core.obterLacunasDia(proximaSemana)), []);
  core.atualizarEstado(estado => core.removerRotinaSemanal(estado, core.obterRotinasSemanais()[0].id));
  assert.deepEqual(turnos(core, proximaSemana), [[9, 13, nomeComApelido]]);
});

test('o aceite respeita o escopo pontual, semanal ou diário, incluindo pedidos antigos', async () => {
  for (const escopo of ['pontual', 'semanal', 'diario']) {
    for (const legado of [false, true]) {
      const core = await criarCore();
      const { hoje, amanha, proximaSemana } = diasDoCenario(core);
      const responsavel = 'Pessoa convidada';
      const chave = hoje + '|12h–13h';
      core.atualizarEstado(estado => {
        const novo = {
          ...estado,
          participantesExtras: [{ nome: responsavel }],
          atribuicoesTurno: { [chave]: { dia: hoje, horario: '12h–13h', responsavel, ...(legado ? {} : { escopo }) } }
        };
        return legado ? core.definirRotinaTurno(novo, hoje, 12, 13, escopo) : novo;
      });
      assert.deepEqual(turnos(core, hoje), []);
      core.resolverAtribuicao(chave, true);
      const esperado = [[12, 13, responsavel]];
      assert.deepEqual(turnos(core, hoje), esperado);
      assert.deepEqual(turnos(core, amanha), escopo === 'diario' ? esperado : []);
      assert.deepEqual(turnos(core, proximaSemana), escopo === 'pontual' ? [] : esperado);
    }
  }
});

test('aceite recorrente com conflito futuro mantém o pedido e a escala anterior', async () => {
  const core = await criarCore();
  const { hoje, amanha, proximaSemana } = diasDoCenario(core);
  const responsavel = 'Pessoa convidada';
  const chave = amanha + '|09h–13h';
  assumir(core, hoje, 8, 12, core.ESCOPO_TURNO.semanal);
  core.atualizarEstado(estado => ({
    ...estado,
    participantesExtras: [{ nome: responsavel }],
    atribuicoesTurno: { [chave]: { dia: amanha, horario: '09h–13h', responsavel, escopo: 'diario' } }
  }));
  assert.throws(() => core.resolverAtribuicao(chave, true), /coincide com uma rotina/);
  assert.ok(core.obterEstado().atribuicoesTurno[chave]);
  assert.deepEqual(turnos(core, proximaSemana), [[8, 12, core.obterUsuarioAtual().nomeComApelido]]);
});

test('sair da rede transfere a série e preserva a exceção que cancelou um dia', async () => {
  const core = await criarCore();
  const { hoje, proximaSemana, duasSemanas } = diasDoCenario(core);
  const responsavel = 'Pessoa substituta';
  core.atualizarEstado(estado => ({ ...estado, participantesExtras: [{ nome: responsavel }] }));
  assumir(core, hoje, 8, 12, core.ESCOPO_TURNO.semanal);
  core.atualizarEstado(estado => core.aplicarIntervaloZe(estado, proximaSemana, 8, 12, 0, 0));
  core.sairDaRede(responsavel);
  assert.deepEqual(turnos(core, hoje), [[8, 12, responsavel]]);
  assert.equal(core.obterRotuloLacuna(proximaSemana), 'Descoberto');
  assert.deepEqual(turnos(core, duasSemanas), [[8, 12, responsavel]]);
});

test('as escalas fixas continuam reconhecendo o turno do usuário e o responsável atual pelas doses', async () => {
  const core = await criarCore();
  const { hoje } = diasDoCenario(core);
  core.selecionarPerfilAcompanhado('mari');
  const autor = core.obterUsuarioAtual().nomeComApelido;
  assert.ok(core.construirLinhaDoTempoDia(hoje).some(seg => seg.pessoa?.ehUsuarioAtual));
  assumir(core, hoje, 12, 13, core.ESCOPO_TURNO.pontual);
  core.registrarDose('12h|Omeprazol', { estado: 'administrado', quem: autor, horario: '12:05' });
  const grupo = core.obterCompartimentos().find(grupo => grupo.hora === '12h');
  assert.equal(grupo.responsavel, autor);
  assert.equal(grupo.itens.find(dose => dose.itemId === 'Omeprazol').quem, autor);
});
