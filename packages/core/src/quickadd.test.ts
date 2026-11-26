import { describe, expect, it } from 'vitest';
import { tokenize } from './quickadd';

const rr = (s: string) => tokenize(s).rrule;

describe('tokenize', () => {
  it('extracts list and tags, keeps date words and #list in text', () => {
    expect(tokenize('gym tomorrow 7am #health @fitness @Fitness @am')).toEqual({
      text: 'gym tomorrow 7am #health',
      listName: 'health',
      tags: ['fitness', 'am'],
    });
  });
  it('recurrence phrases', () => {
    expect(rr('pay rent every month on the 1st')).toBe('FREQ=MONTHLY;BYMONTHDAY=1');
    expect(rr('standup every weekday 9am')).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    expect(rr('review every 2nd tue')).toBe('FREQ=MONTHLY;BYDAY=2TU');
    expect(rr('invoice every last fri')).toBe('FREQ=MONTHLY;BYDAY=-1FR');
    expect(rr('trash every mon and thu')).toBe('FREQ=WEEKLY;BYDAY=MO,TH');
    expect(rr('sync every 2 weeks on mon, wed')).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE');
    expect(rr('bills every month on the last day')).toBe('FREQ=MONTHLY;BYMONTHDAY=-1');
    expect(rr('pay every 15th')).toBe('FREQ=MONTHLY;BYMONTHDAY=15');
    expect(rr('every year taxes')).toBe('FREQ=YEARLY');
  });
  it('strips the phrase and flags every! as from-completion', () => {
    expect(tokenize('water plants every! 3 days')).toEqual({
      text: 'water plants',
      tags: [],
      rrule: 'FREQ=DAILY;INTERVAL=3',
      recurFrom: 'done',
    });
    expect(tokenize('every other week call mom')).toMatchObject({
      text: 'call mom',
      rrule: 'FREQ=WEEKLY;INTERVAL=2',
      recurFrom: 'due',
    });
  });
  it('leaves non-recurrence "every" alone', () => {
    expect(tokenize('every banana counts')).toEqual({ text: 'every banana counts', tags: [] });
    expect(tokenize('everyone party').rrule).toBeUndefined();
  });
});
