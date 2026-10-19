import { z } from 'zod';
import { isIsoDate } from './dates';

export const isoDate = z.string().refine(isIsoDate, { message: 'data inválida' });
export const nullableIsoDate = isoDate.nullable();
export const cents = z.number().int({ message: 'valor monetário deve estar em centavos inteiros' });

/** Mensagens de validação em pt-BR para os casos genéricos do Zod. */
export const ptErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null')
        return { message: 'é obrigatório' };
      return { message: 'tipo inválido' };
    case z.ZodIssueCode.invalid_enum_value:
    case z.ZodIssueCode.invalid_literal:
      return { message: 'valor não permitido' };
    case z.ZodIssueCode.invalid_union_discriminator:
      return { message: 'é obrigatório' };
    case z.ZodIssueCode.unrecognized_keys:
      return { message: `campos não permitidos: ${issue.keys.join(', ')}` };
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: 'é obrigatório' };
      if (issue.type === 'array') return { message: `exige ao menos ${String(issue.minimum)} item` };
      return { message: `deve ser no mínimo ${String(issue.minimum)}` };
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `até ${String(issue.maximum)} caracteres` };
      return { message: `deve ser no máximo ${String(issue.maximum)}` };
    default:
      return { message: ctx.defaultError };
  }
};

export function issuesToMessages(error: z.ZodError, labels: Record<string, string> = {}): string[] {
  return error.issues.map((i) => {
    const path = i.path.join('.');
    const label = labels[path] ?? path;
    return label ? `${label}: ${i.message}` : i.message;
  });
}

/** Schema de ID não vazio, tipado com a marca do domínio. */
export function idSchema<T extends string>(): z.ZodType<T, z.ZodTypeDef, unknown> {
  return z.string().min(1) as unknown as z.ZodType<T, z.ZodTypeDef, unknown>;
}

/** Texto obrigatório (sem transformar o valor). */
export function requiredText(message = 'é obrigatório') {
  return z.string().refine((s) => s.trim().length > 0, { message });
}
