import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { ErrorList } from '@/shared/ui/Dialog';
import { Field } from '@/shared/ui/fields';
import { setModuleEnabledCmd, updateModuleSettings } from '@/commands/project';
import { useAnalysis, useCommand } from '@/platform/react/hooks';
import { dependentsOf } from '@/project/config';
import { MANIFESTS, MODULE_ORDER, type ImplementedModuleId } from '@/project/registry';
import { ClearDataCard } from './DataMenu';

export function ConfigPage() {
  const analysis = useAnalysis();
  const command = useCommand();
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  if (!analysis) return null;
  const { enabled, settings, warnings } = analysis.config;

  const toggle = async (id: ImplementedModuleId, on: boolean) => {
    const r = await command(setModuleEnabledCmd(id, on));
    if (!r.ok) return setErrors(r.error);
    setErrors([]);
    const label = MANIFESTS[id].label;
    if (!on) {
      const deps = dependentsOf(id).filter((d) => enabled[d]);
      setNotice(
        deps.length
          ? deps.map((d) => `${MANIFESTS[d].label} depende de ${label} e também foi desligado.`).join(' ')
          : null,
      );
    } else {
      const reqs = (MANIFESTS[id].requires as ImplementedModuleId[]).filter((r) => !enabled[r]);
      setNotice(
        reqs.length
          ? reqs.map((r) => `${MANIFESTS[r].label} foi ligado porque ${label} depende dele.`).join(' ')
          : null,
      );
    }
  };

  const save = async (id: ImplementedModuleId, value: unknown) => {
    const r = await command(updateModuleSettings(id, value));
    setErrors(r.ok ? [] : r.error);
    setNotice(r.ok ? 'Parâmetros salvos.' : null);
  };

  return (
    <div>
      <h1>Configurações</h1>
      {warnings.map((w) => (
        <div className="notice" key={w}>
          {w}
        </div>
      ))}
      {notice && <div className="info">{notice}</div>}
      <ErrorList errors={errors} />

      <Card title="Módulos">
        <p className="muted small">Desligar um módulo oculta suas telas e indicadores; os dados são preservados.</p>
        {MODULE_ORDER.map((id) => (
          <div key={id} className="row" style={{ padding: '4px 0' }}>
            {MANIFESTS[id].mandatory ? (
              <>
                <strong>{MANIFESTS[id].label}</strong>
                <span className="muted small">sempre ligado</span>
              </>
            ) : (
              <label className="row">
                <input type="checkbox" checked={enabled[id]} onChange={(e) => void toggle(id, e.target.checked)} />
                {MANIFESTS[id].label}
                {MANIFESTS[id].requires.length > 0 && (
                  <span className="muted small">
                    (exige {MANIFESTS[id].requires.map((r) => MANIFESTS[r as ImplementedModuleId].label).join(', ')})
                  </span>
                )}
              </label>
            )}
          </div>
        ))}
        <p className="muted small">Finanças, Riscos e Recursos chegam nas próximas etapas.</p>
      </Card>

      <Card title="Pessoas e organizações">
        <p className="muted small">Cadastro básico sempre disponível, usado em todos os campos de responsável e cliente.</p>
        <Link to="/projeto/pessoas">Pessoas e organizações</Link>
      </Card>

      <GovernanceSettingsForm initial={settings.governance} onSave={(v) => save('governance', v)} />
      {enabled.schedule && <ScheduleSettingsForm initial={settings.schedule} onSave={(v) => save('schedule', v)} />}
      <ClearDataCard />
    </div>
  );
}

function GovernanceSettingsForm({
  initial,
  onSave,
}: {
  initial: { staleChangeDays: number };
  onSave: (v: unknown) => void;
}) {
  const [days, setDays] = useState(String(initial.staleChangeDays));
  return (
    <Card title="Parâmetros — Governança">
      <Field id="cfg-stale" label="Dias para considerar uma mudança parada">
        <input id="cfg-stale" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
      </Field>
      <button className="btn" onClick={() => onSave({ staleChangeDays: Number(days) })}>
        Salvar parâmetros de Governança
      </button>
    </Card>
  );
}

function ScheduleSettingsForm({
  initial,
  onSave,
}: {
  initial: { phases: string[]; milestoneToleranceDays: number; spiGreenMin: number; spiYellowMin: number };
  onSave: (v: unknown) => void;
}) {
  const [tol, setTol] = useState(String(initial.milestoneToleranceDays));
  const [green, setGreen] = useState(String(initial.spiGreenMin));
  const [yellow, setYellow] = useState(String(initial.spiYellowMin));
  const [phases, setPhases] = useState(initial.phases.join('\n'));
  const num = (s: string) => Number(s.replace(',', '.'));
  return (
    <Card title="Parâmetros — Cronograma">
      <div className="form-grid">
        <Field id="cfg-tol" label="Tolerância de marco (dias)" hint="Desvio até este limite = Atenção; acima = Atrasado.">
          <input id="cfg-tol" type="number" min={0} value={tol} onChange={(e) => setTol(e.target.value)} />
        </Field>
        <Field id="cfg-green" label="SPI verde a partir de">
          <input id="cfg-green" type="text" value={green} onChange={(e) => setGreen(e.target.value)} />
        </Field>
        <Field id="cfg-yellow" label="SPI amarelo a partir de">
          <input id="cfg-yellow" type="text" value={yellow} onChange={(e) => setYellow(e.target.value)} />
        </Field>
        <Field id="cfg-phases" label="Fases (uma por linha)" className="wide">
          <textarea id="cfg-phases" rows={6} value={phases} onChange={(e) => setPhases(e.target.value)} />
        </Field>
      </div>
      <button
        className="btn"
        onClick={() =>
          onSave({
            milestoneToleranceDays: Number(tol),
            spiGreenMin: num(green),
            spiYellowMin: num(yellow),
            phases: phases
              .split('\n')
              .map((p) => p.trim())
              .filter(Boolean),
          })
        }
      >
        Salvar parâmetros do Cronograma
      </button>
    </Card>
  );
}
