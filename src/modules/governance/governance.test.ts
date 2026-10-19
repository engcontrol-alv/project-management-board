import { describe, expect, it } from 'vitest';
import { aChangeRequest, aMeeting } from '@/test/factories';
import { emptyProfile, profileSchema, type GovernanceProfile } from './model/profile';
import { meetingSchema } from './model/records';
import { governanceRag, isReadOnly, staleChangeRequests } from './domain/governance';

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
