import { describe, expect, it } from 'vitest';
import v1 from './__fixtures__/export-v1.json';
import { resolveConfig } from './config';
import { migrateExport, migrateRows, SCHEMA_VERSION } from './migrations';
import { parseExport, toExport } from './serialization';

describe('migração v1 → v2 (arquivo)', () => {
  it('fixture dourada v1 importa: partes sem análise, finanças vazias, contadores preservados', () => {
    const r = parseExport(structuredClone(v1));
    if (!r.ok) throw new Error(r.error.message);
    const s = r.value;
    expect(SCHEMA_VERSION).toBe(2);
    expect(Object.values(s.stakeholders.parties).every((p) => p.analysis === null)).toBe(true);
    expect(Object.keys(s.stakeholders.parties)).toHaveLength(v1.data.stakeholders_parties.length);
    expect(s.finances.procurements).toEqual({});
    expect(s.risks.risks).toEqual({});
    expect(s.project.counters).toEqual(v1.project.counters);
    expect(s.project.schemaVersion).toBe(2);
    expect(resolveConfig(s.project.config).warnings).toEqual([]);
  });

  it('exportar o resultado gera v2 e o round-trip é idêntico', () => {
    const r = parseExport(structuredClone(v1));
    if (!r.ok) throw new Error(r.error.message);
    const file = toExport(r.value, '2026-10-19T00:00:00.000Z');
    expect(file.schemaVersion).toBe(2);
    const again = parseExport(JSON.parse(JSON.stringify(file)));
    expect(again.ok && again.value).toEqual(r.value);
  });

  it('versão mais nova é recusada com a mensagem do SPEC', () => {
    expect(() => migrateExport({ ...v1, schemaVersion: 3 })).toThrow(
      'O arquivo foi gerado por uma versão mais nova da aplicação (versão de dados 3; suportada até 2).',
    );
  });

  it('migrateRows é idempotente e só toca a tabela de partes', () => {
    const rows = [{ id: 'p', kind: 'Pessoa' }, { id: 'q', kind: 'Pessoa', analysis: { power: 'Alto' } }];
    expect(migrateRows('stakeholders_parties', rows, 1)).toEqual([
      { id: 'p', kind: 'Pessoa', analysis: null },
      { id: 'q', kind: 'Pessoa', analysis: { power: 'Alto' } },
    ]);
    expect(migrateRows('scope_wbs', rows, 1)).toBe(rows);
    expect(migrateRows('stakeholders_parties', rows, 2)).toBe(rows);
  });
});
