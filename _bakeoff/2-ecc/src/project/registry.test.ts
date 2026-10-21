import { ALL_COLLECTIONS, MANIFESTS, collectionByTable, getCollection } from './registry';
import * as stakeholders from '@/modules/stakeholders';
import * as scope from '@/modules/scope';
import * as schedule from '@/modules/schedule';
import * as governance from '@/modules/governance';

describe('MANIFESTS', () => {
  it('tabelas seguem module_name e são únicas', () => {
    for (const c of ALL_COLLECTIONS) expect(c.table).toBe(`${c.module}_${c.name}`);
    expect(new Set(ALL_COLLECTIONS.map((c) => c.table)).size).toBe(ALL_COLLECTIONS.length);
  });

  it('todo vínculo aponta para coleção e predicado existentes', () => {
    for (const c of ALL_COLLECTIONS) {
      for (const ref of c.refs) {
        const target = getCollection(ref.target.module, ref.target.collection);
        expect(target, `${c.table}.${ref.field}`).toBeDefined();
        if (ref.constraint) {
          const m = MANIFESTS[ref.target.module as keyof typeof MANIFESTS];
          expect(m.constraints[ref.constraint], `${c.table}.${ref.field}`).toBeTypeOf('function');
        }
      }
    }
  });

  it('collectionByTable', () => {
    expect(collectionByTable('scope_wbs')?.name).toBe('wbs');
    expect(collectionByTable('nada')).toBeUndefined();
  });

  it('não existe Processo em coleções, enumerações ou rótulos', () => {
    const texts: string[] = [];
    for (const m of Object.values(MANIFESTS)) {
      texts.push(m.id, m.label);
      for (const c of m.collections) texts.push(c.name, c.table, c.label, ...c.refs.map((r) => r.label));
    }
    for (const mod of [stakeholders, scope, schedule, governance]) {
      for (const v of Object.values(mod)) if (Array.isArray(v)) texts.push(...v.filter((x) => typeof x === 'string'));
    }
    expect(texts.filter((t) => /process/i.test(t))).toEqual([]);
  });
});
