import type { Example } from '@/registers/examples';
import type { Party } from './index';

/** Exemplos fictícios; nunca persistidos. */
export const partyExamples: Example<Party>[] = [
  {
    title: 'Pessoa da equipe',
    explanation: 'Pessoas podem ser responsáveis, gerente, patrocinador, solicitantes e aprovadores.',
    values: { kind: 'Pessoa', name: 'Maria Exemplo', position: 'Engenheira de projetos', contact: 'maria@exemplo.com', internal: 'Interno', notes: '' } as Partial<Party>,
  },
  {
    title: 'Organização cliente',
    explanation: 'Organizações têm um ou mais papéis; o cliente da ficha do projeto precisa do papel Cliente.',
    values: { kind: 'Organização', name: 'Indústria Exemplo Ltda.', roles: ['Cliente'], taxId: '', country: 'Brasil', contact: '', internal: 'Externo', notes: '' } as Partial<Party>,
  },
];
