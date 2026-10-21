import type { Example } from '@/registers/examples';
import type { Lesson, Meeting, Norm } from './index';

/** Exemplos fictícios; nunca persistidos. */
export const normExamples: Example<Norm>[] = [
  {
    title: 'Norma de sistema de gestão',
    explanation: 'Liste as normas que o projeto precisa atender; o código da norma é o identificador oficial.',
    values: { standard: 'ISO 9001:2015', type: 'ISO', title: 'Sistemas de gestão da qualidade', notes: '' },
  },
  {
    title: 'Norma regulamentadora',
    explanation: 'Normas de segurança aplicáveis às atividades de campo.',
    values: { standard: 'NR-10', type: 'NR', title: 'Segurança em instalações e serviços em eletricidade', notes: '' },
  },
];

export const meetingExamples: Example<Meeting>[] = [
  {
    title: 'Reunião de status',
    explanation: 'Registre decisões e ações; "Realizada" exige data igual ou anterior a hoje.',
    values: {
      type: 'Status semanal',
      participantIds: [],
      decisions: 'Antecipar a compra dos cabos.',
      actions: 'Emitir pedido até sexta-feira.',
      status: 'Agendada',
    },
  },
];

export const lessonExamples: Example<Lesson>[] = [
  {
    title: 'Ponto de melhoria',
    explanation: 'Descreva o contexto e a recomendação para os próximos projetos.',
    values: {
      title: 'Validar folhas de dados com o cliente antes da compra',
      type: 'Ponto de melhoria',
      category: 'Técnica',
      context: 'Equipamento comprado com especificação desatualizada.',
      recommendation: 'Incluir aprovação formal da folha de dados como predecessora da compra.',
      date: null,
    },
  },
];
