// #sched first run: push the device timezone to settings if it differs. One-shot, never repeats once set.
import type { Settings } from '@motion/core/schemas';
import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import { keys } from './keys';

const FLAG = 'tzSet';

export async function ensureTz(qc: QueryClient): Promise<void> {
  if (localStorage.getItem(FLAG)) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const cur = await qc.fetchQuery({
      queryKey: keys.settings,
      queryFn: () => api<Settings>('GET', '/settings'),
    });
    if (tz && cur.tz !== tz) {
      qc.setQueryData(keys.settings, await api<Settings>('PATCH', '/settings', { tz }));
      for (const k of [keys.agendaAll, keys.statsAll]) void qc.invalidateQueries({ queryKey: k });
    }
    localStorage.setItem(FLAG, '1');
  } catch {
    // offline / server error: retry next launch
  }
}
