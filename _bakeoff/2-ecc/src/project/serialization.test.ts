import { exportFileName, parseImportText, toExport } from './serialization';
import { aProject, aSnapshot, docDeliverable, milestone, NOW, person, pkg, requirement } from '@/test/builders';
import type { Baseline } from './baseline';

const fullSnapshot = () => {
  const s = aSnapshot()
    .parties(person('P'))
    .wbs(pkg('A', 5), pkg('B', 3, ['A']))
    .milestones(milestone('M', ['B']))
    .requirements(requirement('R', { ownerId: 'P' as never }))
    .deliverables(docDeliverable('D'))
    .build();
  s.baselines.push({
    id: 'b1',
    projectId: s.project.id,
    version: 1,
    createdAt: NOW,
    changeRequestId: null,
    projectFinish: '2026-01-12',
    workPackages: { A: { start: '2026-01-05', finish: '2026-01-09', duration: 5 } },
    milestones: { M: { date: '2026-01-12' } },
    costItems: {},
    deliverables: { D: { code: 'ENT-D', name: 'Entregável D', plannedDate: null } },
  } as Baseline);
  return s;
};

describe('round-trip', () => {
  it('exportar e reimportar produz o mesmo snapshot', () => {
    const s = fullSnapshot();
    const r = parseImportText(JSON.stringify(toExport(s, NOW)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshot).toEqual(s);
      expect(r.value.summary).toMatchObject({ name: 'Projeto Teste', code: 'PT-01' });
      expect(r.value.summary.counts['EAP']).toBe(2);
    }
  });
  it('o arquivo exportado tem formato e versão', () => {
    const f = toExport(fullSnapshot(), NOW);
    expect(f).toMatchObject({ format: 'pmb-export', schemaVersion: 1, exportedAt: NOW });
    expect(f.data['scope_wbs']).toHaveLength(2);
  });
});

describe('importação inválida', () => {
  const message = (text: string) => {
    const r = parseImportText(text);
    if (r.ok) throw new Error('esperava erro');
    return r.error;
  };
  it('não-JSON', () => {
    expect(message('{"a":')).toEqual({ code: 'json', message: 'O arquivo não é um JSON válido.' });
  });
  it('outro app', () => {
    expect(message('{"x":1}')).toEqual({
      code: 'format',
      message: 'O arquivo não é uma exportação do Project Management Board.',
    });
  });
  it('versão mais nova', () => {
    const f = { ...toExport(fullSnapshot(), NOW), schemaVersion: 2 };
    expect(message(JSON.stringify(f))).toEqual({
      code: 'version',
      message: 'O arquivo foi gerado por uma versão mais nova da aplicação (versão de dados 2; suportada até 1).',
    });
  });
  it('vínculo órfão lista no máximo 10 problemas', () => {
    const s = fullSnapshot();
    for (let i = 0; i < 12; i++) s.scope.requirements[`R${i}` as never] = requirement(`R${i}`, { ownerId: 'x' as never });
    const e = message(JSON.stringify(toExport(s, NOW)));
    expect(e.code).toBe('invalid');
    expect(e.message.startsWith('O arquivo contém dados inválidos:')).toBe(true);
    expect(e.message.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(10);
  });
  it('tabela desconhecida e registro fora do schema', () => {
    const f = toExport(fullSnapshot(), NOW);
    expect(message(JSON.stringify({ ...f, data: { ...f.data, finances_x: [] } })).code).toBe('invalid');
    const bad = { ...f, data: { ...f.data, scope_wbs: [{ id: 'A', duration: -1 }] } };
    expect(message(JSON.stringify(bad)).code).toBe('invalid');
  });
  it('sem ficha do projeto', () => {
    const f = toExport(fullSnapshot(), NOW);
    expect(message(JSON.stringify({ ...f, data: { ...f.data, governance_profile: [] } })).code).toBe('invalid');
  });
});

describe('exportFileName', () => {
  it('slug do código e data', () => {
    const s = aSnapshot(aProject({ info: { name: 'x', code: 'OBRA 12/A', startDate: '2026-01-05' } })).build();
    expect(exportFileName(s, '2026-10-17')).toBe('pmb-obra-12-a-2026-10-17.json');
  });
});
