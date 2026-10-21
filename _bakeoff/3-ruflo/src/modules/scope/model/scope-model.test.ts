import { describe, expect, it } from 'vitest';
import { aDocument, aGroup, aPackage, aPhysical, aRequirement } from '@/test/factories';
import { wbsNodeSchema } from './wbs';
import { requirementSchema } from './requirement';
import { deliverableSchema, PHYSICAL_TYPES, TEST_STATUSES } from './deliverable';
import { effectiveTemplate } from '../domain/deliverables';
import { acceptanceIssues, defaultTestStatus } from '../domain/acceptance';

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

describe('TAF/FAT e TAC/SAT (D3, D5)', () => {
  const msg = (v: unknown) => {
    const r = deliverableSchema.safeParse(v);
    return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  };
  it('status exatos e tipo Software de CLP/IHM', () => {
    expect(TEST_STATUSES).toEqual(['Não Aplicável', 'Pendente', 'Aprovado', 'Aprovado com Ressalvas', 'Reprovado']);
    expect(PHYSICAL_TYPES).toContain('Software de CLP/IHM');
    expect(msg(aPhysical({ type: 'Software de CLP/IHM', fatStatus: 'Pendente', satStatus: 'Pendente' }))).toEqual([]);
  });
  it('teste executado exige data; não aplicável não tem data; pendente aceita data prevista', () => {
    expect(msg(aPhysical({ fatStatus: 'Aprovado' }))).toEqual(['fatDate: TAF/FAT Aprovado exige a data do teste']);
    expect(msg(aPhysical({ satStatus: 'Reprovado' }))).toEqual(['satDate: TAC/SAT Reprovado exige a data do teste']);
    expect(msg(aPhysical({ fatStatus: 'Aprovado com Ressalvas', fatDate: '2026-10-01' }))).toEqual([]);
    expect(msg(aPhysical({ fatDate: '2026-10-01' }))).toEqual(['fatDate: TAF/FAT não aplicável não tem data']);
    expect(msg(aPhysical({ satStatus: 'Pendente', satDate: '2026-12-01' }))).toEqual([]);
  });
  it('documentação não tem campos de teste', () => {
    expect(deliverableSchema.safeParse({ ...aDocument(), fatStatus: 'Pendente' }).success).toBe(false);
  });
  it('equipamento, painel e software começam Pendente; os demais Não Aplicável', () => {
    expect(['Equipamento', 'Painel/Sistema', 'Software de CLP/IHM'].map(defaultTestStatus)).toEqual(['Pendente', 'Pendente', 'Pendente']);
    expect(['Treinamento', 'Instalação/Montagem', 'Outro'].map(defaultTestStatus)).toEqual(['Não Aplicável', 'Não Aplicável', 'Não Aplicável']);
  });
});

describe('acceptanceIssues (D4)', () => {
  it('aceito pelo cliente exige TAF e TAC aprovados', () => {
    expect(acceptanceIssues(aPhysical({ status: 'Aceito pelo cliente', fatStatus: 'Aprovado', fatDate: '2026-09-01', satStatus: 'Reprovado', satDate: '2026-10-01' }))).toEqual([
      { test: 'TAC/SAT', status: 'Reprovado', severity: 'vermelho' },
    ]);
    expect(acceptanceIssues(aPhysical({ status: 'Aceito pelo cliente', fatStatus: 'Pendente', satStatus: 'Pendente' }))).toEqual([
      { test: 'TAF/FAT', status: 'Pendente', severity: 'amarelo' },
      { test: 'TAC/SAT', status: 'Pendente', severity: 'amarelo' },
    ]);
    expect(
      acceptanceIssues(aPhysical({ status: 'Aceito pelo cliente', fatStatus: 'Aprovado com Ressalvas', fatDate: '2026-09-01', satStatus: 'Aprovado', satDate: '2026-10-01' })),
    ).toEqual([]);
  });
  it('concluído (entregue) exige o TAF; o TAC ainda pode estar pendente em campo', () => {
    expect(acceptanceIssues(aPhysical({ status: 'Concluído', fatStatus: 'Pendente', satStatus: 'Pendente' }))).toEqual([
      { test: 'TAF/FAT', status: 'Pendente', severity: 'amarelo' },
    ]);
    expect(acceptanceIssues(aPhysical({ status: 'Concluído', fatStatus: 'Aprovado', fatDate: '2026-09-01', satStatus: 'Pendente' }))).toEqual([]);
  });
  it('não aplicável, em execução e documentação nunca geram pendência', () => {
    expect(acceptanceIssues(aPhysical({ status: 'Aceito pelo cliente' }))).toEqual([]);
    expect(acceptanceIssues(aPhysical({ status: 'Em execução', fatStatus: 'Reprovado', fatDate: '2026-09-01' }))).toEqual([]);
    expect(acceptanceIssues(aDocument({ status: 'Aprovado' }))).toEqual([]);
  });
});
