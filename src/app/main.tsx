import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/theme/tokens.css';
import { todayIso } from '@/shared/lib/dates';
import { DexieProjectRepository } from '@/platform/persistence/DexieProjectRepository';
import { App } from './App';

const repository = new DexieProjectRepository();
const clock = { now: () => new Date().toISOString(), today: todayIso };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App repository={repository} clock={clock} />
  </StrictMode>,
);
