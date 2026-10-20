import type { Example } from '@/registers/types';
import type { Risk } from './model/risk';

/** Exemplos fictícios — nunca persistidos. */
export const riskExamples: Example<Risk>[] = [
  {
    title: 'Ameaça de fornecedor',
    explanation:
      'Probabilidade × impacto (1 a 3) dá a exposição. Com probabilidade % e impacto em custo, o valor esperado entra na comparação com a contingência.',
    values: {
      title: 'Atraso na importação do CLP redundante',
      nature: 'Ameaça',
      category: 'Fornecedor/Aquisição',
      rootCause: 'Prazo de fabricação do fabricante e desembaraço aduaneiro',
      probability: 2,
      impact: 3,
      responseType: 'Mitigar',
      responseAction: 'Emitir o pedido antecipado e diligenciar quinzenalmente',
      status: 'Em mitigação',
      probabilityPct: 40,
      costImpactCents: 8_000_000,
      scheduleImpactDays: 20,
    },
  },
  {
    title: 'Oportunidade',
    explanation: 'Oportunidades usam respostas próprias (Explorar, Melhorar, Compartilhar).',
    values: {
      title: 'Antecipar a montagem com a liberação parcial da área',
      nature: 'Oportunidade',
      category: 'Cronograma',
      probability: 2,
      impact: 2,
      responseType: 'Explorar',
      status: 'Identificado',
    },
  },
];
