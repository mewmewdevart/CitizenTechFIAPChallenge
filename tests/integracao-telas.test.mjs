import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { carregarBaseCuidado, criarBancoCuidado } from '../assets/js/estado-cuidado.mjs';

const base = JSON.parse(readFileSync(new URL('../assets/data/perfis-acompanhados.json', import.meta.url)));
const fonte = readFileSync(new URL('../assets/js/nucleo-cuidado.js', import.meta.url), 'utf8')
  .replace("import('./estado-cuidado.mjs')", 'moduloEstado');

async function criarCore(sessao = new Map()) {
  const window = { addEventListener() {}, dispatchEvent() {} };
  const status = { setAttribute() {}, append() {}, remove() {} };
  const main = { hidden: false, prepend() {} };
  const document = {
    documentElement: { dataset: { cuidado: 'carregando' } },
    addEventListener: (_evento, callback) => queueMicrotask(callback),
    querySelector: seletor => ({
      main,
      '[data-status-inicial-cuidado]': status,
      '[data-base-cuidado]': { href: 'https://mutirao.test/assets/data/perfis-acompanhados.json' }
    })[seletor] || null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, remove() {}, append() {}, addEventListener() {} })
  };
  runInNewContext(fonte, {
    window, document, Event, queueMicrotask,
    fetch: async () => ({ ok: true, json: async () => structuredClone(base) }),
    sessionStorage: { getItem: chave => sessao.get(chave) ?? null, setItem: (chave, valor) => sessao.set(chave, valor) },
    moduloEstado: { criarBancoCuidado, carregarBaseCuidado }
  }, { filename: 'nucleo-cuidado.js' });
  return window.MutiraoCuidadoPronto;
}

test('percurso entre telas: assume horário descoberto, registra dose, confere tarefas do dia e persiste relato no Diário após recarregar', async () => {
  const sessao = new Map();
  const core = await criarCore(sessao);
  core.selecionarPerfilAcompanhado('mari');
  const hoje = core.HOJE;

  // 1. Garante um horário descoberto inicial na escala de hoje
  if (core.obterLacunasDia(hoje).length === 0) {
    const turno = core.construirLinhaDoTempoDia(hoje).find(seg => seg.tipo === 'turno');
    assert.ok(turno, 'deve existir um turno para simular horário descoberto');
    core.atualizarEstado(estado => ({
      ...estado,
      turnosCancelados: {
        ...(estado.turnosCancelados || {}),
        [hoje]: [...(estado.turnosCancelados?.[hoje] || []), { inicio: turno.inicio, fim: turno.fim }]
      }
    }));
  }

  const lacunasIniciais = core.obterLacunasDia(hoje);
  assert.equal(lacunasIniciais.length > 0, true);
  assert.notEqual(core.obterRotuloLacuna(hoje), 'Coberto');

  // 2. Assume a cobertura pela Agenda
  for (const lacuna of lacunasIniciais) {
    core.atualizarEstado(estado => core.assumirTurno(
      estado,
      hoje,
      { inicio: lacuna.inicio, fim: lacuna.fim, gapInicio: lacuna.inicio, gapFim: lacuna.fim },
      core.ESCOPO_TURNO.pontual
    ));
  }
  assert.equal(core.obterLacunasDia(hoje).length, 0);
  assert.equal(core.obterRotuloLacuna(hoje), 'Coberto');

  // 3. Registra uma dose pendente em Medicamentos
  const dosePendente = core.obterDoses().find(dose => dose.estado !== 'administrado');
  assert.ok(dosePendente, 'deve existir ao menos uma dose pendente hoje');
  const usuario = core.obterUsuarioAtual();
  core.registrarDose(dosePendente.chave, {
    estado: 'administrado',
    quem: usuario.nomeComApelido,
    horario: '12:05',
    origemExterna: ''
  });
  assert.equal(core.obterDoses().find(dose => dose.chave === dosePendente.chave)?.estado, 'administrado');

  // 4. Confere o estado refletido nos compartimentos usados pelas tarefas do dia
  const grupoDose = core.obterCompartimentos().find(grupo => grupo.hora === dosePendente.hora);
  assert.ok(grupoDose, 'compartimento da dose deve existir');
  const itemRegistrado = grupoDose.itens.find(item => item.chave === dosePendente.chave);
  assert.equal(itemRegistrado?.estado, 'administrado');
  assert.equal(itemRegistrado?.quem, usuario.nomeComApelido);

  // 5. Registra um relato no Diário de turno e verifica persistência após recarregar
  const textoRelato = 'Cobertura assumida e dose administrada sem intercorrências.';
  core.atualizarEstado(estado => ({
    ...estado,
    reports: {
      ...(estado.reports || {}),
      [hoje]: [
        [usuario.nome, usuario.papel, '', textoRelato, 'Seguir rotina da tarde'],
        ...(estado.reports?.[hoje] || [])
      ]
    }
  }));

  const coreRecarregado = await criarCore(sessao);
  coreRecarregado.selecionarPerfilAcompanhado('mari');

  assert.equal(coreRecarregado.obterRotuloLacuna(hoje), 'Coberto');
  assert.equal(
    coreRecarregado.obterDoses().find(dose => dose.chave === dosePendente.chave)?.estado,
    'administrado'
  );
  const relatosHoje = coreRecarregado.obterEstado().reports?.[hoje] || [];
  assert.equal(relatosHoje[0]?.[0], usuario.nome);
  assert.equal(relatosHoje[0]?.[3], textoRelato);
});
