import { type QuickAdd, type Task, tokenize } from '@motion/core';
import { parseNlDate } from '../lib/nldate';
import type { Ctx } from './ctx';
import { findListByName } from './lists';
import { createTask } from './tasks';

/** "gym tomorrow 7am #health @fitness every mon" → task. Unknown `#list` stays in the title. */
export async function quickAdd(ctx: Ctx, input: QuickAdd): Promise<Task> {
  const tk = tokenize(input.text);
  let text = tk.text;
  let listId = input.listId;
  if (tk.listName) {
    const found = await findListByName(ctx, tk.listName);
    if (found) {
      listId ??= found;
      text = text
        .split(' ')
        .filter((w) => w.toLowerCase() !== `#${tk.listName?.toLowerCase()}`)
        .join(' ');
    }
  }
  const date = await parseNlDate(text, ctx.tz, ctx.now());
  const title = (date?.rest || text || input.text).trim();
  return createTask(ctx, {
    title,
    ...(listId && { listId }),
    ...(date
      ? { dueDate: date.dueDate, dueTime: date.dueTime ?? null }
      : input.dueDate && { dueDate: input.dueDate }),
    ...(tk.rrule && { rrule: tk.rrule, recurFrom: tk.recurFrom }),
    tags: tk.tags,
  });
}
