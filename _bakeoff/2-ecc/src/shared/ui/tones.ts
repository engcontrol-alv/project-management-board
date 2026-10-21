export type Tone = 'red' | 'amber' | 'gold' | 'green' | 'blue' | 'gray';

export function ragTone(rag: string): Tone {
  if (rag === 'verde') return 'green';
  if (rag === 'amarelo') return 'gold';
  if (rag === 'vermelho') return 'red';
  return 'gray';
}

export function ragLabel(rag: string): string {
  if (rag === 'verde') return 'Verde';
  if (rag === 'amarelo') return 'Amarelo';
  if (rag === 'vermelho') return 'Vermelho';
  return 'n/a';
}

/** Tons por valor de status, no espírito das paletas do protótipo. */
const STATUS_TONES: Record<string, Tone> = {
  Concluído: 'green',
  Aprovado: 'green',
  'Aceito pelo cliente': 'green',
  Validado: 'green',
  Atendido: 'green',
  Realizada: 'green',
  'No prazo': 'green',
  Implementada: 'blue',
  Aprovada: 'green',
  'Em análise': 'gold',
  'Em elaboração': 'gold',
  'Em execução': 'blue',
  'Em revisão interna': 'gold',
  'Emitido ao cliente': 'blue',
  Comentado: 'amber',
  Atenção: 'gold',
  Pendente: 'gray',
  'Não validado': 'amber',
  Atrasado: 'red',
  'Gap crítico': 'red',
  Rejeitada: 'red',
  Cancelada: 'gray',
  Cancelado: 'gray',
  Solicitada: 'gray',
  Agendada: 'gray',
  'Não iniciado': 'gray',
  Alta: 'red',
  Média: 'gold',
  Baixa: 'green',
  Sim: 'red',
  Não: 'gray',
};

export function statusTone(value: string): Tone {
  return STATUS_TONES[value] ?? 'gray';
}
