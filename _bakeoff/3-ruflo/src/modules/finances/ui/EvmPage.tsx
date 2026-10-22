import { useState } from 'react';
import { formatPercent, formatRatio } from '@/shared/lib/format';
import { formatMoneyBR } from '@/shared/lib/money';
import { KpiTile } from '@/shared/ui/KpiTile';
import { useAnalysis } from '@/platform/react/hooks';
import {
  EVM_ADVANCED,
  EVM_ADVANCED_TOGGLE,
  EVM_ESSENTIAL,
  evmMissingInputs,
  type EvmIndicatorDef,
} from '../domain/evm-labels';

/** Valor agregado (SPEC §6.4f / §8.2): modo essencial por padrão; projeções e variâncias sob demanda. */
export function EvmPage() {
  const analysis = useAnalysis();
  const [advanced, setAdvanced] = useState(false);
  const f = analysis?.derived.finances;
  if (!analysis || !f) return null;
  const { evm, baseCurrency: cur } = f;
  const value = (d: EvmIndicatorDef) => {
    const v = evm[d.key];
    if (d.format === 'ratio') return formatRatio(v);
    return v === null ? 'n/a' : formatMoneyBR(Math.round(v), cur);
  };
  const missing = evmMissingInputs(evm, analysis.snapshot.baselines.length > 0);
  const tiles = (defs: EvmIndicatorDef[]) =>
    defs.map((d) => <KpiTile key={d.key} label={d.label} value={value(d)} hint={d.hint} />);
  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Valor agregado</h1>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          aria-pressed={advanced}
          onClick={() => setAdvanced(!advanced)}
        >
          {EVM_ADVANCED_TOGGLE}
        </button>
      </div>
      {missing.length > 0 && (
        <div className="info" role="note" aria-label="O que falta preencher">
          <strong>O que falta preencher</strong>
          <ul className="plain-list">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid evm-grid cols-3" style={{ marginBottom: 16 }}>
        {tiles(EVM_ESSENTIAL)}
      </div>
      {advanced && (
        <section aria-label="Projeções avançadas" style={{ marginBottom: 16 }}>
          <h2 className="eyebrow">Projeções avançadas</h2>
          <div className="grid evm-grid cols-3">{tiles(EVM_ADVANCED)}</div>
        </section>
      )}
      <p className="muted small">
        % do custo orçado não vinculado a pacotes:{' '}
        <span className="tb-mono">{formatPercent(f.unlinkedCostPct)}</span> — entra nos totais, fica
        fora do EVM.
      </p>
    </div>
  );
}
