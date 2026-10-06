import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('notes routes', () => {
  it('has localized index and nested slug routes with discovery metadata', async () => {
    const [index, detail, card, topicCard, styles] = await Promise.all([
      readFile(new URL('../../src/pages/[locale]/notes/index.astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/pages/[locale]/notes/[...slug].astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/components/notes/NoteCard.astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/components/notes/TopicGuideCard.astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/styles/global.css', import.meta.url), 'utf8'),
    ]);
    expect(index).toContain('getStaticPaths');
    expect(index).toContain('data-pagefind-body');
    expect(index).toContain('copy.notes.search');
    expect(index).toContain('data-filter-value="type:note"');
    expect(index).toContain('data-filter-value="type:topic"');
    expect(index).not.toContain('type:blog');
    expect(index).not.toContain('blogFilter');
    expect(index).toContain('data-notes-search');
    expect(index).toContain("import.meta.env.BASE_URL || '/'");
    expect(index).toContain('topicGuides.map((guide) => <TopicGuideCard');
    expect(index).toContain('const matchesCardText = card.textContent.toLowerCase().includes(searchText.toLowerCase())');
    expect(index).toContain('selectedFilter = params.get(\'filter\')');
    expect(index).not.toContain('data-notes-view=');
    expect(index).not.toContain('data-filter-key="tag"');
    expect(index).not.toContain('data-active-tag');
    expect(index).not.toContain('?tag=');
    expect(card).not.toContain('class="tag-list"');
    expect(card).not.toContain('class="read-link"');
    expect(card).toContain('data-discovery-card');
    expect(card).toContain('copy.notes.views');
    expect(card).toContain('copy.notes.viewsUnavailable');
    expect(card).toContain('getNoteViews(notePath(note))');
    expect(card).not.toContain('note-kind');
    expect(card).not.toContain('termLabel');
    expect(topicCard).toContain('class="topic-guide-card"');
    expect(topicCard).toContain('guide.minutes');
    expect(topicCard).not.toContain('topic-guide-preview');
    expect(topicCard).not.toContain('topic-guide-card-link');
    expect(topicCard).toContain('data-discovery-card');
    expect(topicCard).toContain('data-content-type="topic"');
    expect(styles).toContain('.topic-guide-page {\n  max-width: none;');
    expect(styles).toContain('.note-article-header {\n  width: 100%;\n  max-width: none;');
    expect(detail).toContain('render(note.entry)');
    expect(detail).toContain('getRelatedEntries');
    expect(detail).toContain('copy-code');
    expect(detail).toContain('structuredData={schemas}');
    expect(detail).toContain("localeSwitchUrl={paired ? notePath(paired) : sitePath(`/${locale === 'vi' ? 'en' : 'vi'}/notes`)}");
    expect(detail).toContain('<p class="eyebrow note-category-label">{note.data.category}</p>');
    expect(detail).not.toContain('{note.data.category} <span class="eyebrow-slash">/</span>');
    expect(detail).not.toContain('copy.notes.language');
    expect(detail).not.toContain('copy.notes.switchTo');
    expect(detail.indexOf('readingStats.minutes')).toBeLessThan(detail.indexOf('<h1>{note.data.title}</h1>'));
  });
});
