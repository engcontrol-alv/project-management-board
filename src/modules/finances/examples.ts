import type { Example } from '@/registers/types';
import type { BudgetLine } from './model/budget-line';
import type { Procurement } from './model/procurement';

/** Exemplos fictícios de automação industrial — nunca persistidos. */
export const budgetLineExamples: Example<BudgetLine>[] = [
  {
    title: 'Mão de obra de engenharia',
    explanation:
      'Custos que não são contratações (equipe própria, logística). Ligue ao pacote da EAP para entrar no EVM; "Realizado" exige valor e data reais.',
    values: {
      description: 'Horas de engenharia de automação',
      kind: 'Custo',
      nature: 'OPEX',
      category: 'Mão de obra',
      currency: 'BRL',
      budgetedCents: 18_000_000,
      status: 'Em andamento',
    },
  },
  {
    title: 'Reserva de contingência',
    explanation: 'Linhas da categoria Contingência formam a reserva, comparada ao valor esperado dos riscos abertos.',
    values: { description: 'Reserva de contingência (8%)', kind: 'Custo', nature: 'OPEX', category: 'Contingência', currency: 'BRL', budgetedCents: 6_000_000, status: 'Planejado' },
  },
  {
    title: 'Faturamento de marco',
    explanation: 'Receitas não entram no EVM; aparecem no fluxo de caixa. Ligue ao marco de faturamento do Cronograma.',
    values: { description: 'Faturamento de 30% — engenharia aprovada', kind: 'Receita', nature: 'OPEX', category: 'Marco contratual/Faturamento', currency: 'BRL', budgetedCents: 25_000_000, status: 'Planejado' },
  },
];

export const procurementExamples: Example<Procurement>[] = [
  {
    title: 'Licenças do software SCADA (importado)',
    explanation:
      'Produto importado em moeda estrangeira: informe o país e a taxa para a moeda base. O fornecedor é obrigatório e precisa ter papel Fornecedor.',
    values: {
      description: 'Licenças SCADA e servidor de históricos',
      type: 'Produto',
      nature: 'CAPEX',
      origin: 'Importado',
      country: 'Alemanha',
      currency: 'USD',
      rate: 5.1,
      criticality: 'Alta',
      budgetedCents: 4_500_000,
      contractStatus: 'Em cotação',
      deliveryStatus: 'Não iniciado',
    },
  },
  {
    title: 'Montagem eletromecânica (serviço)',
    explanation: 'Serviços usam os status "Serviço em execução" e "Serviço concluído". Comprometido > 0 exige pedido ou contrato.',
    values: {
      description: 'Montagem dos painéis e lançamento de cabos',
      type: 'Serviço',
      nature: 'CAPEX',
      origin: 'Nacional',
      currency: 'BRL',
      criticality: 'Média',
      budgetedCents: 32_000_000,
      committedCents: 31_500_000,
      contractStatus: 'Contratado',
      deliveryStatus: 'Serviço em execução',
    },
  },
];
