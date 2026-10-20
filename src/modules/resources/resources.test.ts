import { describe, expect, it } from 'vitest';
import { estimatedCost, weeklyLoad } from './domain/load';
import { resourcesRag } from './domain/rag';
import { allocationSchema, type Allocation } from './model/allocation';
import { resourceSchema, type Resource } from './model/resource';

const res = (o: Partial<Resource> = {}): Resource => ({
  id: 'rec1' as Resource['id'],
  code: 'REC-001',
  name: 'Engenheiro de automação',
  type: 'Pessoa interna',
  role: 'Engenharia de automação',
  skill: 'CLP/SCADA',
  skillLevel: 'Sênior',
  capacityPct: 100,
  hourlyRateCents: 15_000,
  personId: null,
  organizationId: null,
  ...o,
});
const alloc = (o: Partial<Allocation> = {}): Allocation => ({
  id: 'a1' as Allocation['id'],
  code: 'ALO-001',
  resourceId: 'rec1' as Allocation['resourceId'],
  workPackageId: null,
  pct: 60,
  start: '2026-10-19',
  finish: '2026-10-23',
  status: 'Ativa',
  ...o,
});
const range = { from: '2026-10-19', to: '2026-11-01' };

describe('carga semanal', () => {
  it('soma as alocações que cruzam a semana e compara com a capacidade', () => {
    const [load] = weeklyLoad([res()], [alloc(), alloc({ id: 'a2' as Allocation['id'], pct: 50 })], range);
    expect(load!.weeks[0]).toEqual({ week: '2026-10-19', demandPct: 110, capacityPct: 100, overPct: 110 });
    expect(load!.weeks[1]).toEqual({ week: '2026-10-26', demandPct: 0, capacityPct: 100, overPct: null });
    const [half] = weeklyLoad([res({ capacityPct: 50 })], [alloc({ pct: 50 })], range);
    expect(half!.weeks[0]!.overPct).toBeNull();
  });
  it('alocação de quarta a segunda cruza duas semanas; encerrada não conta', () => {
    const [load] = weeklyLoad(
      [res()],
      [alloc({ start: '2026-10-21', finish: '2026-10-26', pct: 40 }), alloc({ id: 'a3' as Allocation['id'], status: 'Encerrada' })],
      range,
    );
    expect(load!.weeks.map((w) => w.demandPct)).toEqual([40, 40]);
  });
  it('custo estimado: taxa × horas/dia × dias × %', () => {
    expect(estimatedCost(alloc({ pct: 50 }), res(), 8)).toBe(300_000);
    expect(estimatedCost(alloc(), res({ hourlyRateCents: null }), 8)).toBeNull();
  });
});

describe('resourcesRag', () => {
  const peak = (p: number) => weeklyLoad([res()], [alloc({ pct: p })], range);
  it('faixas do SPEC §9.1', () => {
    expect(resourcesRag(peak(80), { overallocationRedPct: 120 }).rag).toBe('verde');
    expect(resourcesRag(peak(110), { overallocationRedPct: 120 }).rag).toBe('amarelo');
    expect(resourcesRag(peak(130), { overallocationRedPct: 120 }).rag).toBe('vermelho');
    expect(resourcesRag([], { overallocationRedPct: 120 })).toEqual({ rag: 'n/a', reason: 'Nenhuma alocação cadastrada' });
  });
});

describe('schemas', () => {
  it('término não pode ser antes do início', () => {
    const r = allocationSchema.safeParse(alloc({ finish: '2026-10-18' }));
    expect(r.success ? '' : r.error.issues[0]?.message).toBe('término deve ser igual ou posterior ao início');
  });
  it('equipamento não aponta para pessoa', () => {
    expect(resourceSchema.safeParse(res({ type: 'Equipamento', personId: 'p1' as Resource['personId'] })).success).toBe(false);
    expect(resourceSchema.safeParse(res({ capacityPct: 0 })).success).toBe(false);
  });
});
