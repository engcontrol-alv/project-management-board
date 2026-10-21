import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { aChangeRequest, aPackage, aPerson, aProcurement, aRequirement } from '@/test/factories';
import { STORES_V1, STORES_V2 } from '@/project/migrations';
import v1 from '@/project/__fixtures__/export-v1.json';
import v2 from '@/project/__fixtures__/export-v2.json';
import { aContext, aSnapshot } from '@/test/builders';
import { upsertEntity } from '@/commands/entities';
import { applyChangeToBaseline, defineInitialBaseline } from '@/commands/baseline';
import { DexieProjectRepository } from './DexieProjectRepository';

let n = 0;
const uniqueName = () => `pmb-test-${Date.now()}-${++n}`;
const listed = async (name: string) => (await indexedDB.databases()).some((d) => d.name === name);

const snapshot = () =>
  aSnapshot()
    .withParty(aPerson())
    .withPackage(aPackage({ id: 'A', duration: 5 }))
    .withRequirement(aRequirement({ ownerId: 'p1' as never }))
    .build();

describe('DexieProjectRepository', () => {
  it('Review Focus 1: construir e consultar exists() não cria o banco', async () => {
    const name = uniqueName();
    const repo = new DexieProjectRepository(name);
    expect(await repo.exists()).toBe(false);
    expect(await listed(name)).toBe(false);
  });

  it('replaceAll e loadSnapshot fazem round-trip', async () => {
    const repo = new DexieProjectRepository(uniqueName());
    const s = snapshot();
    await repo.replaceAll(s);
    expect(await repo.exists()).toBe(true);
    const loaded = await repo.loadSnapshot();
    expect(loaded.status).toBe('pronto');
    if (loaded.status === 'pronto') expect(loaded.snapshot).toEqual(s);
  });

  it('commit grava o registro e os contadores', async () => {
    const repo = new DexieProjectRepository(uniqueName());
    await repo.replaceAll(snapshot());
    const r = await repo.commit(upsertEntity('scope', 'changeRequests', aChangeRequest({ code: '' })), aContext());
    expect(r.ok).toBe(true);
    const loaded = await repo.loadSnapshot();
    if (loaded.status !== 'pronto') throw new Error(loaded.status);
    expect(loaded.snapshot.scope.changeRequests['cr1' as never]?.code).toBe('MUD-001');
    expect(loaded.snapshot.project.counters.MUD).toBe(1);
  });

  it('Review Focus 5: gravação inválida não altera nada', async () => {
    const repo = new DexieProjectRepository(uniqueName());
    await repo.replaceAll(snapshot());
    const before = await repo.loadSnapshot();
    const r = await repo.commit(
      upsertEntity('scope', 'requirements', aRequirement({ id: 'r2' as never, code: '', ownerId: 'nada' as never })),
      aContext(),
    );
    expect(r.ok).toBe(false);
    expect(await repo.loadSnapshot()).toEqual(before);
  });

  it('Review Focus 5: rebaseline cuja mudança falha no schema não grava LB nova', async () => {
    const name = uniqueName();
    const repo = new DexieProjectRepository(name);
    await repo.replaceAll(snapshot());
    expect((await repo.commit(defineInitialBaseline(), aContext())).ok).toBe(true);
    // Mudança adulterada: Aprovada sem aprovador nem data da decisão.
    const raw = new Dexie(name);
    await raw.open();
    await raw.table('scope_changeRequests').put({ ...aChangeRequest({ status: 'Aprovada' }), projectId: 'proj-1' });
    raw.close();
    const r = await repo.commit(applyChangeToBaseline('cr1' as never), aContext());
    expect(r.ok).toBe(false);
    const check = new Dexie(name);
    await check.open();
    expect(await check.table('core_baselines').count()).toBe(1);
    expect((await check.table('scope_changeRequests').get('cr1')).status).toBe('Aprovada');
    check.close();
  });

  it('registro inválido gravado direto → corrompido', async () => {
    const name = uniqueName();
    const repo = new DexieProjectRepository(name);
    await repo.replaceAll(snapshot());
    const raw = new Dexie(name);
    await raw.open();
    await raw.table('scope_wbs').put({ id: 'X', projectId: 'proj-1', name: 'quebrado' });
    raw.close();
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
    await repo.replaceAll(snapshot());
    await repo.clearAll();
    expect(await repo.exists()).toBe(false);
    expect(await listed(name)).toBe(false);
  });

  it('Review Focus 1: banco criado na v1 abre na v2 com os dados migrados', async () => {
    const name = uniqueName();
    const old = new Dexie(name);
    old.version(1).stores(STORES_V1);
    await old.open();
    const pid = v1.project.id;
    await old.table('core_projects').put(v1.project);
    for (const [table, rows] of Object.entries(v1.data))
      await old.table(table).bulkPut((rows as { id: string }[]).map((r) => ({ ...r, projectId: pid })));
    old.close();

    const repo = new DexieProjectRepository(name);
    const loaded = await repo.loadSnapshot();
    if (loaded.status !== 'pronto') throw new Error(JSON.stringify(loaded));
    const parties = Object.values(loaded.snapshot.stakeholders.parties);
    expect(parties).toHaveLength(v1.data.stakeholders_parties.length);
    expect(parties.every((p) => p.analysis === null)).toBe(true);
    expect(loaded.snapshot.project.schemaVersion).toBe(3);
    expect(loaded.snapshot.project.config.modules.stakeholders?.settings).toEqual({ supplierCommittedThresholdCents: 10_000_000 });

    const supplier = parties.find((p) => p.kind === 'Organização' && p.roles.includes('Fornecedor'))!;
    const r = await repo.commit(upsertEntity('finances', 'procurements', aProcurement({ id: 'new-ctr' as never, code: '', supplierId: supplier.id })), aContext());
    expect(r.ok ? [] : r.error).toEqual([]);
    const after = await repo.loadSnapshot();
    expect(after.status === 'pronto' && Object.values(after.snapshot.finances.procurements)[0]?.code).toBe('CTR-001');
  });

  it('Review Focus 1 (Etapa 3): banco criado na v2 abre na v3 com os dados migrados', async () => {
    const name = uniqueName();
    const old = new Dexie(name);
    old.version(1).stores(STORES_V1);
    old.version(2).stores(STORES_V2);
    await old.open();
    const pid = v2.project.id;
    await old.table('core_projects').put(v2.project);
    await old.table('core_baselines').bulkPut(v2.baselines.map((b) => ({ ...b, projectId: pid })));
    for (const [table, rows] of Object.entries(v2.data))
      await old.table(table).bulkPut((rows as { id: string }[]).map((r) => ({ ...r, projectId: pid })));
    old.close();

    const loaded = await new DexieProjectRepository(name).loadSnapshot();
    if (loaded.status !== 'pronto') throw new Error(JSON.stringify(loaded));
    const s = loaded.snapshot;
    expect(s.project.schemaVersion).toBe(3);
    expect(Object.values(s.risks.risks).every((r) => r.reassess === null)).toBe(true);
    expect(Object.values(s.scope.deliverables).filter((d) => d.category === 'Entregável físico / serviço').every((d) => d.fatStatus === 'Não Aplicável')).toBe(true);
    expect(s.governance.profile.latePenalty.enabled).toBe(false);
  });
});
