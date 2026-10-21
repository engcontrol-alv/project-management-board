import { z } from 'zod';
import type { DeliverableId, MilestoneId, PartyId, WorkPackageId } from '@/core/ids';
import { brandedId, isoDate } from '@/shared/lib/zod';

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
export const PHYSICAL_STATUSES = ['Não iniciado', 'Em execução', 'Concluído', 'Aceito pelo cliente', 'Cancelado'] as const;
export const TEMPLATES = ['Interno', 'Externo (cliente)'] as const;
export type DocTemplate = (typeof TEMPLATES)[number];

export function typesFor(category: string): readonly string[] {
  if (category === 'Documentação de engenharia') return ENGINEERING_DOC_TYPES;
  if (category === 'Documentação de gerenciamento de projeto') return MANAGEMENT_DOC_TYPES;
  if (category === 'Entregável físico / serviço') return PHYSICAL_TYPES;
  return [];
}

export function statusesFor(category: string): readonly string[] {
  if (category === 'Entregável físico / serviço') return PHYSICAL_STATUSES;
  return isDocumentCategory(category) ? DOC_STATUSES : [];
}

export function isDocumentCategory(category: string): boolean {
  return category === 'Documentação de engenharia' || category === 'Documentação de gerenciamento de projeto';
}

const base = {
  id: brandedId<DeliverableId>(),
  code: z.string().min(1),
  name: z.string().trim().min(1),
  workPackageId: brandedId<WorkPackageId>().nullable(),
  milestoneId: brandedId<MilestoneId>().nullable(),
  plannedDate: isoDate.nullable(),
  actualDate: isoDate.nullable(),
  ownerId: brandedId<PartyId>().nullable(),
  clientApproval: z.boolean(),
};

const docFields = {
  revision: z.string(),
  template: z.enum(TEMPLATES).nullable(),
  status: z.enum(DOC_STATUSES),
};

export const deliverableSchema = z.discriminatedUnion(
  'category',
  [
    z
      .object({ ...base, ...docFields, category: z.literal('Documentação de engenharia'), type: z.enum(ENGINEERING_DOC_TYPES) })
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
  ],
  { errorMap: (issue, ctx) => ({ message: issue.code === 'invalid_union_discriminator' ? 'campo obrigatório' : ctx.defaultError }) },
);

export type Deliverable = z.infer<typeof deliverableSchema>;
export type DocumentDeliverable = Extract<Deliverable, { template: unknown }>;
