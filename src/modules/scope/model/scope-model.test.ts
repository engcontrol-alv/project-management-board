import { describe, expect, it } from 'vitest';
import { aChangeRequest, aDocument, aGroup, aPackage, aPhysical, aRequirement } from '@/test/factories';
import { wbsNodeSchema } from './wbs';
import { requirementSchema } from './requirement';
import { deliverableSchema } from './deliverable';
import { changeRequestSchema } from './change-request';
import { effectiveTemplate } from '../domain/deliverables';

const ok = (schema: { safeParse(v: unknown): { success: boolean } }, v: unknown) =>
  schema.safeParse(v).success;

describe('EAP', () => {
  const pkg = aPackage({ id: 'A', duration: 5 });
  it('valida duração e % físico', () => {
    expect(ok(wbsNodeSchema, pkg)).toBe(true);
    expect(ok(wbsNodeSchema, { ...pkg, duration: -1 })).toBe(false);
    expect(ok(wbsNodeSchema, { ...pkg, duration: 2.5 })).toBe(false);
    expect(ok(wbsNodeSchema, { ...pkg, percentComplete: 101 })).toBe(false);
  });
  it('consistência das datas reais e do % físico', () => {
    expect(ok(wbsNodeSchema, { ...pkg, actualFinish: '2026-01-09' })).toBe(false);
    expect(
      ok(wbsNodeSchema, {
        ...pkg,
        actualStart: '2026-01-09',
        actualFinish: '2026-01-08',
        percentComplete: 100,
      }),
    ).toBe(false);
    expect(ok(wbsNodeSchema, { ...pkg, actualStart: '2026-01-05', percentComplete: 100 })).toBe(
      false,
    );
    expect(
      ok(wbsNodeSchema, {
        ...pkg,
        actualStart: '2026-01-05',
        actualFinish: '2026-01-09',
        percentComplete: 80,
      }),
    ).toBe(false);
    expect(
      ok(wbsNodeSchema, {
        ...pkg,
        actualStart: '2026-01-05',
        actualFinish: '2026-01-09',
        percentComplete: 100,
      }),
    ).toBe(true);
  });
  it('agrupador não tem predecessores', () => {
    expect(ok(wbsNodeSchema, aGroup({ id: 'G' }))).toBe(true);
    expect(ok(wbsNodeSchema, aGroup({ id: 'G', predecessorIds: ['A'] }))).toBe(false);
  });
});

describe('Requisito', () => {
  it('Validado exige data da última validação', () => {
    expect(ok(requirementSchema, aRequirement({ validationStatus: 'Validado' }))).toBe(false);
    expect(
      ok(
        requirementSchema,
        aRequirement({ validationStatus: 'Validado', lastValidation: '2026-01-10' }),
      ),
    ).toBe(true);
  });
});

describe('Entregável', () => {
  it('status e tipo dependem da categoria', () => {
    expect(ok(deliverableSchema, aPhysical())).toBe(true);
    expect(ok(deliverableSchema, { ...aPhysical(), status: 'Emitido ao cliente' })).toBe(false);
    expect(ok(deliverableSchema, { ...aDocument(), type: 'Equipamento' })).toBe(false);
    expect(ok(deliverableSchema, { ...aDocument(), category: '' })).toBe(false);
    expect(ok(deliverableSchema, { ...aPhysical(), revision: 'A' })).toBe(false);
  });
  it('template efetivo', () => {
    expect(effectiveTemplate(aDocument({ template: null }), 'Externo (cliente)')).toBe(
      'Externo (cliente)',
    );
    expect(effectiveTemplate(aDocument({ template: 'Interno' }), 'Externo (cliente)')).toBe(
      'Interno',
    );
    expect(effectiveTemplate(aPhysical(), 'Externo (cliente)')).toBeNull();
  });
});

describe('Mudança', () => {
  it('impactos negativos são aceitos; custo em centavos inteiros', () => {
    expect(
      ok(changeRequestSchema, aChangeRequest({ scheduleImpactDays: -5, costImpactCents: -100000 })),
    ).toBe(true);
    expect(ok(changeRequestSchema, aChangeRequest({ costImpactCents: 10.5 }))).toBe(false);
  });
  it('Aprovada e Rejeitada exigem aprovador e data da decisão', () => {
    const decided = { approverId: 'p1' as never, decisionDate: '2026-01-10' };
    expect(ok(changeRequestSchema, aChangeRequest({ status: 'Aprovada', approverId: 'p1' as never }))).toBe(false);
    expect(ok(changeRequestSchema, aChangeRequest({ status: 'Aprovada', decisionDate: '2026-01-10' }))).toBe(false);
    expect(ok(changeRequestSchema, aChangeRequest({ status: 'Rejeitada', approverId: 'p1' as never }))).toBe(false);
    expect(ok(changeRequestSchema, aChangeRequest({ status: 'Aprovada', ...decided }))).toBe(true);
  });
});
