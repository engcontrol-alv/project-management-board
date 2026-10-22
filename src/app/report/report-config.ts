import type { ImplementedModuleId } from '@/project/registry';

export type ReportSectionId = 'overview' | 'governance' | 'scope' | 'schedule' | 'finances' | 'risks' | 'resources_stakeholders';

export type ReportSectionDef = {
  id: ReportSectionId;
  /** Título no relatório. */
  title: string;
  /** Rótulo da caixa no compositor (o título abre o rótulo). */
  label: string;
  /** Basta um destes módulos ligado; vazio = sempre disponível. */
  modules: ImplementedModuleId[];
};

export const REPORT_SECTIONS: ReportSectionDef[] = [
  { id: 'overview', title: 'Resumo executivo', label: 'Resumo executivo, saúde dos 7 domínios e alertas ativos', modules: [] },
  { id: 'governance', title: 'Governança', label: 'Governança — identidade do contrato, fases, cláusula de multa e mudanças', modules: [] },
  { id: 'scope', title: 'Escopo', label: 'Escopo — pacotes de trabalho e entregáveis com TAF/FAT e TAC/SAT', modules: ['scope'] },
  { id: 'schedule', title: 'Cronograma', label: 'Cronograma — marcos contratuais e caminho crítico', modules: ['schedule'] },
  { id: 'finances', title: 'Finanças', label: 'Finanças — EVM, provisão de multa, orçado × comprometido × realizado e Curva S', modules: ['finances'] },
  { id: 'risks', title: 'Riscos', label: 'Riscos — matriz e riscos abertos Alto/Crítico', modules: ['risks'] },
  {
    id: 'resources_stakeholders',
    title: 'Recursos e Partes Interessadas',
    label: 'Recursos e Partes Interessadas — carga, fornecedores e comunicações pendentes',
    modules: ['resources', 'stakeholders'],
  },
];

export type ReportPreset = 'board' | 'full';

export const PRESETS: { id: ReportPreset; label: string; sections: ReportSectionId[] }[] = [
  { id: 'board', label: 'Resumo de Diretoria (1-2 págs)', sections: ['overview', 'finances', 'risks'] },
  { id: 'full', label: 'Relatório Técnico Completo', sections: REPORT_SECTIONS.map((s) => s.id) },
];

export function availableSections(enabled: Record<ImplementedModuleId, boolean>): Set<ReportSectionId> {
  return new Set(REPORT_SECTIONS.filter((s) => s.modules.length === 0 || s.modules.some((m) => enabled[m])).map((s) => s.id));
}

/** Seções do preset que estão disponíveis, na ordem do relatório. */
export function presetSelection(preset: ReportPreset, enabled: Record<ImplementedModuleId, boolean>): Set<ReportSectionId> {
  const available = availableSections(enabled);
  const wanted = new Set(PRESETS.find((p) => p.id === preset)!.sections);
  return new Set(REPORT_SECTIONS.map((s) => s.id).filter((id) => wanted.has(id) && available.has(id)));
}

export type ReportRequest = { sections: Set<ReportSectionId>; notes: string };

export const NOTES_MAX = 600;
