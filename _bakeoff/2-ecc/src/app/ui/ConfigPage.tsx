import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { IMPLEMENTED_MODULES, MANIFESTS, type ImplementedModuleId } from '@/project/registry';
import { resolveConfig, type ResolvedSettings } from '@/project/config';
import type { ProjectSnapshot } from '@/project/snapshot';
import { setModuleEnabledCmd, updateModuleSettings } from '@/commands/project';
import { useCommand, useReadOnly, useSnapshot } from '@/platform/react/hooks';
import { DataMenu } from './DataMenu';

function ModulesCard({ snapshot }: { snapshot: ProjectSnapshot }) {
  const run = useCommand();
  const readOnly = useReadOnly();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { enabled } = resolveConfig(snapshot.project.config);

  const toggle = async (id: ImplementedModuleId, on: boolean) => {
    const before = enabled;
    const r = await run(setModuleEnabledCmd(id, on));
    if (!r.ok) return setError(r.error.join(' '));
    setError(null);
    const changed = IMPLEMENTED_MODULES.filter((m) => m !== id && before[m] !== on && MANIFESTS[m].mandatory === false).filter((m) =>
      on ? (MANIFESTS[id].requires as readonly string[]).includes(m) : (MANIFESTS[m].requires as readonly string[]).includes(id),
    );
    setNotice(
      changed
        .map((m) =>
          on
            ? `${MANIFESTS[m].label} também foi ligado (${MANIFESTS[id].label} depende dele).`
            : `${MANIFESTS[m].label} depende de ${MANIFESTS[id].label} e também foi desligado.`,
        )
        .join(' ') || null,
    );
  };

  return (
    <Card title="Módulos">
      <p className="tb-hint">Desligar um módulo oculta suas telas e indicadores; os dados são preservados.</p>
      {error && <div role="alert" className="tb-error">{error}</div>}
      {notice && <p role="status" className="tb-card" style={{ background: 'var(--gold-soft)' }}>{notice}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {IMPLEMENTED_MODULES.map((id) => (
          <li key={id} style={{ padding: '4px 0' }}>
            {MANIFESTS[id].mandatory ? (
              <span>
                <strong>{MANIFESTS[id].label}</strong> <span className="tb-hint">— sempre ligado</span>
              </span>
            ) : (
              <label className="tb-row">
                <input type="checkbox" checked={enabled[id]} disabled={readOnly} onChange={(e) => toggle(id, e.target.checked)} />
                {MANIFESTS[id].label}
              </label>
            )}
            {id === 'stakeholders' && (
              <span className="tb-hint"> · o cadastro de pessoas e organizações fica sempre disponível</span>
            )}
          </li>
        ))}
      </ul>
      <Link to="/projeto/pessoas">Pessoas e organizações</Link>
    </Card>
  );
}

function SettingsCard({ settings }: { settings: ResolvedSettings }) {
  const run = useCommand();
  const readOnly = useReadOnly();
  const [gov, setGov] = useState({ staleChangeDays: String(settings.governance.staleChangeDays) });
  const [sch, setSch] = useState({
    phases: settings.schedule.phases.join('\n'),
    milestoneToleranceDays: String(settings.schedule.milestoneToleranceDays),
    spiGreenMin: String(settings.schedule.spiGreenMin),
    spiYellowMin: String(settings.schedule.spiYellowMin),
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));

  const save = async () => {
    const results = [
      await run(updateModuleSettings('governance', { staleChangeDays: num(gov.staleChangeDays) })),
      await run(
        updateModuleSettings('schedule', {
          phases: sch.phases.split('\n').map((p) => p.trim()).filter(Boolean),
          milestoneToleranceDays: num(sch.milestoneToleranceDays),
          spiGreenMin: num(sch.spiGreenMin),
          spiYellowMin: num(sch.spiYellowMin),
        }),
      ),
    ];
    const errs = results.flatMap((r) => (r.ok ? [] : r.error));
    setErrors(errs);
    setSaved(!errs.length);
  };

  const field = (label: string, value: string, onChange: (v: string) => void, hint?: string) => (
    <label className="tb-field">
      <span>{label}</span>
      <input value={value} disabled={readOnly} inputMode="decimal" onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="tb-hint">{hint}</span>}
    </label>
  );

  return (
    <Card title="Parâmetros">
      {errors.length > 0 && (
        <div role="alert" className="tb-error">
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}
      <h4>Governança</h4>
      {field('Dias para mudança parada', gov.staleChangeDays, (v) => setGov({ staleChangeDays: v }))}
      <h4>Cronograma</h4>
      {field('Tolerância de "Atenção" dos marcos (dias)', sch.milestoneToleranceDays, (v) => setSch({ ...sch, milestoneToleranceDays: v }))}
      {field('SPI verde a partir de', sch.spiGreenMin, (v) => setSch({ ...sch, spiGreenMin: v }))}
      {field('SPI amarelo a partir de', sch.spiYellowMin, (v) => setSch({ ...sch, spiYellowMin: v }))}
      <label className="tb-field">
        <span>Fases (uma por linha)</span>
        <textarea rows={6} value={sch.phases} disabled={readOnly} onChange={(e) => setSch({ ...sch, phases: e.target.value })} />
      </label>
      {!readOnly && (
        <div className="tb-row">
          <button type="button" className="primary" onClick={save}>
            Salvar parâmetros
          </button>
          {saved && <span className="tb-hint">Salvo.</span>}
        </div>
      )}
    </Card>
  );
}

export function ConfigPage() {
  const snapshot = useSnapshot();
  if (!snapshot) return null;
  const { settings, warnings } = resolveConfig(snapshot.project.config);
  return (
    <div>
      <h2 style={{ fontSize: 16 }}>Configuração</h2>
      {warnings.map((w) => (
        <p key={w} className="tb-card" style={{ background: 'var(--gold-soft)' }}>
          {w}
        </p>
      ))}
      <div className="tb-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <ModulesCard snapshot={snapshot} />
        <SettingsCard key={snapshot.project.id} settings={settings} />
      </div>
      <DataMenu />
    </div>
  );
}
