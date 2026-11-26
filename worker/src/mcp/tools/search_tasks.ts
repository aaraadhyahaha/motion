import { TaskQuery } from '@motion/core';
import * as z from 'zod/mini';
import { listTasks } from '../../services/tasks';
import { defineTool, READ } from '../tool';

const Input = z.required(z.pick(TaskQuery, { q: true, status: true, limit: true, cursor: true }), {
  q: true,
});

export default defineTool({
  name: 'search_tasks',
  description: 'Find tasks whose title or notes contain `q`. status: open (default) | done | all.',
  input: Input,
  annotations: READ,
  run: (ctx, a) => listTasks(ctx, { ...a, status: a.status ?? 'open', limit: a.limit ?? 50 }),
});
