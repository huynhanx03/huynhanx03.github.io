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

  it('rejects unknown note references instead of silently publishing incomplete guides', () => {
    expect(() => resolveTopicGuides([
      { slug: 'bad', title: { en: 'Bad', vi: 'Sai' }, description: { en: '', vi: '' }, prerequisites: { en: '', vi: '' }, sections: [{ title: { en: 'Start', vi: 'Bắt đầu' }, noteKeys: ['missing/note'] }] },
    ], [], 'en')).toThrow('missing/note');
  });
});
