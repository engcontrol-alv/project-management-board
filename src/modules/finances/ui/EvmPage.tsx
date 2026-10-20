import { formatPercent, formatRatio } from '@/shared/lib/format';
import { formatMoneyBR } from '@/shared/lib/money';
import { KpiTile } from '@/shared/ui/KpiTile';
import { useAnalysis } from '@/platform/react/hooks';

/** Valor agregado (SPEC §6.4f / §8.2). */
export function EvmPage() {
  const analysis = useAnalysis();
  const f = analysis?.derived.finances;
  if (!analysis || !f) return null;
  const { evm, baseCurrency: cur } = f;
  const money = (v: number | null) => (v === null ? 'n/a' : formatMoneyBR(Math.round(v), cur));
  const hasBaseline = analysis.snapshot.baselines.length > 0;
  const tiles: [string, string, string][] = [
    ['BAC', money(evm.bac), 'Orçamento no término'],
    ['PV', money(evm.pv), 'Valor planejado na data de status'],
    ['EV', money(evm.ev), 'Valor agregado (% físico × BAC)'],
    ['AC', money(evm.ac), 'Custo real'],
    ['SPI', formatRatio(evm.spi), 'EV ÷ PV'],
    ['CPI', formatRatio(evm.cpi), 'EV ÷ AC'],
    ['CV', money(evm.cv), 'EV − AC'],
    ['SV', money(evm.sv), 'EV − PV'],
    ['EAC', money(evm.eac), 'BAC ÷ CPI'],
    ['ETC', money(evm.etc), 'EAC − AC'],
    ['VAC', money(evm.vac), 'BAC − EAC'],
  ];
  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Valor agregado</h1>
      </div>
      {!hasBaseline && <p className="info">Defina a linha de base para calcular PV e SPI.</p>}
      <div className="grid" style={{ marginBottom: 16 }}>
        {tiles.map(([label, value, hint]) => (
          <KpiTile key={label} label={label} value={value} hint={hint} />
        ))}
      </div>
      <p className="muted small">
        % do custo orçado não vinculado a pacotes: <span className="tb-mono">{formatPercent(f.unlinkedCostPct)}</span> — entra
        nos totais, fica fora do EVM.
      </p>
    </div>
  );
}
