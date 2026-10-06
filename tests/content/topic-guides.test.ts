import { describe, expect, it } from 'vitest';

import { getTopicGuides, resolveTopicGuides } from '../../src/content/notes/topic-guides';
import { getMessages } from '../../src/i18n/messages';

describe('focused topic guides', () => {
  it('uses one concise topic label in both locales', () => {
    expect(getMessages('en').notes.topic).toBe('Topic');
    expect(getMessages('vi').notes.topic).toBe('Chủ đề');
  });

  it('provides a beginner Go topic in a clear, ordered progression in both locales', async () => {
    const [english, vietnamese] = await Promise.all([getTopicGuides('en'), getTopicGuides('vi')]);
    const englishFundamentals = english.find((guide) => guide.slug === 'go-fundamentals');
    const vietnameseFundamentals = vietnamese.find((guide) => guide.slug === 'go-fundamentals');

    expect(englishFundamentals?.title).toBe('Go Fundamentals');
    expect(vietnameseFundamentals?.title).toBe('Nền tảng Go');
    expect(englishFundamentals?.sections.map((section) => section.steps.map((step) => step.note.translationKey))).toEqual([
      ['go/intro', 'go/variables', 'go/flow', 'go/functions', 'go/errors'],
      ['go/pointers', 'go/slices', 'go/maps'],
      ['go/structs', 'go/methods', 'go/interfaces', 'go/composition'],
      ['go/garbage_collection'],
    ]);
    expect(englishFundamentals?.steps.map((step) => step.order)).toEqual(Array.from({ length: 13 }, (_, index) => index + 1));
    expect(englishFundamentals?.minutes).toBe(englishFundamentals?.steps.reduce((total, step) => total + step.minutes, 0));
    expect(vietnameseFundamentals?.steps.at(-1)?.note.data.title).toBe('Garbage Collection');
    expect(vietnameseFundamentals?.steps.every((step) => step.note.locale === 'vi')).toBe(true);
  });

  it('keeps Go concurrency in a useful order and resolves each step into the requested locale', async () => {
    const [english, vietnamese] = await Promise.all([getTopicGuides('en'), getTopicGuides('vi')]);
    const englishConcurrency = english.find((guide) => guide.slug === 'go-concurrency');
    const vietnameseConcurrency = vietnamese.find((guide) => guide.slug === 'go-concurrency');

    expect(englishConcurrency?.title).toBe('Go Concurrency');
    expect(vietnameseConcurrency?.title).toBe('Concurrency trong Go');
    expect(englishConcurrency?.steps.map((step) => step.note.translationKey)).toEqual([
      'fundamentals/concurrency_race',
      'go/goroutines',
      'go/channels',
      'go/context',
      'libraries/ants',
    ]);
    expect(vietnameseConcurrency?.steps.every((step) => step.note.locale === 'vi')).toBe(true);
    expect(englishConcurrency?.minutes).toBeGreaterThan(0);
  });

  it('provides Temporal as a Vietnamese-only progression from fundamentals to production', async () => {
    const [english, vietnamese] = await Promise.all([getTopicGuides('en'), getTopicGuides('vi')]);
    const cadence = vietnamese.find((guide) => guide.slug === 'cadence-workflows');
    const temporal = vietnamese.find((guide) => guide.slug === 'temporal-workflows');

    expect(cadence?.title).toBe('Cadence Workflows');
    expect(cadence?.steps).toHaveLength(8);
    expect(cadence?.steps.every((step) => step.note.data.category === 'Workflow Engine')).toBe(true);
    expect(cadence?.sections.map((section) => section.steps.length)).toEqual([2, 2, 2, 2]);
    expect(cadence?.sections.map((section) => section.title)).toEqual([
      'Nền tảng và ứng dụng đầu tiên',
      'Replay, Activity và độ tin cậy',
      'Điều phối và dữ liệu',
      'Production và lựa chọn engine',
    ]);
    expect(cadence?.steps.every((step) => step.note.translationKey.startsWith('cadence/'))).toBe(true);
    expect(cadence?.steps.every((step) => getWordCount(step.note.entry.body ?? '') >= 600)).toBe(true);
    expect(english.some((guide) => guide.slug === 'temporal-workflows')).toBe(false);
    expect(temporal?.title).toBe('Temporal Workflows');
    expect(temporal?.steps).toHaveLength(8);
    expect(temporal?.steps.every((step) => step.note.data.category === 'Workflow Engine')).toBe(true);
    expect(temporal?.sections.map((section) => section.steps.length)).toEqual([2, 2, 2, 2]);
    expect(temporal?.sections.map((section) => section.title)).toEqual([
      'Nền tảng và replay',
      'Activity và điều phối',
      'Kiểm thử và dữ liệu',
      'Production và mẫu nâng cao',
    ]);
    expect(temporal?.steps.map((step) => step.order)).toEqual(Array.from({ length: 8 }, (_, index) => index + 1));
    expect(temporal?.steps.every((step) => step.note.translationKey.startsWith('temporal/'))).toBe(true);
    expect(temporal?.steps.every((step) => getWordCount(step.note.entry.body ?? '') >= 600)).toBe(true);
    expect(temporal?.steps.every((step) => step.note.locale === 'vi')).toBe(true);
    expect(temporal?.steps[0].note.translationKey).toBe('temporal/fundamentals');
    expect(temporal?.steps.at(-1)?.note.translationKey).toBe('temporal/advanced-patterns');
    expect(temporal?.prerequisiteTopics.map((topic) => topic.slug)).toEqual(['cadence-workflows']);
    expect(temporal?.prerequisiteTopics[0]?.title).toBe('Cadence Workflows');
    expect(temporal?.minutes).toBe(temporal?.steps.reduce((total, step) => total + step.minutes, 0));
  });

  it('rejects unknown note references instead of silently publishing incomplete guides', () => {
    expect(() => resolveTopicGuides([
      { slug: 'bad', title: { en: 'Bad', vi: 'Sai' }, description: { en: '', vi: '' }, prerequisites: { en: '', vi: '' }, sections: [{ title: { en: 'Start', vi: 'Bắt đầu' }, noteKeys: ['missing/note'] }] },
    ], [], 'en')).toThrow('missing/note');
  });

  it('rejects unknown prerequisite topic references', () => {
    expect(() => resolveTopicGuides([
      { slug: 'bad', title: { en: 'Bad' }, description: { en: 'Description' }, prerequisites: { en: 'None' }, prerequisiteTopics: ['missing-topic'], sections: [{ title: { en: 'Start' }, noteKeys: ['first/note'] }] },
    ], [createNoteSummary('first/note')], 'en')).toThrow('missing prerequisite topic "missing-topic"');
  });
});

function createNoteSummary(translationKey: string) {
  return {
    locale: 'en' as const,
    translationKey,
    slug: 'note',
    path: '/en/notes/note/',
    category: 'Guide',
    data: { title: 'First note', description: '', category: 'Guide' },
    entry: { body: 'Some content.' },
  } as never;
}

function getWordCount(markdown: string): number {
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/u, '');
  return [...new Intl.Segmenter('vi', { granularity: 'word' }).segment(body)].filter((segment) => segment.isWordLike).length;
}
