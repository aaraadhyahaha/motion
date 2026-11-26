import { ListCreate, ListUpdate } from '@motion/core';
import { Hono } from 'hono';
import { body, parse } from '../lib/validate';
import { createList, deleteList, listLists, updateList } from '../services/lists';
import type { AppEnv } from './types';

export const listsApi = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ items: await listLists(c.var.ctx) }))
  .post('/', async (c) => c.json(await createList(c.var.ctx, parse(ListCreate, await body(c.req))), 201))
  .patch('/:id', async (c) =>
    c.json(await updateList(c.var.ctx, c.req.param('id'), parse(ListUpdate, await body(c.req)))),
  )
  .delete('/:id', async (c) => {
    await deleteList(c.var.ctx, c.req.param('id'));
    return c.body(null, 204);
  });
