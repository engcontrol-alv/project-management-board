import { currentBaseline } from '../derive';
import type { AlertRule } from './types';

export const baselinePackageDeleted: AlertRule = {
  id: 'baseline-package-deleted',
  module: 'scope',
  requires: ['scope'],
  evaluate({ snapshot }) {
    const baseline = currentBaseline(snapshot);
    if (!baseline) return [];
    return Object.keys(baseline.workPackages)
      .filter((id) => !(id in snapshot.scope.wbs))
      .map((id) => ({
        id: `baseline-package-deleted:${id}`,
        severity: 'amarelo',
        message: 'Pacote da linha de base excluído sem mudança',
        action: { kind: 'openChangeRequest' },
      }));
  },
};
