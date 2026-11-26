import * as z from 'zod/mini';
import { listLists } from '../../services/lists';
import { defineTool, READ } from '../tool';

export default defineTool({
  name: 'list_lists',
  description: 'All lists (id, name, color). Inbox id is "inbox".',
  input: z.object({}),
  annotations: READ,
  run: (ctx) => listLists(ctx),
});
