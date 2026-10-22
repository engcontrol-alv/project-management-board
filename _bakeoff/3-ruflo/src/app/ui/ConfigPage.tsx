import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Dialog, ErrorList } from '@/shared/ui/Dialog';
import { Field, MoneyInput } from '@/shared/ui/fields';
import { CURRENCIES, type FinancesSettings } from '@/modules/finances';
import type { ResourcesSettings } from '@/modules/resources';
import { DEFAULT_BANDS, RISK_SCALES, type RiskScale, type RisksSettings } from '@/modules/risks';
import type { StakeholdersSettings } from '@/modules/stakeholders';
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
      </Card>

      <Card title="Pessoas e organizações">
        <p className="muted small">Cadastro básico sempre disponível, usado em todos os campos de responsável e cliente.</p>
        <Link to="/projeto/pessoas">Pessoas e organizações</Link>
      </Card>

      <GovernanceSettingsForm initial={settings.governance} onSave={(v) => save('governance', v)} />
      {enabled.schedule && <ScheduleSettingsForm initial={settings.schedule} onSave={(v) => save('schedule', v)} />}
      {enabled.finances && <FinancesSettingsForm initial={settings.finances} onSave={(v) => save('finances', v)} />}
      {enabled.risks && (
        <RisksSettingsForm
          initial={settings.risks}
          assessed={Object.values(analysis.snapshot.risks.risks).filter((r) => r.probability !== null && r.impact !== null).length}
          onSave={(v) => save('risks', v)}
        />
      )}
      {enabled.resources && <ResourcesSettingsForm initial={settings.resources} onSave={(v) => save('resources', v)} />}
      {enabled.stakeholders && (
        <StakeholdersSettingsForm initial={settings.stakeholders} onSave={(v) => save('stakeholders', v)} />
      )}
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

const num = (s: string) => Number(s.replace(',', '.'));
const lines = (s: string) =>
  s
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

function FinancesSettingsForm({ initial, onSave }: { initial: FinancesSettings; onSave: (v: unknown) => void }) {
  const [base, setBase] = useState<string>(initial.baseCurrency);
  const [accepted, setAccepted] = useState<string[]>(initial.currencies);
  const [green, setGreen] = useState(String(initial.cpiGreenMin).replace('.', ','));
  const [yellow, setYellow] = useState(String(initial.cpiYellowMin).replace('.', ','));
  return (
    <Card title="Parâmetros — Finanças">
      <div className="form-grid">
        <Field id="cfg-base" label="Moeda base" hint="Todos os totais são convertidos para ela.">
          <select id="cfg-base" value={base} onChange={(e) => setBase(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field id="cfg-currencies" label="Moedas aceitas">
          <div className="checks" id="cfg-currencies">
            {CURRENCIES.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={accepted.includes(c)}
                  onChange={(e) => setAccepted(CURRENCIES.filter((x) => (x === c ? e.target.checked : accepted.includes(x))))}
                />
                {c}
              </label>
            ))}
          </div>
        </Field>
        <Field id="cfg-cpi-green" label="CPI verde a partir de">
          <input id="cfg-cpi-green" type="text" value={green} onChange={(e) => setGreen(e.target.value)} />
        </Field>
        <Field id="cfg-cpi-yellow" label="CPI amarelo a partir de">
          <input id="cfg-cpi-yellow" type="text" value={yellow} onChange={(e) => setYellow(e.target.value)} />
        </Field>
      </div>
      <button
        className="btn"
        onClick={() => onSave({ baseCurrency: base, currencies: accepted, cpiGreenMin: num(green), cpiYellowMin: num(yellow) })}
      >
        Salvar parâmetros de Finanças
      </button>
    </Card>
  );
}

