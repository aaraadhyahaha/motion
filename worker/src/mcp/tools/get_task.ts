import { Id } from '@motion/core';
import * as z from 'zod/mini';
import { getTask } from '../../services/tasks';
import { defineTool, READ } from '../tool';

export default defineTool({
  name: 'get_task',
  description: 'One task by id, including notes.',
  input: z.object({ id: Id }),
  annotations: READ,
  run: (ctx, a) => getTask(ctx, a.id),
});
