import { ListCreate } from '@motion/core';
import { createList } from '../../services/lists';
import { defineTool, WRITE } from '../tool';

export default defineTool({
  name: 'create_list',
  description: 'Create a list. color = #rrggbb (optional).',
  input: ListCreate,
  annotations: WRITE,
  run: (ctx, a) => createList(ctx, a),
});
