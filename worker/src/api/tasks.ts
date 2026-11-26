import { QuickAdd, TaskCreate, TaskQuery, TaskUpdate } from '@motion/core';
import { Hono } from 'hono';
import { body, parse } from '../lib/validate';
import { completeTask, uncompleteTask } from '../services/complete';
import { quickAdd } from '../services/quickadd';
import { createTask, deleteTask, getTask, listTasks, updateTask } from '../services/tasks';
import type { AppEnv } from './types';

export const tasksApi = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await listTasks(c.var.ctx, parse(TaskQuery, c.req.query()))))
  .post('/', async (c) => c.json(await createTask(c.var.ctx, parse(TaskCreate, await body(c.req))), 201))
  .post('/quick', async (c) => c.json(await quickAdd(c.var.ctx, parse(QuickAdd, await body(c.req))), 201))
  .get('/:id', async (c) => c.json(await getTask(c.var.ctx, c.req.param('id'))))
  .patch('/:id', async (c) =>
    c.json(await updateTask(c.var.ctx, c.req.param('id'), parse(TaskUpdate, await body(c.req)))),
  )
  .delete('/:id', async (c) => {
    await deleteTask(c.var.ctx, c.req.param('id'));
    return c.body(null, 204);
  })
  .post('/:id/complete', async (c) => c.json(await completeTask(c.var.ctx, c.req.param('id'))))
  .post('/:id/uncomplete', async (c) => c.json(await uncompleteTask(c.var.ctx, c.req.param('id'))));
