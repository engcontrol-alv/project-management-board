import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DexieProjectRepository } from '@/platform/persistence/DexieProjectRepository';
import { RepositoryProvider, type Clock } from '@/platform/react/RepositoryProvider';
import type { ProjectSnapshot } from '@/project/snapshot';
import { aSnapshot, NOW, START } from './builders';

let n = 0;

export const testClock = (today = START): Clock => ({ now: () => NOW, today: () => today });

/** Renderiza com um repositório Dexie real (fake-indexeddb) já populado com o snapshot. */
export async function renderWithProject(
  ui: ReactElement,
  opts: { snapshot?: ProjectSnapshot; route?: string; path?: string; today?: string; onCleared?: () => void } = {},
) {
  const repo = new DexieProjectRepository(`ui-test-${Date.now()}-${++n}`);
  await repo.replaceAll(opts.snapshot ?? aSnapshot().build());
  const user = userEvent.setup();
  const utils = render(
    <RepositoryProvider repository={repo} clock={testClock(opts.today)} onCleared={opts.onCleared}>
      <MemoryRouter initialEntries={[opts.route ?? '/']}>
        <Routes>
          <Route path={opts.path ?? '*'} element={ui} />
        </Routes>
      </MemoryRouter>
    </RepositoryProvider>,
  );
  const snapshot = async () => {
    const r = await repo.loadSnapshot();
    if (r.status !== 'pronto') throw new Error(r.status);
    return r.snapshot;
  };
  return { ...utils, repo, user, snapshot };
}
