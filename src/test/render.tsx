import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DexieProjectRepository } from '@/platform/persistence/DexieProjectRepository';
import { RepositoryProvider, type Clock } from '@/platform/react/hooks';
import type { ProjectSnapshot } from '@/project/snapshot';
import { aSnapshot, PROJECT_START } from './builders';

let n = 0;

export const testClock: Clock = {
  now: () => `${PROJECT_START}T12:00:00.000Z`,
  today: () => PROJECT_START,
};

/** Repositório Dexie real (fake-indexeddb) em banco único, já populado. */
export async function renderWithProject(
  ui: ReactElement,
  opts: { snapshot?: ProjectSnapshot; route?: string } = {},
) {
  const repository = new DexieProjectRepository(`ui-test-${Date.now()}-${++n}`);
  await repository.replaceAll(opts.snapshot ?? aSnapshot().build());
  const utils = render(
    <RepositoryProvider repository={repository} clock={testClock}>
      <MemoryRouter initialEntries={[opts.route ?? '/']}>{ui}</MemoryRouter>
    </RepositoryProvider>,
  );
  const load = async () => {
    const r = await repository.loadSnapshot();
    if (r.status !== 'pronto') throw new Error(r.status);
    return r.snapshot;
  };
  return { ...utils, repository, load };
}

export { screen };
