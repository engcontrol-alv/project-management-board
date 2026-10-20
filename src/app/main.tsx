import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-mono/700.css';
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
