import { Id } from '@motion/core';
import * as z from 'zod/mini';
import { completeTask, uncompleteTask } from '../../services/complete';
import { defineTool, WRITE } from '../tool';

export default defineTool({
  name: 'complete_task',
  description:
    'Mark a task done (recurring tasks roll to the next date). undo=true reverts the last completion.',
  input: z.object({ id: Id, undo: z.optional(z.boolean()) }),
  annotations: WRITE,
  run: (ctx, a) => (a.undo ? uncompleteTask(ctx, a.id) : completeTask(ctx, a.id)),
});
