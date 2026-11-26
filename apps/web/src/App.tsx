// #ui route switch (Today eager, others lazy) + editor slot for ?t=<id> (Back closes it).
import { lazy, Suspense } from 'react';
import { Empty } from './components/Empty';
import { QuickAdd } from './components/QuickAdd';
import { Shell } from './components/Shell';
import { loaders } from './lib/prefetch';
import { type Route, setParam, useRoute } from './lib/router';
import Today from './routes/Today';

const Upcoming = lazy(loaders.upcoming);
const TaskQueryView = lazy(loaders.query);
const Lists = lazy(loaders.lists);
const Logbook = lazy(loaders.logbook);
const Stats = lazy(loaders.stats);
const EditorSheet = lazy(loaders.editor);

function View({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <Today />;
    case 'upcoming':
      return <Upcoming />;
    case 'list':
      return <TaskQueryView key={route.id} list={route.id} />;
    case 'tag':
      return <TaskQueryView key={route.tag} tag={route.tag} />;
    case 'lists':
      return <Lists />;
    case 'logbook':
      return <Logbook />;
    case 'stats':
      return <Stats />;
    default:
      return <Empty icon="close" title="Page not found" />;
  }
}

const closeEditor = () => history.back();

export function App() {
  const { route, params } = useRoute();
  const taskId = params.get('t');
  const quick =
    route.name === 'today' ? (
      <QuickAdd dueToday />
    ) : route.name === 'list' ? (
      <QuickAdd key={route.id} listId={route.id} />
    ) : route.name === 'upcoming' || route.name === 'tag' ? (
      <QuickAdd />
    ) : undefined;

  return (
    <Shell route={route} quickAdd={quick}>
      <Suspense fallback={null}>
        <View route={route} />
      </Suspense>
      {taskId && (
        <Suspense fallback={null}>
          <EditorSheet
            key={taskId}
            id={taskId}
            onClose={history.length > 1 ? closeEditor : () => setParam('t', null, true)}
          />
        </Suspense>
      )}
    </Shell>
  );
}
