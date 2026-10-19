import { currentBaseline } from '../derive';
import type { AlertRule } from './types';

export const baselinePackageDeleted: AlertRule = {
  id: 'baseline-package-deleted',
  requires: ['scope'],
  evaluate: ({ snapshot }) => {
    const b = currentBaseline(snapshot);
    if (!b) return [];
    return Object.keys(b.workPackages)
      .filter((id) => !(id in snapshot.scope.wbs))
      .map((id) => ({
        id: `baseline-package-deleted:${id}`,
        severity: 'amarelo' as const,
        message: 'Pacote da linha de base excluído sem mudança',
        action: { kind: 'openChangeRequest' as const },
      }));
  },
};
