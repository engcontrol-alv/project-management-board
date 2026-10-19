import type { ComponentType, ReactNode } from 'react';
import type { ImplementedModuleId } from '@/project/registry';

export type SectionDef = { path: string; label: string; element: ReactNode };

/** Telas de um módulo, registradas estaticamente em `app/registry.ts` (VIEWS). */
export type ModuleView = {
  id: ImplementedModuleId;
  sections: SectionDef[];
  reportSection?: ComponentType;
};

/** Seção de cada cadastro, para atalhos ("Abrir registro"). */
export const RECORD_SECTIONS: Record<string, string> = {
  'scope.requirements': '/projeto/scope/requisitos',
  'scope.wbs': '/projeto/scope/eap',
  'scope.deliverables': '/projeto/scope/entregaveis',
  'scope.changeRequests': '/projeto/scope/mudancas',
  'schedule.milestones': '/projeto/schedule/marcos',
  'governance.norms': '/projeto/governance/normas',
  'governance.meetings': '/projeto/governance/reunioes',
  'governance.lessons': '/projeto/governance/licoes',
  'stakeholders.parties': '/projeto/pessoas',
};

export const NEW_CHANGE_REQUEST_PATH = '/projeto/scope/mudancas?nova=1';
