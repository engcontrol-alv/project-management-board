import { describe, expect, it } from 'vitest';
import { aChangeRequest, aMeeting } from '@/test/factories';
import { emptyProfile, profileSchema, type GovernanceProfile } from './model/profile';
import { meetingSchema } from './model/records';
import { governanceRag, isReadOnly, staleChangeRequests } from './domain/governance';
import { latePenalty } from './domain/penalty';

function closed(o: Partial<GovernanceProfile['closure']>): GovernanceProfile {
  const p = emptyProfile('proj');
  return {
    ...p,
    charter: { ...p.charter, status: 'Encerrado' },
    closure: { ...p.closure, closureTermSigned: true, actualDate: '2026-06-01', pendingItems: '', ...o },
  };
}

describe('profileSchema', () => {
  it('Encerrado exige termo, data real e nenhuma pendência', () => {
    expect(profileSchema.safeParse(closed({ closureTermSigned: false })).success).toBe(false);
    expect(profileSchema.safeParse(closed({ actualDate: null })).success).toBe(false);
    expect(profileSchema.safeParse(closed({ pendingItems: 'Medição final' })).success).toBe(false);
    expect(profileSchema.safeParse(closed({})).success).toBe(true);
    expect(isReadOnly(closed({}))).toBe(true);
    expect(isReadOnly(emptyProfile('proj'))).toBe(false);
  });
  it('alçada em centavos inteiros', () => {
    const p = emptyProfile('proj');
    expect(
      profileSchema.safeParse({ ...p, procurementPolicy: { ...p.procurementPolicy, approvalLimitCents: 10.5 } })
        .success,
    ).toBe(false);
  });
  it('reunião realizada no futuro é validada no comando, não no schema', () => {
    expect(meetingSchema.safeParse(aMeeting({ status: 'Realizada', date: '2099-01-01' })).success).toBe(true);
  });
});

describe('staleChangeRequests', () => {
  const old = aChangeRequest({ status: 'Solicitada', requestDate: '2026-01-01' });
  it('mudanças pendentes há mais de N dias', () => {
    expect(staleChangeRequests([old], '2026-01-17', 15)).toHaveLength(1);
    expect(staleChangeRequests([old], '2026-01-16', 15)).toHaveLength(0);
    expect(staleChangeRequests([{ ...old, status: 'Aprovada' }], '2026-03-01', 15)).toHaveLength(0);
    expect(staleChangeRequests([{ ...old, status: 'Em análise' }], '2026-03-01', 15)).toHaveLength(1);
  });
  it('governanceRag', () => {
    expect(governanceRag(0).rag).toBe('verde');
    expect(governanceRag(1).rag).toBe('amarelo');
  });
});

describe('cláusula de multa por atraso (D7)', () => {
  const clause = (o: Partial<GovernanceProfile['latePenalty']> = {}): GovernanceProfile => {
    const p = emptyProfile('proj');
    return {
      ...p,
      latePenalty: { ...p.latePenalty, enabled: true, ratePct: 0.1, period: 'Diário', base: 'Valor do contrato', contractValueCents: 150_000_000, capPct: 10, ...o },
    };
  };
  const issues = (p: GovernanceProfile) => {
    const r = profileSchema.safeParse(p);
    return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  };

  it('desativada por padrão e válida com campos vazios', () => {
    const p = emptyProfile('proj');
    expect(p.latePenalty).toEqual({
      enabled: false, ratePct: null, period: 'Diário', base: 'Valor do contrato', contractValueCents: null, capPct: null, notes: '',
    });
    expect(issues(p)).toEqual([]);
  });

  it('ativada exige % > 0; base contrato ou teto exigem o valor do contrato; teto até 100%', () => {
    expect(issues(clause())).toEqual([]);
    expect(issues(clause({ ratePct: null }))).toEqual(['latePenalty.ratePct: informe o percentual da multa por período']);
    expect(issues(clause({ contractValueCents: null }))).toEqual(['latePenalty.contractValueCents: informe o valor do contrato']);
    expect(issues(clause({ base: 'Valor do marco', capPct: null, contractValueCents: null }))).toEqual([]);
    expect(issues(clause({ capPct: 120 }))).toEqual(['latePenalty.capPct: teto deve ficar entre 0% e 100%']);
  });

  it('diário: 0,1% × 4 dias sobre R$ 1.500.000,00 = R$ 6.000,00', () => {
    const r = latePenalty(clause().latePenalty, [{ id: 'M2', delayDays: 4, baseCents: 150_000_000 }]);
    expect(r.items).toEqual([{ id: 'M2', delayDays: 4, periods: 4, penaltyCents: 600_000 }]);
    expect(r.totalCents).toBe(600_000);
    expect(r.capped).toBe(false);
  });

  it('semanal conta semana ou fração; sem atraso = 0', () => {
    const r = latePenalty(clause({ period: 'Semanal', ratePct: 0.5 }).latePenalty, [
      { id: 'M2', delayDays: 8, baseCents: 100_000_000 },
      { id: 'M3', delayDays: 0, baseCents: 100_000_000 },
    ]);
    expect(r.items.map((i) => [i.periods, i.penaltyCents])).toEqual([[2, 1_000_000], [0, 0]]);
  });

  it('teto em % do valor do contrato limita o total', () => {
    const r = latePenalty(clause({ ratePct: 1, capPct: 10 }).latePenalty, [{ id: 'M2', delayDays: 30, baseCents: 150_000_000 }]);
    expect(r.items[0]?.penaltyCents).toBe(45_000_000);
    expect(r.capCents).toBe(15_000_000);
    expect(r.totalCents).toBe(15_000_000);
    expect(r.capped).toBe(true);
  });
});
