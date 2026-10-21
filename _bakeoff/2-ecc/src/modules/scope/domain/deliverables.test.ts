import { deliverableProgress, effectiveTemplate } from './deliverables';
import type { Deliverable } from '../model/deliverable';

const doc = (p: object) => ({ category: 'Documentação de engenharia', template: null, ...p }) as Deliverable;

describe('effectiveTemplate', () => {
  it('herda da governança quando null', () => {
    expect(effectiveTemplate(doc({}), 'Externo (cliente)')).toBe('Externo (cliente)');
    expect(effectiveTemplate(doc({ template: 'Interno' }), 'Externo (cliente)')).toBe('Interno');
    expect(effectiveTemplate({ category: 'Entregável físico / serviço' } as Deliverable, 'Interno')).toBeNull();
  });
});

describe('deliverableProgress', () => {
  it('conta concluídos por categoria sem cancelados', () => {
    const p = deliverableProgress([
      doc({ status: 'Aprovado' }),
      doc({ status: 'Cancelado' }),
      { category: 'Entregável físico / serviço', status: 'Em execução' } as Deliverable,
    ]);
    expect(p['Documentação de engenharia']).toEqual({ done: 1, total: 1, percent: 100 });
    expect(p['Entregável físico / serviço']).toEqual({ done: 0, total: 1, percent: 0 });
    expect(p['Documentação de gerenciamento de projeto']).toEqual({ done: 0, total: 0, percent: null });
  });
});
