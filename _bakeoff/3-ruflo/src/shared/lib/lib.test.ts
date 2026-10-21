import { describe, expect, it, vi } from 'vitest';
import { downloadText } from './download';
import { addDays, diffDays, formatDateBR, isIsoDate, maxDate, monthKey, startOfWeek } from './dates';
import { formatMoneyBR, parseMoneyBR, roundHalfEven, toBaseCents } from './money';
import { formatIndicator, formatPercent, formatRatio } from './format';
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

describe('etapa 2 — dinheiro, semanas e indicadores', () => {
  it('half-even e conversão para a moeda base', () => {
    expect(roundHalfEven(0.5)).toBe(0);
    expect(roundHalfEven(1.5)).toBe(2);
    expect(roundHalfEven(2.5)).toBe(2);
    expect(roundHalfEven(-1.5)).toBe(-2);
    expect(roundHalfEven(2.4999)).toBe(2);
    expect(toBaseCents(1_000_000, 5.1234)).toBe(5_123_400);
    expect(toBaseCents(3, 0.5)).toBe(2);
    expect(toBaseCents(1, 0.5)).toBe(0);
    expect(toBaseCents(100, 1)).toBe(100);
  });
  it('semana começa na segunda; mês como chave', () => {
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19');
    expect(monthKey('2026-02-28')).toBe('2026-02');
  });
  it('formata indicador monetário', () => {
    expect(formatIndicator({ format: 'money', value: 123456 })).toBe('R$ 1.234,56');
    expect(formatIndicator({ format: 'money', value: null })).toBe('n/a');
    expect(formatIndicator({ format: 'ratio', value: 0.8 })).toBe('0,80');
  });
});

describe('downloadText', () => {
  it('só revoga a URL do blob depois que o navegador teve tempo de iniciar o download', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    downloadText('a.json', '{}');
    expect(create).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(revoke).toHaveBeenCalledWith('blob:x');
    vi.useRealTimers();
  });
});
