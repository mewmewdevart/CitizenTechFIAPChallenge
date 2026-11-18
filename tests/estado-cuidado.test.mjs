import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { criarBancoCuidado } from '../assets/js/estado-cuidado.mjs';

const base = JSON.parse(readFileSync(new URL('../assets/data/perfis-acompanhados.json', import.meta.url)));
const CHAVE_LEGADA = 'mutirao-mvp-estado-v1';
const CHAVE_ATUAL = 'mutirao-mvp-estado-v2';

function criarArmazenamento(dados) {
  const memoria = new Map(dados);
  return {
    getItem: chave => memoria.get(chave) ?? null,
    setItem: (chave, valor) => memoria.set(chave, valor)
  };
}

test('abre no perfil configurado e expõe somente Mari e Flavio', () => {
  const sessao = criarArmazenamento();
  const banco = criarBancoCuidado(base, sessao);
  assert.deepEqual(banco.obterPerfis().map(ficha => ficha.id), ['mari', 'flavio-barbosa']);
  assert.equal(banco.obterEstado().id, 'flavio-barbosa');
  assert.equal(banco.obterEstado().person.nome, base.perfis['flavio-barbosa'].person.nome);
  for (const chave of ['events', 'tasks', 'documents', 'equipeCuidado', 'portaRemedios', 'recadosMural']) {
    assert.deepEqual(banco.obterEstado()[chave], []);
  }
  assert.equal(banco.selecionar('outra-ficha'), false);
  assert.equal(banco.selecionar('__proto__'), false);
  assert.equal(sessao.getItem(CHAVE_ATUAL), null);
  assert.throws(() => criarBancoCuidado({ ...base, perfis: {} }, sessao), /Mari, Flavio/);
});

test('edição, recarga e histórico preservam a ficha e distinguem saldo zero de ausente', () => {
  const sessao = criarArmazenamento();
  const banco = criarBancoCuidado(base, sessao);
  const anterior = banco.obterEstado();
  assert.equal(Object.hasOwn(anterior, 'perfis'), false);
  assert.throws(() => { anterior.person.nome = 'Alterado sem salvar'; }, TypeError);
  assert.throws(() => banco.atualizar(estado => ({ ...estado, perfilAtivoId: 'mari' })), /ficha selecionada/);
  assert.throws(() => banco.atualizar(estado => ({ ...estado, id: 'outro' })), /ficha selecionada/);
  banco.atualizar(estado => ({
    ...estado,
    person: { ...estado.person, referencia: 'Contato de Flavio' },
    events: [{ id: 'evento-flavio', titulo: 'Consulta de Flavio' }],
    estoqueBase: { material: 0 }
  }));
  const alteracoes = JSON.parse(sessao.getItem(CHAVE_ATUAL)).perfis['flavio-barbosa'];
  assert.deepEqual(alteracoes.person, { referencia: 'Contato de Flavio' });
  const reaberto = criarBancoCuidado(base, sessao);
  assert.equal(reaberto.obterEstado().person.referencia, 'Contato de Flavio');
  assert.equal(reaberto.obterEstado().estoqueBase.material, 0);
  assert.equal(reaberto.obterEstado().estoqueBase.ausente, undefined);
  assert.equal(reaberto.selecionar('mari'), true);
  assert.deepEqual(reaberto.obterEstado().events, base.perfis.mari.events);
  assert.deepEqual(reaberto.obterEstado().person, base.perfis.mari.person);
  assert.equal(banco.mudouNoHistorico(), true);
  assert.equal(reaberto.mudouNoHistorico(), false);
});

test('migra dados antigos dos perfis fixos e mantém a sessão legada para recuperação', () => {
  const legado = JSON.stringify({
    perfilAtivoId: 'adicional',
    perfilUsuario: { nome: 'José', papel: 'Participante' },
    perfis: {
      adicional: { person: { nome: 'Antigo cadastro' } },
      mari: {
        administradorRede: 'Outra pessoa',
        person: { preferencias: 'Preferência editada' },
        tasks: [{ id: 'tarefa-metformina-20', concluida: true }],
        registrosDose: { '18h|Metformina': { estado: 'administrado' } }
      },
      'flavio-barbosa': { person: { referencia: 'Contato já existente' } }
    }
  });
  const sessao = criarArmazenamento([[CHAVE_LEGADA, legado]]);
  const banco = criarBancoCuidado(base, sessao);
  assert.equal(banco.obterEstado().id, base.perfilAtivoId);
  assert.equal(banco.obterEstado().person.referencia, 'Contato já existente');
  assert.equal(banco.obterEstado().perfilUsuario.papel, 'Administrador');
  banco.selecionar('mari');
  assert.equal(banco.obterEstado().administradorRede, 'Outra pessoa');
  assert.equal(banco.obterEstado().person.preferencias, 'Preferência editada');
  assert.equal(banco.obterEstado().tasks[0].concluida, true);
  assert.equal(banco.obterEstado().tasks[0].medicacao.hora, '20h');
  assert.equal(banco.obterEstado().registrosDose['20h|Metformina'].estado, 'administrado');
  assert.equal(sessao.getItem(CHAVE_LEGADA), legado);
  assert.equal(Object.hasOwn(JSON.parse(sessao.getItem(CHAVE_ATUAL)).perfis, 'adicional'), false);
});

test('migra a versão com uma única ficha e tolera armazenamento ilegível', () => {
  const legado = JSON.stringify({ person: { nome: 'Mari editada' }, reports: { '2026-11-10': [] } });
  const sessao = criarArmazenamento([[CHAVE_ATUAL, 'json inválido'], [CHAVE_LEGADA, legado]]);
  const banco = criarBancoCuidado(base, sessao);
  assert.equal(banco.obterEstado().id, 'mari');
  assert.equal(banco.obterEstado().person.nome, 'Mari editada');
  assert.equal(banco.obterEstado().person.nascimento, base.perfis.mari.person.nascimento);
  assert.equal(banco.obterEstado().recadosMural.length, 3);
});

test('não publica dados em memória quando a gravação falha', () => {
  const banco = criarBancoCuidado(base, { getItem: () => null, setItem: () => { throw Error('Sem espaço'); } });
  const anterior = banco.obterEstado();
  assert.throws(() => banco.selecionar('mari'), /Sem espaço/);
  assert.throws(() => banco.atualizar(estado => ({ ...estado, events: [] })), /Sem espaço/);
  assert.equal(banco.obterEstado(), anterior);
});
