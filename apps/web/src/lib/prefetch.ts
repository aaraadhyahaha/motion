// #perf lazy chunk loaders (shared by React.lazy in App) + one-shot idle prefetch after first paint. No timers loop.
export const loaders = {
  upcoming: () => import('../routes/Upcoming'),
  query: () => import('../routes/TaskQueryView'),
  lists: () => import('../routes/Lists'),
  logbook: () => import('../routes/Logbook'),
  stats: () => import('../routes/Stats'),
  editor: () => import('../editor/EditorSheet'),
};

let done = false;
/** Call once after the first render; warms every lazy chunk when the main thread is idle. */
export function prefetchIdle() {
  if (done) return;
  done = true;
  const run = () => {
    for (const load of Object.values(loaders)) void load().catch(() => {});
  };
  // first paint → idle (Safari has no requestIdleCallback: one-shot timeout instead)
  requestAnimationFrame(() =>
    'requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 4000 }) : setTimeout(run, 1000),
  );
}
