import { z } from 'zod';
import type { DeliverableId, MilestoneId, PartyId, WorkPackageId } from '@/core/ids';
import { idSchema, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const DELIVERABLE_CATEGORIES = [
  'Documentação de engenharia',
  'Documentação de gerenciamento de projeto',
  'Entregável físico / serviço',
] as const;
export type DeliverableCategory = (typeof DELIVERABLE_CATEGORIES)[number];

export const ENGINEERING_DOC_TYPES = [
  'Memorial descritivo',
  'Memorial de cálculo',
  'Diagrama (P&ID, unifilar, elétrico)',
  'Desenho técnico',
  'Especificação técnica',
  'Folha de dados',
  'Manual de operação/manutenção',
  'Relatório de teste (TAF/TAC/TAP/TDS)',
  'Data book',
  'Outro',
] as const;
export const MANAGEMENT_DOC_TYPES = [
  'Cronograma',
  'Plano de projeto',
  'Ata de reunião',
  'Relatório de status',
  'Relatório de medição',
  'Termo de abertura',
  'Termo de encerramento',
  'Outro',
] as const;
export const PHYSICAL_TYPES = [
  'Equipamento',
  'Painel/Sistema',
  'Instalação/Montagem',
  'Comissionamento',
  'Treinamento',
  'Serviço de campo',
  'Outro',
] as const;
export const DOC_STATUSES = [
  'Não iniciado',
  'Em elaboração',
  'Em revisão interna',
  'Emitido ao cliente',
  'Comentado',
  'Aprovado',
  'Cancelado',
] as const;
export const PHYSICAL_STATUSES = [
  'Não iniciado',
  'Em execução',
  'Concluído',
  'Aceito pelo cliente',
  'Cancelado',
] as const;
export const DOC_TEMPLATES = ['Interno', 'Externo (cliente)'] as const;
export type DocTemplate = (typeof DOC_TEMPLATES)[number];

export const DOC_CATEGORIES: readonly DeliverableCategory[] = [
  'Documentação de engenharia',
  'Documentação de gerenciamento de projeto',
];

export function typesFor(category: string): readonly string[] {
  if (category === 'Documentação de engenharia') return ENGINEERING_DOC_TYPES;
  if (category === 'Documentação de gerenciamento de projeto') return MANAGEMENT_DOC_TYPES;
  if (category === 'Entregável físico / serviço') return PHYSICAL_TYPES;
  return [];
}

export function statusesFor(category: string): readonly string[] {
  if (category === 'Entregável físico / serviço') return PHYSICAL_STATUSES;
  if (DOC_CATEGORIES.includes(category as DeliverableCategory)) return DOC_STATUSES;
  return [];
}

const base = {
  id: idSchema<DeliverableId>(),
  code: z.string(),
  name: requiredText('nome é obrigatório'),
  workPackageId: idSchema<WorkPackageId>().nullable(),
  milestoneId: idSchema<MilestoneId>().nullable(),
  plannedDate: nullableIsoDate,
  actualDate: nullableIsoDate,
  ownerId: idSchema<PartyId>().nullable(),
  clientApproval: z.boolean(),
};

const docFields = {
  revision: z.string(),
  /** `null` = herda o template da Governança. */
  template: z.enum(DOC_TEMPLATES).nullable(),
  status: z.enum(DOC_STATUSES),
};

export const deliverableSchema = z.discriminatedUnion('category', [
  z
    .object({
      ...base,
      ...docFields,
      category: z.literal('Documentação de engenharia'),
      type: z.enum(ENGINEERING_DOC_TYPES),
    })
    .strict(),
  z
    .object({
      ...base,
      ...docFields,
      category: z.literal('Documentação de gerenciamento de projeto'),
      type: z.enum(MANAGEMENT_DOC_TYPES),
    })
    .strict(),
  z
    .object({
      ...base,
      category: z.literal('Entregável físico / serviço'),
      type: z.enum(PHYSICAL_TYPES),
      status: z.enum(PHYSICAL_STATUSES),
    })
    .strict(),
]);

export type Deliverable = z.infer<typeof deliverableSchema>;
export type DocumentDeliverable = Extract<Deliverable, { revision: string }>;

export function isDocument(d: Deliverable): d is DocumentDeliverable {
  return d.category !== 'Entregável físico / serviço';
}
