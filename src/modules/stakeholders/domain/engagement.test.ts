import { describe, expect, it } from 'vitest';
import { communicationSchema } from '../model/communication';
import { personSchema, organizationSchema } from '../model/party';
import { communicationStatus, hasEngagementGap, quadrant } from './engagement';

const analysis = {
  interests: 'Prazo do TAF/FAT',
  power: 'Alto',
  interest: 'Alto',
  currentPosture: 'Neutro',
  desiredPosture: 'Apoiador',
  engagementStrategy: 'Reunião quinzenal de diligenciamento',
  relationshipOwnerId: null,
} as const;
const person = { id: 'p1', kind: 'Pessoa', code: '', name: 'Ana', position: '', organizationId: null, contact: '', internal: 'Interno', notes: '' };
const org = { id: 'o1', kind: 'Organização', code: '', name: 'ACME', roles: ['Fornecedor'], taxId: '', country: 'Brasil', contact: '', internal: 'Externo', notes: '' };

describe('análise da parte interessada', () => {
  it('analysis é obrigatório (null = não analisada) e validado', () => {
    expect(personSchema.safeParse(person).success).toBe(false);
    expect(personSchema.safeParse({ ...person, analysis: null }).success).toBe(true);
    expect(organizationSchema.safeParse({ ...org, analysis }).success).toBe(true);
    expect(personSchema.safeParse({ ...person, analysis: { ...analysis, power: 'Médio' } }).success).toBe(false);
  });

  it('quadrante Poder × Interesse', () => {
    expect(quadrant({ power: 'Alto', interest: 'Alto' })).toBe('Gerenciar de perto');
    expect(quadrant({ power: 'Alto', interest: 'Baixo' })).toBe('Manter satisfeito');
    expect(quadrant({ power: 'Baixo', interest: 'Alto' })).toBe('Manter informado');
    expect(quadrant({ power: 'Baixo', interest: 'Baixo' })).toBe('Monitorar');
  });

  it('lacuna de engajamento', () => {
    expect(hasEngagementGap({ currentPosture: 'Neutro', desiredPosture: 'Apoiador' })).toBe(true);
    expect(hasEngagementGap({ currentPosture: 'Apoiador', desiredPosture: 'Apoiador' })).toBe(false);
  });
});

describe('plano de comunicação', () => {
  const com = { id: 'c1', code: '', information: 'Relatório semanal', recipientIds: [], channel: 'E-mail', frequency: 'Semanal', ownerId: null, nextDate: null };
  it('situação pela próxima data', () => {
    expect(communicationStatus({ nextDate: '2026-10-10' }, '2026-10-18')).toBe('Atrasada');
    expect(communicationStatus({ nextDate: '2026-10-18' }, '2026-10-18')).toBe('Em dia');
    expect(communicationStatus({ nextDate: null }, '2026-10-18')).toBe('Sem data');
  });
  it('informação obrigatória; destinatários podem ser vazios', () => {
    expect(communicationSchema.safeParse(com).success).toBe(true);
    const r = communicationSchema.safeParse({ ...com, information: '' });
    expect(r.success ? '' : r.error.issues[0]?.message).toBe('informação é obrigatória');
  });
});
