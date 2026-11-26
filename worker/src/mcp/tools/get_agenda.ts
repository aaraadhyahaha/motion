import { AgendaQuery } from '@motion/core';
import { getAgenda } from '../../services/agenda';
import { defineTool, READ } from '../tool';

export default defineTool({
  name: 'get_agenda',
  description:
    'Overdue + today + the next `days` days (default 7, max 60), grouped by date. Use for "what is on today/this week".',
  input: AgendaQuery,
  annotations: READ,
  run: (ctx, a) => getAgenda(ctx, a.days),
});
