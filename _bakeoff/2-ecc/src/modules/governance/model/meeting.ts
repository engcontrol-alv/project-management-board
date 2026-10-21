import { z } from 'zod';
import type { MeetingId, PartyId } from '@/core/ids';
import { brandedId, isoDate } from '@/shared/lib/zod';

export const MEETING_TYPES = ['Status semanal', 'Comitê mensal', 'Revisão de fase', 'Outra'] as const;
export const MEETING_STATUSES = ['Agendada', 'Realizada', 'Cancelada'] as const;

export const meetingSchema = z
  .object({
    id: brandedId<MeetingId>(),
    code: z.string().min(1),
    type: z.enum(MEETING_TYPES),
    date: isoDate,
    participantIds: z.array(brandedId<PartyId>()),
    decisions: z.string(),
    actions: z.string(),
    status: z.enum(MEETING_STATUSES),
  })
  .strict();

export type Meeting = z.infer<typeof meetingSchema>;
