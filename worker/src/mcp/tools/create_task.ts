import { TaskCreate } from '@motion/core';
import { createTask } from '../../services/tasks';
import { defineTool, WRITE } from '../tool';

export default defineTool({
  name: 'create_task',
  description:
    'Create a task from structured fields. dueDate YYYY-MM-DD, dueTime HH:MM, rrule e.g. FREQ=WEEKLY;BYDAY=MO, tags = names (created if new). Omit listId for Inbox.',
  input: TaskCreate,
  annotations: WRITE,
  run: (ctx, a) => createTask(ctx, a),
});
