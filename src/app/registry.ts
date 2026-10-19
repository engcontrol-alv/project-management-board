import { governanceView } from '@/modules/governance/ui/view';
import { scheduleView } from '@/modules/schedule/ui/view';
import { scopeView } from '@/modules/scope/ui/view';
import { stakeholdersView } from '@/modules/stakeholders/ui/view';
import type { ModuleView } from '@/registers/module-view';
import type { ImplementedModuleId } from '@/project/registry';

/** Telas por módulo — esquecer um módulo é erro de compilação. */
export const VIEWS: { [K in ImplementedModuleId]: ModuleView } = {
  governance: governanceView,
  scope: scopeView,
  schedule: scheduleView,
  stakeholders: stakeholdersView,
};
