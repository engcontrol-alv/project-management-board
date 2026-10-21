import { z } from 'zod';
import type { CommunicationId, PartyId } from '@/core/ids';
import { idSchema, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const CHANNELS = ['E-mail', 'Reunião', 'Relatório', 'Portal do cliente', 'Telefone', 'Outro'] as const;
export const FREQUENCIES = ['Única', 'Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Por marco'] as const;

export const communicationSchema = z
  .object({
    id: idSchema<CommunicationId>(),
    code: z.string(),
    information: requiredText('informação é obrigatória'),
    recipientIds: z.array(idSchema<PartyId>()),
    channel: z.enum(CHANNELS),
    frequency: z.enum(FREQUENCIES),
    ownerId: idSchema<PartyId>().nullable(),
    nextDate: nullableIsoDate,
  })
  .strict();
export type Communication = z.infer<typeof communicationSchema>;
