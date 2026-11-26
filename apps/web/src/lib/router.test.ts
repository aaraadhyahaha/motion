import { describe, expect, it } from 'vitest';
import { matchRoute, withParam } from './router';

describe('matchRoute', () => {
  it.each([
    ['/', { name: 'today' }],
    ['/upcoming', { name: 'upcoming' }],
    ['/upcoming/', { name: 'upcoming' }],
    ['/lists', { name: 'lists' }],
    ['/logbook', { name: 'logbook' }],
    ['/stats', { name: 'stats' }],
    ['/list/abc123', { name: 'list', id: 'abc123' }],
    ['/tag/deep%20work', { name: 'tag', tag: 'deep work' }],
    ['/list', { name: 'notFound' }],
    ['/list/a/b', { name: 'notFound' }],
    ['/nope', { name: 'notFound' }],
  ])('%s', (path, route) => expect(matchRoute(path)).toEqual(route));
});

describe('withParam', () => {
  it('sets, replaces and removes a param, keeping others', () => {
    expect(withParam('/upcoming', 't', 'x1')).toBe('/upcoming?t=x1');
    expect(withParam('/upcoming?a=1&t=x1', 't', 'y2')).toBe('/upcoming?a=1&t=y2');
    expect(withParam('/upcoming?a=1&t=x1', 't', null)).toBe('/upcoming?a=1');
    expect(withParam('/?t=x1', 't', null)).toBe('/');
  });
});
