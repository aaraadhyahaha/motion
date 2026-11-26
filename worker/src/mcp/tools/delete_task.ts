import { Id } from '@motion/core';
import * as z from 'zod/mini';
import { deleteTask } from '../../services/tasks';
import { defineTool } from '../tool';

export default defineTool({
  name: 'delete_task',
  description: 'Delete a task. Confirm with the user first.',
  input: z.object({ id: Id }),
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  run: async (ctx, a) => {
    await deleteTask(ctx, a.id);
    return { ok: true };
  },
});
