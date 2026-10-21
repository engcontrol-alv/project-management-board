import { describe, expect, it } from 'vitest';
import { defaultConfig, resolveConfig, setModuleEnabled } from '@/project/config';
import { availableSections, presetSelection, REPORT_SECTIONS } from './report-config';

const enabledWith = (off: string[] = []) => {
  let c = defaultConfig();
  for (const m of off) c = setModuleEnabled(c, m as never, false);
  return resolveConfig(c).enabled;
};

describe('seções do relatório executivo', () => {
  it('7 seções na ordem do pedido', () => {
    expect(REPORT_SECTIONS.map((s) => s.id)).toEqual([
      'overview',
      'governance',
      'scope',
      'schedule',
      'finances',
      'risks',
      'resources_stakeholders',
    ]);
  });

  it('disponibilidade segue os módulos ligados; Geral e Governança sempre', () => {
    expect(availableSections(enabledWith())).toEqual(new Set(REPORT_SECTIONS.map((s) => s.id)));
    const off = availableSections(enabledWith(['finances', 'risks', 'resources', 'stakeholders']));
    expect([...off].sort()).toEqual(['governance', 'overview', 'schedule', 'scope']);
    // Recursos OU Partes Interessadas mantém a seção combinada.
    expect(availableSections(enabledWith(['resources'])).has('resources_stakeholders')).toBe(true);
  });

  it('presets: Diretoria = resumo + finanças + riscos; Completo = todas as disponíveis', () => {
    expect([...presetSelection('board', enabledWith())]).toEqual(['overview', 'finances', 'risks']);
    expect(presetSelection('full', enabledWith())).toEqual(new Set(REPORT_SECTIONS.map((s) => s.id)));
  });

  it('presets nunca marcam seção de módulo desligado', () => {
    const enabled = enabledWith(['finances', 'scope', 'schedule']);
    expect([...presetSelection('board', enabled)]).toEqual(['overview', 'risks']);
    expect(presetSelection('full', enabled).has('finances')).toBe(false);
    expect(presetSelection('full', enabled).has('scope')).toBe(false);
  });
});
