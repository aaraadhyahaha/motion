import * as z from 'zod/mini';
import { listTags } from '../../services/tags';
import { defineTool, READ } from '../tool';

export default defineTool({
  name: 'list_tags',
  description: 'All tags (name, color).',
  input: z.object({}),
  annotations: READ,
  run: (ctx) => listTags(ctx),
});
