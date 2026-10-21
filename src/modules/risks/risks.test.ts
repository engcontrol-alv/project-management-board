import { describe, expect, it } from 'vitest';
import { bandOf, expectedValue, exposure, riskMatrix } from './domain/exposure';
import { rescaleRisk } from './domain/rescale';
import { risksRag } from './domain/rag';
import { levelLabels, levelsFor, riskSchema, type Risk } from './model/risk';
import { DEFAULT_BANDS, risksManifest, risksSettingsSchema } from './manifest';

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
  reassess: null,
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

describe('escala 5×5 (SPEC §8.4)', () => {
  const s5 = { ...settings, scale: 5 as const, bands: DEFAULT_BANDS[5] };
  it('níveis e rótulos por escala', () => {
    expect(levelsFor(3)).toEqual([1, 2, 3]);
    expect(levelsFor(5)).toEqual([1, 2, 3, 4, 5]);
    expect(levelLabels(5).probability).toEqual(['Muito baixa', 'Baixa', 'Média', 'Alta', 'Muito alta']);
    expect(levelLabels(5).impact).toEqual(['Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto']);
    expect(levelLabels(3).probability).toEqual(['Baixa', 'Média', 'Alta']);
  });
  it('faixas 5×5 padrão: 1–4 Baixo, 5–9 Moderado, 10–16 Alto, 20–25 Crítico', () => {
    expect([4, 5, 9, 10, 16, 20, 25].map((n) => bandOf(n, DEFAULT_BANDS[5]))).toEqual([
      'Baixo', 'Moderado', 'Moderado', 'Alto', 'Alto', 'Crítico', 'Crítico',
    ]);
    expect(exposure(risk({ probability: 5, impact: 4 }), s5)).toEqual({ score: 20, band: 'Crítico' });
  });
  it('schema: nível até 5 e avaliação original guardada em "reassess"', () => {
    expect(riskSchema.safeParse(risk({ probability: 5, impact: 5 })).success).toBe(true);
    expect(riskSchema.safeParse(risk({ probability: 6 as never })).success).toBe(false);
    expect(riskSchema.safeParse(risk({ reassess: { scale: 3, probability: 2, impact: 3 } })).success).toBe(true);
  });
  it('parâmetros: escala 3 ou 5; faixa Alto abaixo de escala²', () => {
    expect(risksSettingsSchema.safeParse(s5).success).toBe(true);
    expect(risksSettingsSchema.safeParse({ ...s5, scale: 4 }).success).toBe(false);
    expect(risksSettingsSchema.safeParse({ ...s5, bands: { low: 4, moderate: 9, high: 25 } }).success).toBe(false);
    expect(risksSettingsSchema.safeParse({ ...settings, bands: DEFAULT_BANDS[5] }).success).toBe(false);
  });
});

describe('troca de escala sem perda de dados (D1)', () => {
  it('3 → 5 converte os níveis e guarda a avaliação original ("Reavaliar")', () => {
    expect(rescaleRisk(risk({ probability: 1, impact: 2 }), 3, 5)).toMatchObject({
      probability: 1,
      impact: 3,
      reassess: { scale: 3, probability: 1, impact: 2 },
    });
    expect(rescaleRisk(risk({ probability: 3, impact: 3 }), 3, 5)).toMatchObject({ probability: 5, impact: 5 });
  });
  it('5 → 3 agrupa os níveis', () => {
    const r = risk({ probability: 2, impact: 4 });
    expect(rescaleRisk(r, 5, 3)).toMatchObject({ probability: 1, impact: 3, reassess: { scale: 5, probability: 2, impact: 4 } });
    expect(rescaleRisk(risk({ probability: 3, impact: 5 }), 5, 3)).toMatchObject({ probability: 2, impact: 3 });
  });
  it('voltar à escala original antes de reavaliar restaura os níveis exatos', () => {
    for (const p of [1, 2, 3] as const)
      for (const i of [1, 2, 3] as const) {
        const original = risk({ probability: p, impact: i });
        expect(rescaleRisk(rescaleRisk(original, 3, 5), 5, 3)).toEqual(original);
      }
    const five = risk({ probability: 4, impact: 2 });
    expect(rescaleRisk(rescaleRisk(five, 5, 3), 3, 5)).toEqual(five);
  });
  it('risco não avaliado fica intacto; mesma escala não muda nada', () => {
    const r = risk({ probability: null, impact: 2 });
    expect(rescaleRisk(r, 3, 5)).toBe(r);
    const a = risk();
    expect(rescaleRisk(a, 3, 3)).toBe(a);
  });
  it('RAG equivalente nas duas escalas para o risco convertido', () => {
    const s5 = { ...settings, scale: 5 as const, bands: DEFAULT_BANDS[5] };
    for (const [p, i] of [[3, 3], [2, 3], [2, 2], [1, 1]] as const) {
      const r = risk({ probability: p, impact: i });
      expect(risksRag([rescaleRisk(r, 3, 5)], s5).rag).toBe(risksRag([r], settings).rag);
    }
  });
});
