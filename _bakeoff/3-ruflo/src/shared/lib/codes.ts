export function formatCode(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

/** Próximo código hierárquico da EAP entre os irmãos (`1`, `1.2`, `1.2.3`). */
export function nextWbsCode(siblingCodes: string[], parentCode: string | null): string {
  const last = siblingCodes.map((c) => Number(c.split('.').pop()) || 0);
  const next = Math.max(0, ...last) + 1;
  return parentCode ? `${parentCode}.${next}` : String(next);
}

/** Comparação natural de códigos (`1.10` depois de `1.9`; `MUD-010` depois de `MUD-009`). */
export function compareCodes(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { numeric: true });
}