function RisksSettingsForm({
  initial,
  assessed,
  onSave,
}: {
  initial: RisksSettings;
  /** Riscos com probabilidade e impacto: trocar a escala com eles pede confirmação (SPEC caso 27). */
  assessed: number;
  onSave: (v: unknown) => void;
}) {
  const [scale, setScale] = useState<RiskScale>(initial.scale);
  const [low, setLow] = useState(String(initial.bands.low));
  const [moderate, setModerate] = useState(String(initial.bands.moderate));
  const [high, setHigh] = useState(String(initial.bands.high));
  const [categories, setCategories] = useState(initial.categories.join('\n'));
  const [confirming, setConfirming] = useState(false);
  // Trocar a escala preenche as faixas padrão da nova escala (D2).
  const changeScale = (next: RiskScale) => {
    setScale(next);
    setLow(String(DEFAULT_BANDS[next].low));
    setModerate(String(DEFAULT_BANDS[next].moderate));
    setHigh(String(DEFAULT_BANDS[next].high));
  };
  const submit = () =>
    onSave({
      scale,
      bands: { low: Number(low), moderate: Number(moderate), high: Number(high) },
      categories: lines(categories),
    });
  return (
    <Card title="Parâmetros — Riscos">
      <p className="muted small">
        Matriz {scale}×{scale} (probabilidade × impacto, pontuação de 1 a {scale * scale}).
      </p>
      <div className="form-grid">
        <Field id="cfg-scale" label="Escala da matriz" hint="Trocar com riscos avaliados converte os níveis e marca os riscos para reavaliar.">
          <select id="cfg-scale" value={scale} onChange={(e) => changeScale(Number(e.target.value) as RiskScale)}>
            {RISK_SCALES.map((n) => (
              <option key={n} value={n}>
                {n}×{n}
              </option>
            ))}
          </select>
        </Field>
        <Field id="cfg-low" label="Baixo até a pontuação">
          <input id="cfg-low" type="number" min={1} value={low} onChange={(e) => setLow(e.target.value)} />
        </Field>
        <Field id="cfg-moderate" label="Moderado até a pontuação">
          <input id="cfg-moderate" type="number" min={1} value={moderate} onChange={(e) => setModerate(e.target.value)} />
        </Field>
        <Field id="cfg-high" label="Alto até a pontuação" hint="Acima disso = Crítico.">
          <input id="cfg-high" type="number" min={1} value={high} onChange={(e) => setHigh(e.target.value)} />
        </Field>
        <Field id="cfg-categories" label="Categorias de risco (uma por linha)" className="wide">
          <textarea id="cfg-categories" rows={5} value={categories} onChange={(e) => setCategories(e.target.value)} />
        </Field>
      </div>
      <button className="btn" onClick={() => (scale !== initial.scale && assessed > 0 ? setConfirming(true) : submit())}>
        Salvar parâmetros de Riscos
      </button>
      <Dialog
        open={confirming}
        title={`Mudar a matriz para ${scale}×${scale}?`}
        onClose={() => setConfirming(false)}
        actions={
          <>
            <button className="btn" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setConfirming(false);
                submit();
              }}
            >
              Converter para {scale}×{scale}
            </button>
          </>
        }
      >
        <p>
          {assessed} risco(s) avaliado(s) terão probabilidade e impacto convertidos para a escala {scale}×{scale} e ficarão
          marcados como <strong>Reavaliar</strong>.
        </p>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Nada é perdido: a avaliação anterior fica guardada e volta exatamente se a escala voltar a {initial.scale}×
          {initial.scale} antes da reavaliação.
        </p>
      </Dialog>
    </Card>
  );
}

function ResourcesSettingsForm({ initial, onSave }: { initial: ResourcesSettings; onSave: (v: unknown) => void }) {
  const [red, setRed] = useState(String(initial.overallocationRedPct));
  const [hours, setHours] = useState(String(initial.hoursPerDay));
  return (
    <Card title="Parâmetros — Recursos">
      <div className="form-grid">
        <Field id="cfg-over" label="Sobrealocação vermelha acima de (%)">
          <input id="cfg-over" type="number" min={100} value={red} onChange={(e) => setRed(e.target.value)} />
        </Field>
        <Field id="cfg-hours" label="Horas por dia" hint="Converte o custo homem-hora em custo/dia.">
          <input id="cfg-hours" type="number" min={1} max={24} value={hours} onChange={(e) => setHours(e.target.value)} />
        </Field>
      </div>
      <button className="btn" onClick={() => onSave({ overallocationRedPct: Number(red), hoursPerDay: num(hours) })}>
        Salvar parâmetros de Recursos
      </button>
    </Card>
  );
}

function StakeholdersSettingsForm({ initial, onSave }: { initial: StakeholdersSettings; onSave: (v: unknown) => void }) {
  const [limit, setLimit] = useState<number | null>(initial.supplierCommittedThresholdCents);
  return (
    <Card title="Parâmetros — Partes Interessadas">
      <Field id="cfg-limit" label="Destacar fornecedor com comprometido acima de" hint="Na matriz Poder × Interesse e nos alertas.">
        <MoneyInput id="cfg-limit" value={limit} onChange={setLimit} />
      </Field>
      <button className="btn" onClick={() => onSave({ supplierCommittedThresholdCents: limit ?? 0 })}>
        Salvar parâmetros de Partes Interessadas
      </button>
    </Card>
  );
}
