import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import type { ReactElement } from 'react';

// Telas renderizam após a consulta reativa ao IndexedDB; com a suíte em paralelo, 1 s (padrão) é curto.
configure({ asyncUtilTimeout: 4000 });

afterEach(() => {
  cleanup();
});

// Recharts usa ResizeObserver, ausente no jsdom.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

// jsdom não faz layout: o ResponsiveContainer do Recharts mede 0×0 e avisa. Nos testes, tamanho fixo.
vi.mock('recharts', async (importOriginal) => {
  const recharts = await importOriginal<typeof import('recharts')>();
  const { cloneElement, createElement } = await import('react');
  type Props = { children: ReactElement };
  const ResponsiveContainer = ({ children }: Props) =>
    createElement('div', { style: { width: 800, height: 300 } }, cloneElement(children, { width: 800, height: 300 } as never));
  return { ...recharts, ResponsiveContainer };
});
