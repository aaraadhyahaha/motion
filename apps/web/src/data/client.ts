// #api single QueryClient. Offline: default networkMode 'online' pauses queries/mutations and replays.
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/** One retry, but never for 4xx — those won't fix themselves. */
const retry = (n: number, e: unknown) => n < 1 && !(e instanceof ApiError && e.status < 500);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry },
    mutations: { retry: 0 },
  },
});
