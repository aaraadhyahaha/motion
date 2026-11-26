import { TagCreate, TagUpdate } from '@motion/core';
import { Hono } from 'hono';
import { body, parse } from '../lib/validate';
import { createTag, deleteTag, listTags, updateTag } from '../services/tags';
import type { AppEnv } from './types';

export const tagsApi = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ items: await listTags(c.var.ctx) }))
  .post('/', async (c) => c.json(await createTag(c.var.ctx, parse(TagCreate, await body(c.req))), 201))
  .patch('/:id', async (c) =>
    c.json(await updateTag(c.var.ctx, c.req.param('id'), parse(TagUpdate, await body(c.req)))),
  )
  .delete('/:id', async (c) => {
    await deleteTag(c.var.ctx, c.req.param('id'));
    return c.body(null, 204);
  });
