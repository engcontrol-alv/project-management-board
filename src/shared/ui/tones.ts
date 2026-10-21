/** Mesmo formato de `Rag` (core); `shared` não depende de `core`. */
export type RagValue = 'verde' | 'amarelo' | 'vermelho' | 'n/a';

export type Tone = 'red' | 'amber' | 'gold' | 'green' | 'blue' | 'gray';

export const RAG_LABEL: Record<RagValue, string> = {
  verde: 'Verde',
  amarelo: 'Amarelo',
  vermelho: 'Vermelho',
  'n/a': 'Sem dados',
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
  // comunicação e engajamento
  'Em dia': 'green',
  Atrasada: 'red',
  'Sem data': 'gray',
  'Gerenciar de perto': 'red',
  'Manter satisfeito': 'amber',
  'Manter informado': 'blue',
  Monitorar: 'gray',
  Apoiador: 'green',
  Neutro: 'gold',
  Opositor: 'red',
  // finanças
  Planejado: 'gray',
  'Em andamento': 'gold',
  Realizado: 'green',
  'Em disputa': 'red',
  'A solicitar': 'gray',
  'Em cotação': 'gold',
  'Pedido emitido': 'blue',
  Contratado: 'green',
  'Em produção': 'gold',
  'Em trânsito': 'gold',
  'Em desembaraço aduaneiro': 'amber',
  Recebido: 'green',
  'Serviço em execução': 'gold',
  'Serviço concluído': 'green',
  Custo: 'gray',
  Receita: 'green',
  // riscos
  Identificado: 'gray',
  'Em monitoramento': 'blue',
  'Em mitigação': 'gold',
  Materializado: 'red',
  Encerrado: 'gray',
  Crítico: 'red',
  Moderado: 'blue',
  'Não avaliado': 'gray',
  Ameaça: 'red',
  Oportunidade: 'green',
  // recursos
  Planejada: 'gray',
  Ativa: 'green',
  Encerrada: 'gray',
  Sobrealocado: 'red',
  // fases do ciclo de vida
  Concluída: 'green',
  Atual: 'blue',
  Prevista: 'gray',
  'Dentro da capacidade': 'green',
  'Pessoa interna': 'blue',
  'Pessoa terceirizada': 'gold',
  Equipe: 'green',
  Equipamento: 'gray',
};

export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? 'gray';
}
