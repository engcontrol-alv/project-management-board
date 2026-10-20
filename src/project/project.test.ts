import { describe, expect, it } from 'vitest';
import { aPackage } from '@/test/factories';
import { aSnapshot } from '@/test/builders';
import { defaultConfig, resolveConfig, setModuleEnabled } from './config';
import { applyChangeset } from './changeset';
import { migrateExport, UnsupportedVersionError } from './migrations';
import { ALL_COLLECTIONS, getCollection, manifestOf, MANIFESTS } from './registry';
import type { Baseline } from './baseline';

describe('registry', () => {
  it('tabelas derivadas do manifest, únicas', () => {
    for (const c of ALL_COLLECTIONS) expect(c.table).toBe(`${c.module}_${c.name}`);
    expect(new Set(ALL_COLLECTIONS.map((c) => c.table)).size).toBe(ALL_COLLECTIONS.length);
  });
  it('todo vínculo aponta para coleção existente e restrição declarada no alvo', () => {
    for (const c of ALL_COLLECTIONS)
      for (const r of c.refs) {
        expect(getCollection(r.target.module, r.target.collection), `${c.table}.${r.field}`).toBeDefined();
        if (r.constraint) expect(manifestOf(r.target.module)?.constraints[r.constraint]).toBeTypeOf('function');
      }
  });
  it('nada de Processos', () => {
    const text = JSON.stringify(
      Object.values(MANIFESTS).map((m) => ({
        label: m.label,
        collections: m.collections.map((c) => [c.name, c.label, c.table]),
        constraints: Object.keys(m.constraints),
      })),
    );
    expect(text).not.toMatch(/process/i);
  });
});

describe('resolveConfig', () => {
  it('padrão: todos ligados, sem avisos', () => {
    const r = resolveConfig(defaultConfig());
    expect(Object.values(r.enabled).every(Boolean)).toBe(true);
    expect(r.settings.schedule.milestoneToleranceDays).toBe(5);
    expect(r.settings.governance.staleChangeDays).toBe(15);
    expect(r.warnings).toEqual([]);
  });
  it('settings inválidos voltam ao padrão com aviso', () => {
    const cfg = defaultConfig();
    cfg.modules.schedule = { enabled: true, settings: { milestoneToleranceDays: 'x' } };
    const r = resolveConfig(cfg);
    expect(r.settings.schedule.milestoneToleranceDays).toBe(5);
    expect(r.warnings).toHaveLength(1);
  });
  it('os 7 domínios ligados com os parâmetros padrão da etapa 2', () => {
    const r = resolveConfig(defaultConfig());
    expect(Object.keys(r.enabled)).toEqual(['governance', 'scope', 'schedule', 'resources', 'finances', 'risks', 'stakeholders']);
    expect(r.settings.finances.baseCurrency).toBe('BRL');
    expect(r.settings.risks.scale).toBe(3);
    expect(r.settings.resources.overallocationRedPct).toBe(120);
    expect(r.settings.stakeholders.supplierCommittedThresholdCents).toBe(10_000_000);
  });
  it('Finanças, Riscos e Recursos não arrastam outros módulos ao desligar', () => {
    for (const id of ['finances', 'risks', 'resources'] as const) {
      const r = resolveConfig(setModuleEnabled(defaultConfig(), id, false));
      expect(Object.entries(r.enabled).filter(([, on]) => !on).map(([k]) => k)).toEqual([id]);
    }
  });
  it('Governança sempre ligada', () => {
    const cfg = defaultConfig();
    cfg.modules.governance = { enabled: false, settings: {} };
    expect(resolveConfig(cfg).enabled.governance).toBe(true);
  });
  it('Cronograma exige Escopo nos dois sentidos', () => {
    const off = setModuleEnabled(defaultConfig(), 'scope', false);
    expect(off.modules.scope?.enabled).toBe(false);
    expect(off.modules.schedule?.enabled).toBe(false);
    const on = setModuleEnabled(off, 'schedule', true);
    expect(on.modules.scope?.enabled).toBe(true);
    expect(on.modules.schedule?.enabled).toBe(true);
    expect(setModuleEnabled(defaultConfig(), 'governance', false).modules.governance?.enabled).toBe(true);
  });
});

describe('applyChangeset', () => {
  it('put, delete, appendBaseline e project sem mutar o original', () => {
    const s = aSnapshot().withPackage(aPackage({ id: 'A' })).build();
    const frozen = structuredClone(s);
    const b = { id: 'b1', version: 1 } as unknown as Baseline;
    const next = applyChangeset(s, {
      project: { ...s.project, statusDate: '2026-02-01' },
      puts: [{ table: 'scope_wbs', value: aPackage({ id: 'B' }) }],
      deletes: [{ table: 'scope_wbs', id: 'A' }],
      appendBaseline: b,
    });
    expect(Object.keys(next.scope.wbs)).toEqual(['B']);
    expect(next.baselines).toEqual([b]);
    expect(next.project.statusDate).toBe('2026-02-01');
    expect(s).toEqual(frozen);
  });
});

describe('migrateExport', () => {
  it('versão mais nova é recusada; a versão atual passa intacta', () => {
    expect(() => migrateExport({ schemaVersion: 3 })).toThrow(UnsupportedVersionError);
    try {
      migrateExport({ schemaVersion: 3 });
    } catch (e) {
      expect((e as UnsupportedVersionError).found).toBe(3);
    }
    const current = { schemaVersion: 2 };
    expect(migrateExport(current)).toBe(current);
  });
});
