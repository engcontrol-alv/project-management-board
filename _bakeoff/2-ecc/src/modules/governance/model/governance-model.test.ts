import { emptyProfile, profileSchema } from './profile';
import { meetingSchema } from './meeting';
import { normSchema } from './norm';
import { lessonSchema } from './lesson';

const closed = (closure: object) => {
  const p = emptyProfile('proj' as never);
  return { ...p, charter: { ...p.charter, status: 'Encerrado' }, closure: { ...p.closure, ...closure } };
};

describe('profileSchema', () => {
  it('perfil vazio é válido', () => {
    expect(profileSchema.safeParse(emptyProfile('proj' as never)).success).toBe(true);
  });
  it('Encerrado exige termo, data real e pendências vazias', () => {
    const okClosure = { closureTermSigned: true, actualDate: '2026-05-01', pendingItems: '' };
    expect(profileSchema.safeParse(closed(okClosure)).success).toBe(true);
    expect(profileSchema.safeParse(closed({ ...okClosure, closureTermSigned: false })).success).toBe(false);
    expect(profileSchema.safeParse(closed({ ...okClosure, actualDate: null })).success).toBe(false);
    expect(profileSchema.safeParse(closed({ ...okClosure, pendingItems: 'Pagamento final' })).success).toBe(false);
  });
  it('alçada em centavos inteiros', () => {
    const p = emptyProfile('proj' as never);
    const bad = { ...p, procurementPolicy: { ...p.procurementPolicy, approvalLimitCents: 10.5 } };
    expect(profileSchema.safeParse(bad).success).toBe(false);
  });
});

describe('registros simplificados', () => {
  it('reunião Realizada com data futura passa no schema (regra fica no comando)', () => {
    expect(
      meetingSchema.safeParse({
        id: 'm',
        code: 'REU-001',
        type: 'Status semanal',
        date: '2099-01-01',
        participantIds: [],
        decisions: '',
        actions: '',
        status: 'Realizada',
      }).success,
    ).toBe(true);
  });
  it('norma e lição', () => {
    expect(
      normSchema.safeParse({ id: 'n', code: 'NRM-001', standard: 'NR-10', type: 'NR', title: 'Elétrica', notes: '' })
        .success,
    ).toBe(true);
    expect(
      lessonSchema.safeParse({
        id: 'l',
        code: 'LIC-001',
        title: 'Lição',
        type: 'Boa prática',
        category: 'Técnica',
        context: '',
        recommendation: '',
        date: null,
        ownerId: null,
      }).success,
    ).toBe(true);
  });
});
