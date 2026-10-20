import { describe, expect, it } from 'vitest';
import { expectedValue, exposure, riskMatrix } from './domain/exposure';
import { risksRag } from './domain/rag';
import { riskSchema, type Risk } from './model/risk';
import { risksManifest } from './manifest';

const settings = risksManifest.defaultSettings;

const risk = (o: Partial<Risk> = {}): Risk => ({
  id: 'r1' as Risk['id'],
  code: 'R-001',
  title: 'Atraso na importação do CLP',
  nature: 'Ameaça',
  category: 'Fornecedor/Aquisição',
  description: '',
  rootCause: '',
  probability: 2,
  impact: 3,
  responseType: null,
  responseAction: '',
  ownerId: null,
  status: 'Identificado',
  nextReview: null,
  notes: '',
  probabilityPct: null,
  costImpactCents: null,
  scheduleImpactDays: null,
  workPackageIds: [],
  milestoneIds: [],
  deliverableIds: [],
  procurementIds: [],
  partyIds: [],
  ...o,
});

describe('exposição 3×3', () => {
  it('pontuação e faixas', () => {
    expect(exposure(risk({ probability: 3, impact: 3 }), settings)).toEqual({ score: 9, band: 'Crítico' });
    expect(exposure(risk({ probability: 2, impact: 3 }), settings)).toEqual({ score: 6, band: 'Alto' });
    expect(exposure(risk({ probability: 2, impact: 2 }), settings)).toEqual({ score: 4, band: 'Moderado' });
    expect(exposure(risk({ probability: 1, impact: 2 }), settings)).toEqual({ score: 2, band: 'Baixo' });
  });
  it('sem P ou I = Não avaliado, fora da matriz', () => {
    const r = risk({ probability: null });
    expect(exposure(r, settings)).toBe('Não avaliado');
    const m = riskMatrix([r, risk({ id: 'r2' as Risk['id'], probability: 3, impact: 1 })]);
    expect(m.unassessed).toEqual(['r1']);
    expect(m.cells['3-1']).toEqual(['r2']);
  });
  it('valor esperado só para ameaças', () => {
    expect(expectedValue(risk({ probabilityPct: 30, costImpactCents: 100_000 }))).toBe(30_000);
    expect(expectedValue(risk({ nature: 'Oportunidade', probabilityPct: 30, costImpactCents: 100_000 }))).toBeNull();
    expect(expectedValue(risk())).toBeNull();
  });
});

describe('riskSchema', () => {
  it('resposta coerente com ameaça/oportunidade', () => {
    expect(riskSchema.safeParse(risk({ responseType: 'Explorar' })).success).toBe(false);
    expect(riskSchema.safeParse(risk({ responseType: 'Mitigar' })).success).toBe(true);
    expect(riskSchema.safeParse(risk({ nature: 'Oportunidade', responseType: 'Explorar' })).success).toBe(true);
  });
  it('Em mitigação exige tipo de resposta e ação', () => {
    const r = riskSchema.safeParse(risk({ status: 'Em mitigação' }));
    expect(r.success ? '' : r.error.issues[0]?.message).toBe('Em mitigação exige tipo de resposta e ação');
    expect(riskSchema.safeParse(risk({ status: 'Em mitigação', responseType: 'Mitigar', responseAction: 'Pedido antecipado' })).success).toBe(true);
  });
  it('probabilidade % entre 0 e 100', () => {
    expect(riskSchema.safeParse(risk({ probabilityPct: 120 })).success).toBe(false);
  });
});

describe('risksRag', () => {
  it('faixas do SPEC §9.1', () => {
    expect(risksRag([risk({ probability: 2, impact: 3 })], settings).rag).toBe('amarelo');
    expect(
      risksRag([risk({ probability: 3, impact: 3, status: 'Encerrado' }), risk({ id: 'r2' as Risk['id'], probability: 2, impact: 2 })], settings).rag,
    ).toBe('verde');
    expect(risksRag([risk({ probability: 1, impact: 1, status: 'Materializado' })], settings).rag).toBe('vermelho');
    expect(risksRag([risk({ probability: 3, impact: 3 })], settings).rag).toBe('vermelho');
    expect(risksRag([], settings)).toEqual({ rag: 'n/a', reason: 'Nenhum risco registrado' });
  });
});
