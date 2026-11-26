import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/row.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { queryClient } from './data/client';
import { startSync } from './data/sync';
import { ensureTz } from './data/tz';
import { prefetchIdle } from './lib/prefetch';

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
startSync(queryClient);
void ensureTz(queryClient);
prefetchIdle();
