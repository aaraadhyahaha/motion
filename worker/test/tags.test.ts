import { describe, expect, it } from 'vitest';
import { createTag, deleteTag, ensureTags, listTags, updateTag } from '../src/services/tags';
import { createTask, getTask } from '../src/services/tasks';
import { testCtx } from './helpers';

describe('tags', () => {
  it('ensureTags reuses case-insensitively and dedupes', async () => {
    const ctx = testCtx();
    const [a] = await ensureTags(ctx, ['Errand']);
    expect(await ensureTags(ctx, ['errand', 'ERRAND'])).toEqual([a]);
  });

  it('createTag rejects live duplicates', async () => {
    const ctx = testCtx();
    const t = await createTag(ctx, { name: 'deep', color: '#5856d6' });
    expect(t).toMatchObject({ name: 'deep', color: '#5856d6' });
    await expect(createTag(ctx, { name: 'Deep' })).rejects.toMatchObject({ code: 'conflict' });
  });

  it('rename and delete update tagged tasks; ensureTags revives deleted tags', async () => {
    const ctx = testCtx();
    const task = await createTask(ctx, { title: 't', tags: ['old'] });
    const tagId = (await listTags(ctx)).find((t) => t.name === 'old')?.id as string;
    ctx.tick();
    await updateTag(ctx, tagId, { name: 'new' });
    const renamed = await getTask(ctx, task.id);
    expect(renamed.tags).toEqual(['new']);
    expect(renamed.updatedAt).toBeGreaterThan(task.updatedAt);
    await deleteTag(ctx, tagId);
    expect((await getTask(ctx, task.id)).tags).toEqual([]);
    expect((await listTags(ctx)).some((t) => t.id === tagId)).toBe(false);
    expect(await ensureTags(ctx, ['NEW'])).toEqual([tagId]);
    expect((await listTags(ctx)).some((t) => t.id === tagId)).toBe(true);
  });
});
