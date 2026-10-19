import { describe, expect, it } from 'vitest';
import { aMilestone } from '@/test/factories';
import { milestoneSchema } from '../model/milestone';
import {
  milestoneStatus,
  physicalProgress,
  physicalSCurve,
  physicalSpi,
  plannedProgress,
} from './progress';
import { scheduleRag } from './rag';

describe('milestoneSchema', () => {
  it('sem predecessores exige data manual', () => {
    expect(milestoneSchema.safeParse(aMilestone({ manualDate: null })).success).toBe(false);
    expect(
      milestoneSchema.safeParse(aMilestone({ manualDate: null, predecessorIds: ['A' as never] }))
        .success,
    ).toBe(true);
  });
});

describe('milestoneStatus', () => {
  const base = {
    actualDate: null,
    forecast: '2026-01-20',
    baselineDate: '2026-01-20',
    statusDate: '2026-01-05',
    toleranceDays: 5,
  };
  it('situações derivadas', () => {
    expect(milestoneStatus({ ...base, actualDate: '2026-01-19' })).toBe('Concluído');
    expect(milestoneStatus(base)).toBe('No prazo');
    expect(milestoneStatus({ ...base, forecast: '2026-01-25' })).toBe('Atenção');
    expect(milestoneStatus({ ...base, forecast: '2026-01-26' })).toBe('Atrasado');
    expect(
      milestoneStatus({ ...base, baselineDate: null, forecast: '2026-01-10', statusDate: '2026-01-11' }),
    ).toBe('Atrasado');
    expect(milestoneStatus({ ...base, forecast: null })).toBe('No prazo');
  });
});

describe('progresso físico', () => {
  it('plannedProgress linear na LB', () => {
    const b = { A: { start: '2026-01-05', finish: '2026-01-14', duration: 10 } };
    expect(plannedProgress(b, '2026-01-09')).toBe(50);
    expect(plannedProgress(b, '2026-01-04')).toBe(0);
    expect(plannedProgress({}, '2026-01-09')).toBeNull();
  });
  it('physicalProgress ponderado pela duração', () => {
    expect(
      physicalProgress([
        { duration: 10, percentComplete: 50 },
        { duration: 30, percentComplete: 10 },
      ]),
    ).toBe(20);
    expect(physicalProgress([])).toBeNull();
    expect(physicalProgress([{ duration: 0, percentComplete: 50 }])).toBeNull();
  });
  it('Review Focus 4: nunca NaN/Infinity', () => {
    expect(physicalSpi(20, 0)).toBeNull();
    expect(physicalSpi(null, 50)).toBeNull();
    expect(physicalSpi(45, 50)).toBe(0.9);
    expect(physicalSCurve({}, null, '2026-01-05')).toEqual([]);
  });
  it('physicalSCurve com pontos semanais e data de status', () => {
    const b = { A: { start: '2026-01-05', finish: '2026-01-18', duration: 14 } };
    const pts = physicalSCurve(b, 40, '2026-01-12');
    expect(pts.map((p) => p.date)).toEqual(['2026-01-05', '2026-01-12', '2026-01-18']);
    expect(pts.map((p) => Number(p.planned.toFixed(2)))).toEqual([7.14, 57.14, 100]);
    expect(pts.map((p) => p.actual)).toEqual([0, 40, null]);
    const off = physicalSCurve(b, 40, '2026-01-14');
    expect(off.map((p) => p.date)).toContain('2026-01-14');
  });
});

describe('scheduleRag', () => {
  const s = (spi: number | null, milestones: { status: 'Atrasado' | 'Atenção' | 'No prazo'; critical: boolean }[] = []) =>
    scheduleRag({ spi, milestones, greenMin: 0.95, yellowMin: 0.85 }).rag;
  it('casos da tabela de RAG', () => {
    expect(s(null)).toBe('n/a');
    expect(s(0.96)).toBe('verde');
    expect(s(0.9)).toBe('amarelo');
    expect(s(0.8)).toBe('vermelho');
    expect(s(0.99, [{ status: 'Atrasado', critical: true }])).toBe('vermelho');
    expect(s(0.99, [{ status: 'Atrasado', critical: false }])).toBe('amarelo');
    expect(s(0.99, [{ status: 'Atenção', critical: true }])).toBe('verde');
    expect(s(null, [{ status: 'No prazo', critical: false }])).toBe('verde');
  });
});
