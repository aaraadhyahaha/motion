import { QuickAdd } from '@motion/core';
import { quickAdd } from '../../services/quickadd';
import { defineTool, WRITE } from '../tool';

export default defineTool({
  name: 'quick_add',
  description:
    'Create a task from natural language, e.g. "gym tomorrow 7am #health @fitness every mon". `#list` must name an existing list; `@tag` creates tags.',
  input: QuickAdd,
  annotations: WRITE,
  run: (ctx, a) => quickAdd(ctx, a),
});
