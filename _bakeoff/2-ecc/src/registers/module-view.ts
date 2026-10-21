import type { ComponentType } from 'react';
import type { ImplementedModuleId } from '@/project/registry';

export type SectionDef = { path: string; label: string; Component: ComponentType };

export type ModuleView = {
  id: ImplementedModuleId;
  sections: SectionDef[];
  reportSection?: ComponentType;
};
