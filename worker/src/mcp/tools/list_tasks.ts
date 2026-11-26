import { TaskQuery } from '@motion/core';
import { listTasks } from '../../services/tasks';
import { defineTool, READ } from '../tool';

export default defineTool({
  name: 'list_tasks',
  description:
    'List tasks (default: open). Filter by list id, tag, due range from/to (YYYY-MM-DD), q text. Paginated: pass back `next` as cursor.',
  input: TaskQuery,
  annotations: READ,
  run: (ctx, a) => listTasks(ctx, a),
});
