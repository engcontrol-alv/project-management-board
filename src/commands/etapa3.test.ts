import { describe, expect, it } from 'vitest';
import { aRisk } from '@/test/factories';
import { aContext, aSnapshot } from '@/test/builders';
import { DEFAULT_BANDS, DEFAULT_RISK_CATEGORIES } from '@/modules/risks';
import { resolveConfig } from '@/project/config';
import type { ProjectSnapshot } from '@/project/snapshot';
import { upsertEntity } from './entities';
import { updateModuleSettings } from './project';
import { runCommand, type Command } from './run';

const run = (s: ProjectSnapshot, cmd: Command) => runCommand(s, cmd, aContext());
const errorsOf = (r: ReturnType<typeof run>) => (r.ok ? [] : r.error);
const scale = (n: 3 | 5) => updateModuleSettings('risks', { scale: n, bands: DEFAULT_BANDS[n], categories: DEFAULT_RISK_CATEGORIES });

describe('matriz de riscos 3×3 ↔ 5×5 (D1)', () => {
  const s = aSnapshot()
    .withRisk(
      aRisk({ probability: 2, impact: 3, category: 'Técnico' }),
      aRisk({ id: 'r2' as never, code: 'R-002', probability: null, impact: null, category: 'Técnico' }),
    )
    .build();

  it('trocar a escala grava os parâmetros e converte os riscos numa só transação', () => {
    const r = run(s, scale(5));
    if (!r.ok) throw new Error(r.error.join('\n'));
    expect(resolveConfig(r.value.snapshot.project.config).settings.risks.scale).toBe(5);
    expect(r.value.changeset.puts.map((p) => p.table)).toEqual(['risks_risks']);
    expect(r.value.snapshot.risks.risks['r1' as never]).toMatchObject({
      probability: 3,
      impact: 5,
      reassess: { scale: 3, probability: 2, impact: 3 },
    });
    expect(r.value.snapshot.risks.risks['r2' as never]?.probability).toBeNull();
  });

  it('3 → 5 → 3 sem reavaliar restaura exatamente', () => {
    const five = run(s, scale(5));
    if (!five.ok) throw new Error(five.error.join('\n'));
    const three = run(five.value.snapshot, scale(3));
    if (!three.ok) throw new Error(three.error.join('\n'));
    expect(three.value.snapshot.risks).toEqual(s.risks);
  });

  it('mesma escala não toca os riscos', () => {
    const r = run(s, scale(3));
    expect(r.ok && r.value.changeset.puts).toEqual([]);
  });

  it('nível fora da escala do projeto é recusado', () => {
    expect(
      errorsOf(run(s, upsertEntity('risks', 'risks', aRisk({ id: 'r3' as never, code: '', probability: 4, category: 'Técnico' })))),
    ).toEqual(['R-001: probabilidade 4 fora da escala 3×3']);
  });
});
