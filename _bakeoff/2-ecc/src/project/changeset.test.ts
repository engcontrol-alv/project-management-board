import { applyChangeset } from './changeset';
import { getItems } from './snapshot';
import { getCollection } from './registry';
import { aProject, aSnapshot, pkg } from '@/test/builders';
import type { Baseline } from './baseline';

describe('applyChangeset', () => {
  it('put, delete, appendBaseline e project sem mutar o original', () => {
    const s = aSnapshot().wbs(pkg('A', 5)).build();
    const frozen = structuredClone(s);
    const baseline = { id: 'b1', version: 1 } as Baseline;
    const project = { ...aProject(), counters: { MUD: 3 } };
    const next = applyChangeset(s, {
      puts: [{ table: 'scope_wbs', value: pkg('B', 3) }],
      deletes: [{ table: 'scope_wbs', id: 'A' }],
      appendBaseline: baseline,
      project,
    });
    expect(Object.keys(next.scope.wbs)).toEqual(['B']);
    expect(next.baselines.at(-1)).toBe(baseline);
    expect(next.project.counters.MUD).toBe(3);
    expect(s).toEqual(frozen);
  });

  it('put em coleção "one" substitui a entidade', () => {
    const s = aSnapshot().build();
    const profile = { ...s.governance.profile, charter: { ...s.governance.profile.charter, objective: 'X' } };
    const next = applyChangeset(s, { puts: [{ table: 'governance_profile', value: profile }], deletes: [] });
    expect(next.governance.profile.charter.objective).toBe('X');
    expect(Object.keys(getItems(next, getCollection('governance', 'profile')!))).toEqual([profile.id]);
  });

  it('tabela desconhecida lança erro', () => {
    expect(() => applyChangeset(aSnapshot().build(), { puts: [{ table: 'x', value: { id: '1' } }], deletes: [] })).toThrow();
  });
});
