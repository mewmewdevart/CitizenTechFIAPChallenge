import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { criarBancoCuidado } from '../assets/js/estado-cuidado.mjs';

const base = JSON.parse(readFileSync(new URL('../assets/data/perfis-acompanhados.json', import.meta.url)));

function criarArmazenamento(dados = []) {
  const memoria = new Map(dados);
  return {
    getItem: chave => memoria.get(chave) ?? null,
    setItem: (chave, valor) => memoria.set(chave, valor)
  };
}

test('normaliza rotinasSemanais como lista e preserva regras por perfil', () => {
  const sessao = criarArmazenamento();
  const banco = criarBancoCuidado(base, sessao);

  assert.deepEqual(banco.obterEstado().rotinasSemanais, []);

  banco.atualizar(estado => ({
    ...estado,
    person: { ...estado.person, cobertura: 'Sem acompanhamento regular' },
    rotinasSemanais: [
      { id: 'rotina-2-7-12', diaSemana: 2, desde: '2026-11-10', inicio: 7, fim: 12 }
    ]
  }));

  const reaberto = criarBancoCuidado(base, sessao);
  assert.equal(reaberto.obterEstado().person.cobertura, 'Sem acompanhamento regular');
  assert.equal(reaberto.obterEstado().rotinasSemanais.length, 1);
  assert.deepEqual(reaberto.obterEstado().rotinasSemanais[0], {
    id: 'rotina-2-7-12',
    diaSemana: 2,
    desde: '2026-11-10',
    inicio: 7,
    fim: 12
  });

  reaberto.selecionar('mari');
  assert.deepEqual(reaberto.obterEstado().rotinasSemanais, []);
  assert.equal(reaberto.obterEstado().person.cobertura, '24 horas por dia');
});

test('persiste janelaAcompanhamento diária e coberturas pontuais sem afetar outro perfil', () => {
  const sessao = criarArmazenamento();
  const banco = criarBancoCuidado(base, sessao);

  banco.atualizar(estado => ({
    ...estado,
    person: { ...estado.person, cobertura: 'Horário diário combinado' },
    janelaAcompanhamento: { desde: '2026-11-10', inicio: 8, fim: 18 },
    covered: { '2026-11-10': [{ inicio: 8, fim: 12 }] }
  }));

  const reaberto = criarBancoCuidado(base, sessao);
  assert.deepEqual(reaberto.obterEstado().janelaAcompanhamento, { desde: '2026-11-10', inicio: 8, fim: 18 });
  assert.deepEqual(reaberto.obterEstado().covered['2026-11-10'], [{ inicio: 8, fim: 12 }]);

  reaberto.selecionar('mari');
  assert.equal(reaberto.obterEstado().janelaAcompanhamento, undefined);
  assert.equal(Object.keys(reaberto.obterEstado().escalasFixas).length > 0, true);
});
