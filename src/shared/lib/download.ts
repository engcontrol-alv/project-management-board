export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revogar na hora pode cancelar o download em máquinas lentas: o navegador ainda não leu o blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
