import { Id } from '@motion/core';
import * as z from 'zod/mini';
import { rescheduleTask } from '../../services/reschedule';
import { defineTool, WRITE } from '../tool';

export default defineTool({
  name: 'reschedule_task',
  description:
    'Move a task\'s due date. `when` = "YYYY-MM-DD[ HH:MM]" or natural language ("next friday 3pm"). No time → time cleared.',
  input: z.object({ id: Id, when: z.string().check(z.trim(), z.minLength(1), z.maxLength(100)) }),
  annotations: { ...WRITE, idempotentHint: true },
  run: (ctx, a) => rescheduleTask(ctx, a.id, a.when),
});
