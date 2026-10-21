import { describe, expect, it } from 'vitest';
import v1 from './__fixtures__/export-v1.json';
import v2 from './__fixtures__/export-v2.json';
import { resolveConfig } from './config';
import { migrateExport, migrateRows, SCHEMA_VERSION } from './migrations';
import { parseExport, toExport } from './serialization';
import { aChangeRequest } from '@/test/factories';
import { aSnapshot } from '@/test/builders';

describe('migração v1 → v2 (arquivo)', () => {
  it('fixture dourada v1 importa: partes sem análise, finanças vazias, contadores preservados', () => {
    const r = parseExport(structuredClone(v1));
    if (!r.ok) throw new Error(r.error.message);
    const s = r.value;
    expect(SCHEMA_VERSION).toBe(4);
    expect(Object.values(s.stakeholders.parties).every((p) => p.analysis === null)).toBe(true);
    expect(Object.keys(s.stakeholders.parties)).toHaveLength(v1.data.stakeholders_parties.length);
    expect(s.finances.procurements).toEqual({});
    expect(s.risks.risks).toEqual({});
    expect(s.project.counters).toEqual(v1.project.counters);
    expect(s.project.schemaVersion).toBe(4);
    expect(resolveConfig(s.project.config).warnings).toEqual([]);
  });

  it('exportar o resultado gera a versão atual e o round-trip é idêntico', () => {
    const r = parseExport(structuredClone(v1));
    if (!r.ok) throw new Error(r.error.message);
    const file = toExport(r.value, '2026-10-19T00:00:00.000Z');
    expect(file.schemaVersion).toBe(4);
    const again = parseExport(JSON.parse(JSON.stringify(file)));
    expect(again.ok && again.value).toEqual(r.value);
  });

  it('versão mais nova é recusada com a mensagem do SPEC', () => {
    expect(() => migrateExport({ ...v1, schemaVersion: 5 })).toThrow(
      'O arquivo foi gerado por uma versão mais nova da aplicação (versão de dados 5; suportada até 4).',
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
    expect(migrateRows('stakeholders_parties', rows, 1, 2)).toEqual(migrateRows('stakeholders_parties', rows, 1));
  });
});

describe('migração v2 → v3 (D10)', () => {
  it('fixture dourada v2 importa: riscos sem "Reavaliar", testes não aplicáveis, multa desativada', () => {
    const r = parseExport(structuredClone(v2));
    if (!r.ok) throw new Error(r.error.message);
    const s = r.value;
    expect(s.project.schemaVersion).toBe(4);
    const risks = Object.values(s.risks.risks);
    expect(risks).toHaveLength(v2.data.risks_risks.length);
    expect(risks.every((x) => x.reassess === null)).toBe(true);
    const physical = Object.values(s.scope.deliverables).filter((d) => d.category === 'Entregável físico / serviço');
    expect(physical.length).toBeGreaterThan(0);
    for (const d of physical)
      expect(d).toMatchObject({ fatStatus: 'Não Aplicável', fatDate: null, satStatus: 'Não Aplicável', satDate: null });
    const docs = Object.values(s.scope.deliverables).filter((d) => d.category !== 'Entregável físico / serviço');
    expect(docs.every((d) => !('fatStatus' in d))).toBe(true);
    expect(s.governance.profile.latePenalty.enabled).toBe(false);
    expect(s.project.counters).toEqual(v2.project.counters);
  });

  it('v1 passa por todas as etapas até a atual', () => {
    const r = parseExport(structuredClone(v1));
    if (!r.ok) throw new Error(r.error.message);
    expect(r.value.governance.profile.latePenalty.enabled).toBe(false);
  });

  it('migrateRows da v2 só toca riscos, entregáveis e perfil, e é idempotente', () => {
    const risks = [{ id: 'r' }, { id: 'q', reassess: { scale: 3, probability: 1, impact: 1 } }];
    expect(migrateRows('risks_risks', risks, 2)).toEqual([{ id: 'r', reassess: null }, risks[1]]);
    const docs = [{ id: 'd', category: 'Documentação de engenharia' }];
    expect(migrateRows('scope_deliverables', docs, 2)).toEqual(docs);
    expect(migrateRows('scope_wbs', risks, 2)).toBe(risks);
    expect(migrateRows('risks_risks', risks, 3)).toBe(risks);
  });
});

describe('migração v3 → v4: mudanças passam do Escopo para a Governança', () => {
  it('arquivo v3 (tabela scope_changeRequests) importa as mudanças em governance.changeRequests', () => {
    const current = toExport(aSnapshot().withChangeRequest(aChangeRequest({ code: 'MUD-001' })).build(), 'now');
    const { governance_changeRequests: crs, ...rest } = current.data;
    const v3 = { ...current, schemaVersion: 3, project: { ...current.project, schemaVersion: 3 }, data: { ...rest, scope_changeRequests: crs } };
    const r = parseExport(structuredClone(v3));
    if (!r.ok) throw new Error(r.error.message);
    expect(r.value.project.schemaVersion).toBe(SCHEMA_VERSION);
    expect(Object.values(r.value.governance.changeRequests).map((c) => c.code)).toEqual(['MUD-001']);
    expect('changeRequests' in r.value.scope).toBe(false);
  });

  it('v1 e v2 chegam à v4 com as mudanças na Governança', () => {
    for (const file of [v1, v2]) {
      const r = parseExport(structuredClone(file));
      if (!r.ok) throw new Error(r.error.message);
      expect(Object.keys(r.value.governance.changeRequests)).toHaveLength(file.data.scope_changeRequests.length);
      expect(toExport(r.value, 'now').data).not.toHaveProperty('scope_changeRequests');
    }
  });
});
