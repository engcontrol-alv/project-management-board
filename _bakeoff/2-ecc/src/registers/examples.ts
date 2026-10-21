/** Exemplo de preenchimento: exibido na UI, nunca salvo, contado ou exportado. */
export type Example<E> = {
  title: string;
  explanation: string;
  values: Partial<Omit<E, 'id' | 'code'>>;
};
