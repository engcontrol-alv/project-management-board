export function formatCode(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

/** Próximo código hierárquico da EAP entre os irmãos de `parentCode`. */
export function nextWbsCode(siblingCodes: string[], parentCode: string | null): string {
  const last = siblingCodes.reduce((max, code) => {
    const n = Number(code.split('.').at(-1));
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return parentCode ? `${parentCode}.${last + 1}` : String(last + 1);
}
