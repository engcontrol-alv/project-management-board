import { diffDays, type IsoDate } from '@/shared/lib/dates';

/** Pacote para o EVM: BAC em centavos da moeda base e datas da linha de base (`null` = fora da LB). */
export type EvmPackage = {
  id: string;
  percentComplete: number;
  bac: number;
  baseline: { start: IsoDate; finish: IsoDate; duration: number } | null;
};

export type Evm = {
  bac: number;
  pv: number | null;
  ev: number;
  ac: number;
  spi: number | null;
  cpi: number | null;
  cv: number;
  sv: number | null;
  eac: number | null;
  etc: number | null;
  vac: number | null;
};

/** Fração planejada na data (linear na LB, término inclusivo), igual ao % físico planejado. */
function plannedFraction(b: NonNullable<EvmPackage['baseline']>, statusDate: IsoDate): number {
  if (b.duration === 0) return statusDate >= b.start ? 1 : 0;
  return Math.min(1, Math.max(0, (diffDays(b.start, statusDate) + 1) / b.duration));
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

/** Valor agregado (SPEC §8.2). Divisão por zero → `null` ("n/a"), nunca Infinity/NaN. */
export function computeEvm(
  packages: EvmPackage[],
  actualByPackage: Record<string, number>,
  statusDate: IsoDate,
): Evm {
  const bac = packages.reduce((s, p) => s + p.bac, 0);
  const ev = packages.reduce((s, p) => s + (p.bac * p.percentComplete) / 100, 0);
  const ac = packages.reduce((s, p) => s + (actualByPackage[p.id] ?? 0), 0);
  const inBaseline = packages.filter((p) => p.baseline);
  const pv = inBaseline.length
    ? inBaseline.reduce((s, p) => s + p.bac * plannedFraction(p.baseline!, statusDate), 0)
    : null;
  const spi = bac > 0 && pv !== null ? ratio(ev, pv) : null;
  const cpi = bac > 0 ? ratio(ev, ac) : null;
  const eac = cpi ? bac / cpi : null;
  return {
    bac,
    pv,
    ev,
    ac,
    spi,
    cpi,
    cv: ev - ac,
    sv: pv === null ? null : ev - pv,
    eac,
    etc: eac === null ? null : eac - ac,
    vac: eac === null ? null : bac - eac,
  };
}
