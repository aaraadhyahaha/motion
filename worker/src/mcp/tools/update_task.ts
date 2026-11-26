import { Id, TaskUpdate } from '@motion/core';
import * as z from 'zod/mini';
import { updateTask } from '../../services/tasks';
import { defineTool, WRITE } from '../tool';

export default defineTool({
  name: 'update_task',
  description:
    'Change fields of a task. Only given fields change; null clears (dueDate, dueTime, notes, rrule…). tags replaces the set.',
  input: z.extend(TaskUpdate, { id: Id }),
  annotations: { ...WRITE, idempotentHint: true },
  run: (ctx, { id, ...patch }) => updateTask(ctx, id, patch),
});
