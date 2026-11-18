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

function formatarEventoIcs(item) {
  const temHora = /^\d{2}:\d{2}$/.test(String(item.hora || '').trim());
  const dataLimpa = item.dia.replaceAll('-', '');
  if (temHora) {
    const [hh, mm] = item.hora.split(':').map(Number);
    const [ano, mes, data] = item.dia.split('-').map(Number);
    const fim = new Date(Date.UTC(ano, mes - 1, data, hh + 1, mm)).toISOString().slice(0, 19).replace(/[-:]/g, '');
    return {
      dtstart: `DTSTART;TZID=America/Sao_Paulo:${dataLimpa}T${item.hora.replace(':', '')}00`,
      dtend: `DTEND;TZID=America/Sao_Paulo:${fim}`
    };
  }
  const [ano, mes, data] = item.dia.split('-').map(Number);
  const proximoDia = new Date(Date.UTC(ano, mes - 1, data + 1)).toISOString().slice(0, 10).replaceAll('-', '');
  return {
    dtstart: `DTSTART;VALUE=DATE:${dataLimpa}`,
    dtend: `DTEND;VALUE=DATE:${proximoDia}`
  };
}

test('salva compromisso com horário opcional sem afetar o outro perfil', () => {
  const sessao = criarArmazenamento();
  const banco = criarBancoCuidado(base, sessao);

  banco.atualizar(estado => ({
    ...estado,
    events: [
      ...estado.events,
      { id: 'evt-sem-hora', titulo: 'Exame de sangue', dia: '2026-11-12', hora: '', local: 'Laboratório', acompanhante: '' }
    ]
  }));

  const reaberto = criarBancoCuidado(base, sessao);
  assert.equal(reaberto.obterEstado().events.length, 1);
  assert.equal(reaberto.obterEstado().events[0].hora, '');

  reaberto.selecionar('mari');
  assert.equal(reaberto.obterEstado().events.some(evt => evt.id === 'evt-sem-hora'), false);
});

test('exportação ICS gera dia inteiro para compromisso sem hora e intervalo com hora', () => {
  const semHora = formatarEventoIcs({ dia: '2026-11-30', hora: '' });
  assert.equal(semHora.dtstart, 'DTSTART;VALUE=DATE:20261130');
  assert.equal(semHora.dtend, 'DTEND;VALUE=DATE:20261201');

  const comHora = formatarEventoIcs({ dia: '2026-11-10', hora: '14:30' });
  assert.equal(comHora.dtstart, 'DTSTART;TZID=America/Sao_Paulo:20261110T143000');
  assert.equal(comHora.dtend, 'DTEND;TZID=America/Sao_Paulo:20261110T153000');
});
