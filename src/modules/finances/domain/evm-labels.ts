import type { Evm } from './evm';

/** Indicador de valor agregado com nome em português, sigla e de onde vem o dado. */
export type EvmIndicatorDef = {
  key: keyof Evm;
  label: string;
  hint: string;
  format: 'money' | 'ratio';
};

/** Modo essencial: os 6 indicadores fundamentais, exibidos por padrão. */
export const EVM_ESSENTIAL: EvmIndicatorDef[] = [
  {
    key: 'bac',
    label: 'Orçamento Total (BAC)',
    hint: 'Soma do orçamento planejado em Finanças',
    format: 'money',
  },
  {
    key: 'pv',
    label: 'Previsto até a Data (PV)',
    hint: 'Quanto deveria estar pronto hoje pela Linha de Base',
    format: 'money',
  },
  {
    key: 'ev',
    label: 'Trabalho Entregue (EV)',
    hint: 'Orçamento × % de avanço físico dos pacotes na EAP (Escopo)',
    format: 'money',
  },
  {
    key: 'ac',
    label: 'Custo Realizado (AC)',
    hint: 'Total já gasto/realizado nos itens de Finanças',
    format: 'money',
  },
  {
    key: 'cpi',
    label: 'Eficiência de Custo (CPI)',
    hint: 'Trabalho Entregue ÷ Custo Realizado (meta ≥ 1,00)',
    format: 'ratio',
  },
  {
    key: 'spi',
    label: 'Ritmo do Prazo (SPI)',
    hint: 'Trabalho Entregue ÷ Previsto até a Data (meta ≥ 1,00)',
    format: 'ratio',
  },
];

/** Modo avançado: projeções e variâncias, reveladas sob demanda. */
export const EVM_ADVANCED: EvmIndicatorDef[] = [
  {
    key: 'eac',
    label: 'Estimativa no Término (EAC)',
    hint: 'Orçamento Total ÷ Eficiência de Custo: custo final se o ritmo de gasto continuar',
    format: 'money',
  },
  {
    key: 'etc',
    label: 'Estimativa para Terminar (ETC)',
    hint: 'Estimativa no Término − Custo Realizado: quanto ainda falta gastar',
    format: 'money',
  },
  {
    key: 'vac',
    label: 'Variação no Término (VAC)',
    hint: 'Orçamento Total − Estimativa no Término; negativo = estouro previsto',
    format: 'money',
  },
  {
    key: 'cv',
    label: 'Variação de Custo (CV)',
    hint: 'Trabalho Entregue − Custo Realizado; negativo = acima do custo',
    format: 'money',
  },
  {
    key: 'sv',
    label: 'Variação de Prazo (SV)',
    hint: 'Trabalho Entregue − Previsto até a Data; negativo = atrasado',
    format: 'money',
  },
];

export const EVM_ADVANCED_TOGGLE = 'Ver projeções avançadas (EAC, Variâncias)';

/** O que falta preencher para os indicadores saírem (dica da sub-aba Valor agregado). */
export function evmMissingInputs(evm: Evm, hasBaseline: boolean): string[] {
  const missing: string[] = [];
  if (evm.bac === 0)
    missing.push(
      'Cadastre linhas de orçamento em Finanças › Orçamento, vinculadas a pacotes da EAP, para formar o Orçamento Total (BAC).',
    );
  if (!hasBaseline)
    missing.push(
      'Defina a Linha de Base (painel "Linha de base" na aba Geral) para calcular Previsto até a Data (PV), Ritmo do Prazo (SPI) e Variação de Prazo (SV).',
    );
  if (evm.bac > 0 && evm.ac === 0)
    missing.push(
      'Lance o custo realizado nas linhas de orçamento ou contratações para calcular Eficiência de Custo (CPI) e as projeções.',
    );
  if (evm.bac > 0 && evm.ev === 0)
    missing.push(
      'Informe o % de avanço físico dos pacotes na EAP (Escopo) para medir o Trabalho Entregue (EV).',
    );
  return missing;
}
