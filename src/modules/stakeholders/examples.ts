import type { Example } from '@/registers/types';
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
