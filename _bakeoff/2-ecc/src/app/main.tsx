import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@/shared/theme/tokens.css';
import { todayIso } from '@/shared/lib/dates';
import { DexieProjectRepository } from '@/platform/persistence/DexieProjectRepository';
import type { Clock } from '@/platform/react/RepositoryProvider';
import { App } from './App';

const repository = new DexieProjectRepository();
const clock: Clock = { now: () => new Date().toISOString(), today: todayIso };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App repository={repository} clock={clock} />
  </StrictMode>,
);
