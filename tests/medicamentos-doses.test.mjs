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

test('preserva finalidadesMedicacao na base de Mari e mantém Flavio vazio', () => {
  const sessao = criarArmazenamento();
  const banco = criarBancoCuidado(base, sessao);

  assert.equal(banco.obterEstado().portaRemedios.length, 0);
  assert.equal(banco.obterEstado().finalidadesMedicacao, undefined);

  banco.selecionar('mari');
  const estadoMari = banco.obterEstado();
  assert.equal(estadoMari.portaRemedios.length > 0, true);
  assert.equal(typeof estadoMari.finalidadesMedicacao?.Levotiroxina, 'string');
});

test('permite registrar e desfazer dose dada voltando ao estado prevista', () => {
  const sessao = criarArmazenamento();
  const banco = criarBancoCuidado(base, sessao);
  banco.selecionar('mari');

  banco.atualizar(estado => ({
    ...estado,
    registrosDose: {
      ...(estado.registrosDose || {}),
      '12h|Omeprazol': { estado: 'administrado', quem: 'Zé da Manga (Zé)', horario: '12:05', origemExterna: '' }
    }
  }));
  assert.equal(banco.obterEstado().registrosDose['12h|Omeprazol'].estado, 'administrado');

  // Desfazer volta o registro para prevista (inclusive para doses já dadas na base).
  banco.atualizar(estado => ({
    ...estado,
    registrosDose: {
      ...(estado.registrosDose || {}),
      '12h|Omeprazol': { estado: 'prevista' },
      '8h|Losartana': { estado: 'prevista' }
    }
  }));

  const reaberto = criarBancoCuidado(base, sessao);
  reaberto.selecionar('mari');
  assert.equal(reaberto.obterEstado().registrosDose['12h|Omeprazol'].estado, 'prevista');
  assert.equal(reaberto.obterEstado().registrosDose['8h|Losartana'].estado, 'prevista');
});
