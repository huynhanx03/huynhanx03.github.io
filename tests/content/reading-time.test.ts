import { describe, expect, it } from 'vitest';

import { getReadingStats } from '../../src/content/notes/reading-time';

describe('note reading stats', () => {
  it('counts readable Markdown text while excluding metadata, syntax, links, and code', () => {
    const markdown = `---\ntitle: "Ignore this frontmatter"\n---\n# Backend systems\n\nRead **the guide** and [linked source](https://example.com).\n\n\`\`\`ts\nconst hiddenCode = true\n\`\`\``;

    expect(getReadingStats(markdown, 'en', 100)).toEqual({ words: 8, minutes: 1 });
  });

  it('uses locale-aware word segmentation and rounds up to a minimum of one minute', () => {
    expect(getReadingStats('Ghi chú nhanh.', 'vi', 2)).toEqual({ words: 3, minutes: 2 });
    expect(getReadingStats('---\ntitle: hidden\n---\n', 'vi', 200)).toEqual({ words: 0, minutes: 1 });
  });
});
