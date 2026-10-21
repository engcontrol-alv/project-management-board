import { screen, waitFor, within } from '@testing-library/react';
import { ChangeRequestsPage } from './ChangeRequestsPage';
import { renderWithProject } from '@/test/render';
import { aSnapshot, changeRequest, NOW, person, pkg } from '@/test/builders';
import type { Baseline } from '@/project/baseline';
import type { ProjectSnapshot } from '@/project/snapshot';

const lb = (s: ProjectSnapshot): Baseline => ({
  id: 'b1',
  projectId: s.project.id,
  version: 1,
  createdAt: NOW,
  changeRequestId: null,
  projectFinish: '2026-01-09',
  workPackages: { A: { start: '2026-01-05', finish: '2026-01-09', duration: 5 } },
  milestones: {},
  costItems: {},
  deliverables: {},
});

describe('ChangeRequestsPage', () => {
  it('só oferece transições permitidas', async () => {
    const s = aSnapshot().changeRequests(changeRequest('C', { code: 'MUD-001' })).build();
    await renderWithProject(<ChangeRequestsPage />, { snapshot: s });
    expect(await screen.findByRole('button', { name: 'Enviar para análise MUD-001' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar mudança MUD-001' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar MUD-001' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aplicar à linha de base' })).toBeNull();
  });

  it('aprovar pede aprovador e data da decisão', async () => {
    const s = aSnapshot()
      .parties(person('P', { name: 'Ana' }))
      .changeRequests(changeRequest('C', { code: 'MUD-001', status: 'Em análise' }))
      .build();
    const { user, snapshot } = await renderWithProject(<ChangeRequestsPage />, { snapshot: s });
    await user.click(await screen.findByRole('button', { name: 'Aprovar MUD-001' }));
    const dialog = screen.getByRole('dialog', { name: 'Aprovar MUD-001' });
    await user.selectOptions(within(dialog).getByLabelText('Aprovador'), 'P');
    await user.clear(within(dialog).getByLabelText('Data da decisão'));
    await user.type(within(dialog).getByLabelText('Data da decisão'), '2026-01-06');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    await waitFor(async () =>
      expect((await snapshot()).scope.changeRequests['C' as never]).toMatchObject({
        status: 'Aprovada',
        approverId: 'P',
        decisionDate: '2026-01-06',
      }),
    );
  });

  it('"Aplicar à linha de base" cria v2 e implementa a mudança', async () => {
    const s = aSnapshot()
      .parties(person('P'))
      .wbs(pkg('A', 8))
      .changeRequests(changeRequest('C', { code: 'MUD-001', status: 'Aprovada', approverId: 'P' as never, decisionDate: '2026-01-06' }))
      .build();
    s.baselines.push(lb(s));
    const { user, snapshot } = await renderWithProject(<ChangeRequestsPage />, { snapshot: s });
    expect(screen.queryByRole('button', { name: 'Marcar implementada MUD-001' })).toBeNull();
    await user.click(await screen.findByRole('button', { name: 'Aplicar à linha de base' }));
    await waitFor(async () => expect((await snapshot()).baselines).toHaveLength(2));
    const after = await snapshot();
    expect(after.scope.changeRequests['C' as never]?.status).toBe('Implementada');
    expect(after.baselines[1]).toMatchObject({ version: 2, changeRequestId: 'C' });
  });

  it('?nova=1 abre o formulário de nova mudança', async () => {
    await renderWithProject(<ChangeRequestsPage />, { route: '/x?nova=1' });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
