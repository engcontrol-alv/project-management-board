import type { Example } from '@/registers/types';
import type { Lesson, Meeting, Norm } from './model/records';

/** Exemplos fictícios — nunca persistidos. */
export const normExamples: Example<Norm>[] = [
  {
    title: 'Norma de qualidade',
    explanation: 'Liste as normas que o projeto precisa atender; o código aparece no painel executivo.',
    values: { standard: 'ISO 9001:2015', type: 'ISO', title: 'Sistemas de gestão da qualidade — Requisitos', notes: '' },
  },
  {
    title: 'Norma regulamentadora',
    explanation: 'Normas regulamentadoras e de instalações elétricas também entram aqui.',
    values: { standard: 'NR-10', type: 'NR', title: 'Segurança em instalações e serviços em eletricidade', notes: '' },
  },
];

export const meetingExamples: Example<Meeting>[] = [
  {
    title: 'Reunião de status',
    explanation: 'Registre decisões e ações geradas. Reunião "Realizada" não pode ter data futura.',
    values: {
      type: 'Status semanal',
      date: '2026-01-12',
      decisions: 'Antecipar a compra dos disjuntores.',
      actions: 'Emitir pedido até sexta-feira.',
      status: 'Agendada',
    },
  },
];

export const lessonExamples: Example<Lesson>[] = [
  {
    title: 'Ponto de melhoria',
    explanation: 'O que aconteceu e o que recomendar para os próximos projetos.',
    values: {
      title: 'Validar o layout do painel com o cliente antes do TAF',
      type: 'Ponto de melhoria',
      category: 'Técnica',
      context: 'Ajustes de layout pedidos durante o TAF atrasaram a expedição.',
      recommendation: 'Incluir revisão de layout com o cliente ao fim da engenharia.',
      date: null,
    },
  },
];
