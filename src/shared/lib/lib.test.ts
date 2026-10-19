import { describe, expect, it } from 'vitest';
import { addDays, diffDays, formatDateBR, isIsoDate, maxDate } from './dates';
import { formatMoneyBR, parseMoneyBR } from './money';
import { formatPercent, formatRatio } from './format';
import { formatCode, nextWbsCode } from './codes';
import { findCycleInGraph, topologicalOrder } from './graph';

describe('dates', () => {
  it('soma dias em UTC, inclusive viradas de mês, ano bissexto e horário de verão', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-10-18', 1)).toBe('2026-10-19');
    expect(addDays('2026-01-05', -5)).toBe('2025-12-31');
  });
  it('diferença, máximo, validação e formatação', () => {
    expect(diffDays('2026-01-05', '2026-01-14')).toBe(9);
    expect(maxDate('2026-01-05', '2026-03-01', '2026-02-01')).toBe('2026-03-01');
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(formatDateBR('2026-10-17')).toBe('17/10/2026');
    expect(formatDateBR(null)).toBe('—');
  });
});

describe('money', () => {
  it('normaliza entrada pt-BR para centavos', () => {
    expect(parseMoneyBR('R$ 1.234,56')).toBe(123456);
    expect(parseMoneyBR('-10,5')).toBe(-1050);
    expect(parseMoneyBR('1234')).toBe(123400);
    expect(parseMoneyBR('1.234')).toBe(123400);
    expect(parseMoneyBR('abc')).toBeNull();
    expect(parseMoneyBR('')).toBeNull();
  });
  it('formata em reais', () => {
    expect(formatMoneyBR(123456)).toBe('R$ 1.234,56');
  });
});

describe('format', () => {
  it('razões e percentuais pt-BR, n/a para ausentes', () => {
    expect(formatRatio(0.9234)).toBe('0,92');
    expect(formatRatio(null)).toBe('n/a');
    expect(formatRatio(Infinity)).toBe('n/a');
    expect(formatRatio(NaN)).toBe('n/a');
    expect(formatPercent(45.55)).toBe('45,6%');
  });
});

describe('codes', () => {
  it('códigos legíveis e da EAP', () => {
    expect(formatCode('MUD', 3)).toBe('MUD-003');
    expect(formatCode('M', 1234)).toBe('M-1234');
    expect(nextWbsCode([], null)).toBe('1');
    expect(nextWbsCode(['1', '2'], null)).toBe('3');
    expect(nextWbsCode(['1.2.1'], '1.2')).toBe('1.2.2');
  });
});

describe('graph', () => {
  const edges: Record<string, string[]> = { A: [], B: ['A'], C: ['B'] };
  it('sem ciclo e ordem topológica', () => {
    expect(findCycleInGraph<string>(['A', 'B', 'C'], (id) => edges[id] ?? [])).toBeNull();
    expect(topologicalOrder<string>(['C', 'B', 'A'], (id) => edges[id] ?? [])).toEqual(['A', 'B', 'C']);
  });
  it('detecta ciclo', () => {
    const cyc: Record<string, string[]> = { A: ['B'], B: ['A'] };
    const found = findCycleInGraph<string>(['A', 'B'], (id) => cyc[id] ?? []);
    expect(found).toEqual(expect.arrayContaining(['A', 'B']));
  });
});
