import type { Example } from '@/registers/types';
import type { Communication } from './model/communication';
import type { Party } from './model/party';

/** Exemplos fictícios — nunca persistidos. */
export const partyExamples: Example<Party>[] = [
  {
    title: 'Pessoa da equipe',
    explanation:
      'Pessoas aparecem nos campos "Responsável", patrocinador e gerente. Vincule à organização em que trabalham.',
    values: {
      kind: 'Pessoa',
      name: 'Marina Exemplo',
      position: 'Engenheira de projetos',
      contact: 'marina@empresa-exemplo.com',
      internal: 'Interno',
      notes: '',
    },
  },
  {
    title: 'Organização cliente',
    explanation:
      'Organizações têm um ou mais papéis. O cliente da ficha do projeto precisa ter o papel Cliente; fornecedores serão usados nas contratações.',
    values: {
      kind: 'Organização',
      name: 'Indústria Fictícia S.A.',
      roles: ['Cliente'],
      taxId: '',
      country: 'Brasil',
      contact: 'compras@industria-ficticia.com',
      internal: 'Externo',
      notes: '',
    },
  },
];

export const communicationExamples: Example<Communication>[] = [
  {
    title: 'Relatório semanal ao cliente',
    explanation:
      'Cada linha diz o que é comunicado, para quem, por qual canal e com que frequência. A próxima data vencida aparece como "Atrasada".',
    values: { information: 'Relatório semanal de avanço físico e marcos', channel: 'Relatório', frequency: 'Semanal' },
  },
  {
    title: 'Diligenciamento de fornecedor crítico',
    explanation: 'Fornecedores em "Gerenciar de perto" precisam de um plano de comunicação, senão o RAG fica amarelo.',
    values: { information: 'Reunião de diligenciamento da fabricação dos painéis', channel: 'Reunião', frequency: 'Quinzenal' },
  },
];
