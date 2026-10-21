import { wbsNodeSchema } from './wbs';
import { requirementSchema } from './requirement';
import { deliverableSchema } from './deliverable';
import { changeRequestSchema } from './change-request';

const pkg = {
  id: 'a',
  code: '1',
  name: 'A',
  parentId: null,
  kind: 'Pacote de trabalho',
  duration: 5,
  predecessorIds: [],
  startNoEarlierThan: null,
  actualStart: null,
  actualFinish: null,
  percentComplete: 0,
  ownerId: null,
  phase: '',
};
const ok = (s: { safeParse(v: unknown): { success: boolean } }, v: unknown) => s.safeParse(v).success;

describe('EAP', () => {
  it('valida duração e percentual', () => {
    expect(ok(wbsNodeSchema, pkg)).toBe(true);
    expect(ok(wbsNodeSchema, { ...pkg, duration: -1 })).toBe(false);
    expect(ok(wbsNodeSchema, { ...pkg, duration: 2.5 })).toBe(false);
    expect(ok(wbsNodeSchema, { ...pkg, percentComplete: 101 })).toBe(false);
  });
  it('consistência das datas reais e %', () => {
    expect(ok(wbsNodeSchema, { ...pkg, actualFinish: '2026-01-10', percentComplete: 100 })).toBe(false);
    expect(
      ok(wbsNodeSchema, { ...pkg, actualStart: '2026-01-10', actualFinish: '2026-01-09', percentComplete: 100 }),
    ).toBe(false);
    expect(ok(wbsNodeSchema, { ...pkg, actualStart: '2026-01-05', percentComplete: 100 })).toBe(false);
    expect(
      ok(wbsNodeSchema, { ...pkg, actualStart: '2026-01-05', actualFinish: '2026-01-09', percentComplete: 80 }),
    ).toBe(false);
    expect(
      ok(wbsNodeSchema, { ...pkg, actualStart: '2026-01-05', actualFinish: '2026-01-09', percentComplete: 100 }),
    ).toBe(true);
  });
  it('agrupador não tem predecessores', () => {
    expect(ok(wbsNodeSchema, { ...pkg, kind: 'Agrupador', duration: 0, predecessorIds: ['b'] })).toBe(false);
    expect(ok(wbsNodeSchema, { ...pkg, kind: 'Agrupador', duration: 0 })).toBe(true);
  });
});

const req = {
  id: 'r',
  code: 'REQ-001',
  description: 'Req',
  category: 'Funcional',
  origin: 'Cliente',
  priority: 'Alta',
  validationStatus: 'Não validado',
  fulfillmentStatus: 'Não iniciado',
  acceptanceCriteria: '',
  ownerId: null,
  lastValidation: null,
  deliverableIds: [],
};

describe('Requisito', () => {
  it('Validado exige data da última validação', () => {
    expect(ok(requirementSchema, req)).toBe(true);
    expect(ok(requirementSchema, { ...req, validationStatus: 'Validado' })).toBe(false);
    expect(ok(requirementSchema, { ...req, validationStatus: 'Validado', lastValidation: '2026-01-02' })).toBe(
      true,
    );
  });
});

const baseDel = {
  id: 'd',
  code: 'ENT-001',
  name: 'Memorial',
  workPackageId: null,
  milestoneId: null,
  plannedDate: null,
  actualDate: null,
  ownerId: null,
  clientApproval: false,
};
const doc = {
  ...baseDel,
  category: 'Documentação de engenharia',
  type: 'Memorial descritivo',
  revision: '0',
  template: null,
  status: 'Em elaboração',
};
const physical = { ...baseDel, category: 'Entregável físico / serviço', type: 'Equipamento', status: 'Em execução' };

describe('Entregável', () => {
  it('tipo e status dependem da categoria', () => {
    expect(ok(deliverableSchema, doc)).toBe(true);
    expect(ok(deliverableSchema, physical)).toBe(true);
    expect(ok(deliverableSchema, { ...physical, status: 'Emitido ao cliente' })).toBe(false);
    expect(ok(deliverableSchema, { ...doc, type: 'Equipamento' })).toBe(false);
    expect(ok(deliverableSchema, { ...baseDel, type: 'Outro', status: 'Não iniciado' })).toBe(false);
  });
});

const cr = {
  id: 'c',
  code: 'MUD-001',
  title: 'Troca',
  description: '',
  justification: '',
  requesterId: null,
  requestDate: '2026-01-05',
  categories: ['Escopo'],
  scopeImpact: '',
  affectedWorkPackageIds: [],
  affectedDeliverableIds: [],
  scheduleImpactDays: null,
  costImpactCents: null,
  impactLevel: null,
  status: 'Solicitada',
  approverId: null,
  decisionDate: null,
  implementerId: null,
};

describe('Mudança', () => {
  it('impactos negativos são aceitos; centavos inteiros', () => {
    expect(ok(changeRequestSchema, { ...cr, scheduleImpactDays: -5, costImpactCents: -100000 })).toBe(true);
    expect(ok(changeRequestSchema, { ...cr, costImpactCents: 10.5 })).toBe(false);
  });
  it('Aprovada/Rejeitada exigem decisão', () => {
    expect(ok(changeRequestSchema, { ...cr, status: 'Aprovada', approverId: 'p' })).toBe(false);
    expect(ok(changeRequestSchema, { ...cr, status: 'Aprovada', decisionDate: '2026-01-06' })).toBe(false);
    expect(ok(changeRequestSchema, { ...cr, status: 'Rejeitada', approverId: 'p' })).toBe(false);
    expect(
      ok(changeRequestSchema, { ...cr, status: 'Aprovada', approverId: 'p', decisionDate: '2026-01-06' }),
    ).toBe(true);
  });
});
