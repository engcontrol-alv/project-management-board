/** Mesmo formato de `Rag` (core); `shared` não depende de `core`. */
export type RagValue = 'verde' | 'amarelo' | 'vermelho' | 'n/a';

export type Tone = 'red' | 'amber' | 'gold' | 'green' | 'blue' | 'gray';

export function ragTone(r: RagValue): Tone {
  if (r === 'verde') return 'green';
  if (r === 'amarelo') return 'gold';
  if (r === 'vermelho') return 'red';
  return 'gray';
}

export const RAG_LABEL: Record<RagValue, string> = {
  verde: 'Verde',
  amarelo: 'Amarelo',
  vermelho: 'Vermelho',
  'n/a': 'n/a',
};

/** Tons dos selos de status usados nos cadastros. */
const STATUS_TONES: Record<string, Tone> = {
  // situação de requisito
  Concluído: 'green',
  'Gap crítico': 'red',
  'Não validado': 'amber',
  Pendente: 'gray',
  // prioridade
  Alta: 'red',
  Média: 'gold',
  Baixa: 'green',
  // marcos
  'No prazo': 'green',
  Atenção: 'gold',
  Atrasado: 'red',
  // mudanças
  Solicitada: 'gray',
  'Em análise': 'gold',
  Aprovada: 'green',
  Rejeitada: 'red',
  Implementada: 'blue',
  Cancelada: 'gray',
  // entregáveis
  'Não iniciado': 'gray',
  'Em elaboração': 'gold',
  'Em revisão interna': 'gold',
  'Emitido ao cliente': 'blue',
  Comentado: 'amber',
  Aprovado: 'green',
  Cancelado: 'gray',
  'Em execução': 'gold',
  'Aceito pelo cliente': 'green',
  // reuniões
  Agendada: 'gray',
  Realizada: 'green',
  // lições
  'Ponto de melhoria': 'amber',
  'Boa prática': 'green',
  // impacto
  Alto: 'red',
  Médio: 'gold',
  Baixo: 'green',
  Sim: 'red',
  Não: 'gray',
};

export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? 'gray';
}
