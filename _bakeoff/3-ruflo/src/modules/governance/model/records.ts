import { z } from 'zod';
import type { LessonId, MeetingId, NormId, PartyId } from '@/core/ids';
import { idSchema, isoDate, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const NORM_TYPES = [
  'ISO',
  'ABNT/NBR',
  'NR',
  'IEC',
  'Padrão do cliente',
  'Regulatório/Órgão',
  'Outra',
] as const;

export const normSchema = z
  .object({
    id: idSchema<NormId>(),
    code: z.string(),
    /** Ex.: "ISO 9001:2015". */
    standard: requiredText('norma é obrigatória'),
    type: z.enum(NORM_TYPES),
    title: z.string(),
    notes: z.string(),
  })
  .strict();
export type Norm = z.infer<typeof normSchema>;

export const MEETING_TYPES = ['Status semanal', 'Comitê mensal', 'Revisão de fase', 'Outra'] as const;
export const MEETING_STATUSES = ['Agendada', 'Realizada', 'Cancelada'] as const;

/** "Realizada exige data ≤ hoje" é validado no comando (depende do relógio). */
export const meetingSchema = z
  .object({
    id: idSchema<MeetingId>(),
    code: z.string(),
    type: z.enum(MEETING_TYPES),
    date: isoDate,
    participantIds: z.array(idSchema<PartyId>()),
    decisions: z.string(),
    actions: z.string(),
    status: z.enum(MEETING_STATUSES),
  })
  .strict();
export type Meeting = z.infer<typeof meetingSchema>;

export const LESSON_TYPES = ['Ponto de melhoria', 'Boa prática'] as const;
export const LESSON_CATEGORIES = [
  'Técnica',
  'Metodologia',
  'Comercial/Cliente',
  'Fornecedores/Aquisição',
  'Equipe/Pessoas',
  'Comunicação',
  'Outro',
] as const;

export const lessonSchema = z
  .object({
    id: idSchema<LessonId>(),
    code: z.string(),
    title: requiredText('título é obrigatório'),
    type: z.enum(LESSON_TYPES),
    category: z.enum(LESSON_CATEGORIES),
    context: z.string(),
    recommendation: z.string(),
    date: nullableIsoDate,
    ownerId: idSchema<PartyId>().nullable(),
  })
  .strict();
export type Lesson = z.infer<typeof lessonSchema>;
