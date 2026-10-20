import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

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
