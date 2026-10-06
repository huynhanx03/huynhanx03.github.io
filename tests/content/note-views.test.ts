import { describe, expect, it } from 'vitest';

import { fetchNoteViewSnapshot, noteViewEndpoint, noteViewPath, parseViewCount } from '../../scripts/lib/note-views.mjs';

describe('monthly note view snapshots', () => {
  it('builds counter paths with the deployed base path and parses formatted counts', () => {
    expect(noteViewEndpoint('nhan', '/portfolio', { locale: 'en', slug: 'go/concurrency' })).toBe(
      'https://nhan.goatcounter.com/counter/%2Fportfolio%2Fen%2Fnotes%2Fgo%2Fconcurrency%2F.json',
    );
    expect(parseViewCount({ count: '1,234' })).toBe(1234);
    expect(noteViewPath('', { locale: 'en', slug: 'go/concurrency' })).toBe('/en/notes/go/concurrency/');
  });

  it('leaves the last snapshot unchanged when analytics is not configured', async () => {
    const previous = { updatedAt: '2026-09-01', counts: { '/en/notes/one/': { count: 14, updatedAt: '2026-09-01' } } };
    const result = await fetchNoteViewSnapshot({ notes: [], previous, code: '', fetcher: () => { throw new Error('should not fetch'); } });

    expect(result.snapshot).toBe(previous);
    expect(result.successCount).toBe(0);
    expect(result.skipped).toBe(true);
  });

  it('updates successful routes and preserves prior values for failed requests', async () => {
    const previous = { updatedAt: '2026-09-01', counts: { '/en/notes/one/': { count: 14, updatedAt: '2026-09-01' }, '/en/notes/two/': { count: 8, updatedAt: '2026-09-01' } } };
    const result = await fetchNoteViewSnapshot({
      code: 'nhan',
      basePath: '',
      previous,
      now: new Date('2026-10-04T00:00:00.000Z'),
      notes: [{ locale: 'en', slug: 'one' }, { locale: 'en', slug: 'two' }],
      fetcher: async (input) => String(input).includes('one')
        ? Response.json({ count: '22' })
        : new Response(null, { status: 503 }),
    });

    expect(result.snapshot).toEqual({ updatedAt: '2026-10-04', counts: { '/en/notes/one/': { count: 22, updatedAt: '2026-10-04' }, '/en/notes/two/': { count: 8, updatedAt: '2026-09-01' } } });
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(1);
  });
});
