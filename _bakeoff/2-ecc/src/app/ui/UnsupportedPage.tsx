import { Card } from '@/shared/ui/Card';

export function UnsupportedPage() {
  return (
    <main className="tb-main" style={{ maxWidth: 720 }}>
      <Card title="Armazenamento indisponível">
        <p>Este navegador não permite salvar dados. Use uma janela normal ou outro navegador.</p>
      </Card>
    </main>
  );
}
