import { z } from 'zod';
import { isIsoDate, type IsoDate } from './dates';

/** Mensagens padrão em pt-BR. */
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      return { message: issue.received === 'undefined' || issue.received === 'null' ? 'campo obrigatório' : 'tipo inválido' };
    case 'invalid_enum_value':
    case 'invalid_literal':
    case 'invalid_union_discriminator':
      return { message: 'valor inválido' };
    case 'too_small':
      return { message: issue.type === 'string' ? 'campo obrigatório' : `deve ser no mínimo ${issue.minimum}` };
    case 'too_big':
      return { message: `deve ser no máximo ${issue.maximum}` };
    case 'unrecognized_keys':
      return { message: `campos não permitidos: ${issue.keys.join(', ')}` };
    default:
      return { message: ctx.defaultError };
  }
});

/** String não vazia tipada com um ID de marca. */
export function brandedId<T extends string>(): z.ZodType<T, z.ZodTypeDef, unknown> {
  return z.string().min(1) as unknown as z.ZodType<T, z.ZodTypeDef, unknown>;
}

export const isoDate = z.string().refine(isIsoDate, 'data inválida') as z.ZodType<IsoDate, z.ZodTypeDef, unknown>;

export const cents = z.number().int('deve ser um valor em centavos inteiros');

/** Mensagem curta "campo: problema" a partir de um erro do Zod. */
export function zodMessages(error: z.ZodError, prefix = ''): string[] {
  return error.issues.map((i) => `${prefix}${i.path.length ? `${i.path.join('.')}: ` : ''}${i.message}`);
}
