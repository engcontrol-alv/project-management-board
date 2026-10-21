import { defaultConfig, resolveConfig, setModuleEnabled } from './config';

describe('resolveConfig', () => {
  it('padrão: tudo ligado, defaults, sem avisos', () => {
    const r = resolveConfig(defaultConfig());
    expect(r.enabled).toEqual({ governance: true, scope: true, schedule: true, stakeholders: true });
    expect(r.settings.schedule.milestoneToleranceDays).toBe(5);
    expect(r.settings.governance.staleChangeDays).toBe(15);
    expect(r.warnings).toEqual([]);
  });
  it('settings inválidos voltam ao padrão com aviso', () => {
    const c = defaultConfig();
    c.modules.schedule = { enabled: true, settings: { milestoneToleranceDays: 'x' } };
    const r = resolveConfig(c);
    expect(r.settings.schedule.milestoneToleranceDays).toBe(5);
    expect(r.warnings).toHaveLength(1);
  });
  it('governança é sempre ligada', () => {
    const c = defaultConfig();
    c.modules.governance = { enabled: false, settings: {} };
    expect(resolveConfig(c).enabled.governance).toBe(true);
  });
  it('cronograma sem escopo fica desligado', () => {
    const c = defaultConfig();
    c.modules.scope = { enabled: false, settings: {} };
    expect(resolveConfig(c).enabled.schedule).toBe(false);
  });
});

describe('setModuleEnabled', () => {
  it('aplica dependências nos dois sentidos', () => {
    const off = setModuleEnabled(defaultConfig(), 'scope', false);
    expect(off.modules.scope?.enabled).toBe(false);
    expect(off.modules.schedule?.enabled).toBe(false);
    const on = setModuleEnabled(off, 'schedule', true);
    expect(on.modules.scope?.enabled).toBe(true);
    expect(on.modules.schedule?.enabled).toBe(true);
  });
  it('não desliga módulo obrigatório e preserva settings', () => {
    const c = defaultConfig();
    expect(setModuleEnabled(c, 'governance', false).modules.governance?.enabled).toBe(true);
    expect(setModuleEnabled(c, 'scope', false).modules.schedule?.settings).toEqual(c.modules.schedule?.settings);
  });
});
