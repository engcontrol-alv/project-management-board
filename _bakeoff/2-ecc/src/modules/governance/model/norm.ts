import { z } from 'zod';
import type { NormId } from '@/core/ids';
import { brandedId } from '@/shared/lib/zod';

export const NORM_TYPES = ['ISO', 'ABNT/NBR', 'NR', 'IEC', 'Padrão do cliente', 'Regulatório/Órgão', 'Outra'] as const;

export const normSchema = z
  .object({
    id: brandedId<NormId>(),
    code: z.string().min(1),
    standard: z.string().trim().min(1),
    type: z.enum(NORM_TYPES),
    title: z.string(),
    notes: z.string(),
  })
  .strict();

export type Norm = z.infer<typeof normSchema>;
