import Dexie from 'dexie';
import { DexieProjectRepository } from './DexieProjectRepository';
import { buildStores } from './db';
import { MANIFESTS } from '@/project/registry';
import { upsertEntity } from '@/commands/entities';
import { applyChangeToBaseline, defineInitialBaseline } from '@/commands/baseline';
import { aSnapshot, changeRequest, person, pkg, requirement, testCtx } from '@/test/builders';

let n = 0;
const uniqueName = () => `test-db-${Date.now()}-${++n}`;
const dbNames = async () => (await indexedDB.databases()).map((d) => d.name);

describe('buildStores', () => {
  it('uma tabela por coleção, com projectId', () => {
    const stores = buildStores(MANIFESTS);
    expect(stores.core_projects).toBe('id');
    expect(stores.core_baselines).toBe('id, projectId');
    expect(stores.scope_wbs).toBe('id, projectId');
    expect(stores.governance_profile).toBe('id, projectId');
  });
});

describe('DexieProjectRepository', () => {
  it('exists e loadSnapshot não criam o banco', async () => {
    const name = uniqueName();
    const repo = new DexieProjectRepository(name);
    expect(await repo.exists()).toBe(false);
    expect(await repo.loadSnapshot()).toEqual({ status: 'vazio' });
    expect(await dbNames()).not.toContain(name);
  });

  it('replaceAll grava e loadSnapshot devolve o mesmo snapshot', async () => {
    const repo = new DexieProjectRepository(uniqueName());
    const s = aSnapshot().parties(person('P')).wbs(pkg('A', 5)).requirements(requirement('R', { ownerId: 'P' as never })).build();
    await repo.replaceAll(s);
    expect(await repo.exists()).toBe(true);
    expect(await repo.loadSnapshot()).toEqual({ status: 'pronto', snapshot: s });
  });

  it('replaceAll substitui todo o conteúdo anterior', async () => {
    const repo = new DexieProjectRepository(uniqueName());
    await repo.replaceAll(aSnapshot().wbs(pkg('A', 5)).build());
    const other = aSnapshot().wbs(pkg('B', 2)).build();
    await repo.replaceAll(other);
    expect(await repo.loadSnapshot()).toEqual({ status: 'pronto', snapshot: other });
  });

  it('commit grava registro e contadores', async () => {
    const repo = new DexieProjectRepository(uniqueName());
    await repo.replaceAll(aSnapshot().build());
    const r = await repo.commit(upsertEntity('scope', 'changeRequests', { ...changeRequest(''), code: '' }), testCtx());
    expect(r.ok).toBe(true);
    const loaded = await repo.loadSnapshot();
    if (loaded.status !== 'pronto') throw new Error(loaded.status);
    expect(Object.values(loaded.snapshot.scope.changeRequests).map((c) => c.code)).toEqual(['MUD-001']);
    expect(loaded.snapshot.project.counters.MUD).toBe(1);
  });

  it('commit inválido não grava nada', async () => {
    const repo = new DexieProjectRepository(uniqueName());
    await repo.replaceAll(aSnapshot().wbs(pkg('A', 5)).build());
    const before = await repo.loadSnapshot();
    const r = await repo.commit(
      upsertEntity('scope', 'requirements', { ...requirement(''), code: '', ownerId: 'nao-existe' }),
      testCtx(),
    );
    expect(r.ok).toBe(false);
    expect(await repo.loadSnapshot()).toEqual(before);
  });

  it('rebaseline com mudança adulterada não grava LB nova', async () => {
    const repo = new DexieProjectRepository(uniqueName());
    const s = aSnapshot().wbs(pkg('A', 5)).changeRequests(changeRequest('C', { status: 'Aprovada' })).build();
    await repo.replaceAll(s);
    const r = await repo.commit(applyChangeToBaseline('C'), testCtx());
    expect(r.ok).toBe(false);
    const raw = (await repo.readRaw()) as { baselines: unknown[] };
    expect(raw.baselines).toEqual([]);
  });

  it('LB v1 é gravada atomicamente com o projeto', async () => {
    const repo = new DexieProjectRepository(uniqueName());
    await repo.replaceAll(aSnapshot().wbs(pkg('A', 5)).build());
    expect((await repo.commit(defineInitialBaseline(), testCtx())).ok).toBe(true);
    const loaded = await repo.loadSnapshot();
    expect(loaded.status === 'pronto' && loaded.snapshot.baselines.map((b) => b.version)).toEqual([1]);
  });

  it('registro inválido gravado direto → corrompido', async () => {
    const name = uniqueName();
    const repo = new DexieProjectRepository(name);
    await repo.replaceAll(aSnapshot().build());
    const db = new Dexie(name);
    db.version(1).stores(buildStores(MANIFESTS));
    await db.table('scope_wbs').put({ id: 'X', projectId: 'proj-1', duration: -1 });
    db.close();
    const loaded = await repo.loadSnapshot();
    expect(loaded.status).toBe('corrompido');
    if (loaded.status === 'corrompido') {
      expect(loaded.errors.length).toBeGreaterThan(0);
      expect(loaded.raw).toBeTruthy();
    }
  });

  it('clearAll apaga o banco', async () => {
    const name = uniqueName();
    const repo = new DexieProjectRepository(name);
    await repo.replaceAll(aSnapshot().build());
    await repo.clearAll();
    expect(await repo.exists()).toBe(false);
    expect(await dbNames()).not.toContain(name);
  });
});
