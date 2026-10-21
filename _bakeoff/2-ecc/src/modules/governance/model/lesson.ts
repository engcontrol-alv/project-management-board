import { z } from 'zod';
import type { LessonId, PartyId } from '@/core/ids';
import { brandedId, isoDate } from '@/shared/lib/zod';

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
    id: brandedId<LessonId>(),
    code: z.string().min(1),
    title: z.string().trim().min(1),
    type: z.enum(LESSON_TYPES),
    category: z.enum(LESSON_CATEGORIES),
    context: z.string(),
    recommendation: z.string(),
    date: isoDate.nullable(),
    ownerId: brandedId<PartyId>().nullable(),
  })
  .strict();

export type Lesson = z.infer<typeof lessonSchema>;
