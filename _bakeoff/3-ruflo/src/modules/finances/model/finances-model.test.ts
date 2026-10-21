import { describe, expect, it } from 'vitest';
import { budgetLineSchema } from './budget-line';
import { procurementSchema } from './procurement';
import { financesManifest } from '../manifest';

const line = {
  id: 'l1', code: '', description: 'Mão de obra de engenharia', kind: 'Custo', nature: 'OPEX', category: 'Mão de obra',
  currency: 'BRL', rate: null, budgetedCents: 100000, actualCents: 0, plannedDate: '2026-02-10', actualDate: null,
  status: 'Planejado', workPackageId: null, milestoneId: null, partyId: null, ownerId: null,
};
const proc = {
  id: 'c1', code: '', description: 'CLP redundante', type: 'Produto', nature: 'CAPEX', supplierId: 'o1', origin: 'Nacional',
  country: '', currency: 'BRL', rate: null, workPackageId: null, milestoneId: null, criticality: 'Alta', ownerId: null,
  budgetedCents: 1000000, committedCents: 0, actualCents: 0, contractStatus: 'A solicitar', deliveryStatus: 'Não iniciado',
  requestDate: null, dueDate: null, completionDate: null,
};
const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : (r.error?.issues.map((i) => i.message) ?? []);

describe('linha de orçamento', () => {
  it('válida passa; Realizado exige valor e data reais', () => {
    expect(budgetLineSchema.safeParse(line).success).toBe(true);
    expect(msg(budgetLineSchema.safeParse({ ...line, status: 'Realizado', actualCents: 5000 }))).toContain('Realizado exige valor e data reais');
    expect(budgetLineSchema.safeParse({ ...line, status: 'Realizado', actualCents: 5000, actualDate: '2026-02-11' }).success).toBe(true);
  });
  it('valores negativos e taxa zero são recusados', () => {
    expect(budgetLineSchema.safeParse({ ...line, budgetedCents: -1 }).success).toBe(false);
    expect(budgetLineSchema.safeParse({ ...line, currency: 'USD', rate: 0 }).success).toBe(false);
  });
});

describe('contratação', () => {
  it('válida passa', () => expect(procurementSchema.safeParse(proc).success).toBe(true));
  it('comprometido exige pedido emitido ou contrato', () => {
    expect(msg(procurementSchema.safeParse({ ...proc, committedCents: 100, contractStatus: 'Em cotação' }))).toContain('comprometido exige pedido emitido ou contrato');
    expect(procurementSchema.safeParse({ ...proc, committedCents: 100, contractStatus: 'Pedido emitido' }).success).toBe(true);
  });
  it('Recebido exige data; Importado exige país', () => {
    expect(msg(procurementSchema.safeParse({ ...proc, deliveryStatus: 'Recebido' }))).toContain('Recebido exige a data de recebimento/conclusão');
    expect(msg(procurementSchema.safeParse({ ...proc, origin: 'Importado' }))).toContain('informe o país de origem');
  });
  it('status de entrega coerente com o tipo', () => {
    expect(procurementSchema.safeParse({ ...proc, type: 'Serviço', deliveryStatus: 'Em trânsito' }).success).toBe(false);
    expect(procurementSchema.safeParse({ ...proc, type: 'Serviço', deliveryStatus: 'Serviço em execução' }).success).toBe(true);
    expect(procurementSchema.safeParse({ ...proc, deliveryStatus: 'Serviço concluído', completionDate: '2026-03-01' }).success).toBe(false);
  });
  it('fornecedor é obrigatório e restrito a organizações fornecedoras', () => {
    const ref = financesManifest.collections.find((c) => c.name === 'procurements')!.refs.find((r) => r.field === 'supplierId');
    expect(ref).toMatchObject({ required: true, constraint: 'isSupplierOrganization', target: { module: 'stakeholders', collection: 'parties' } });
  });
});
