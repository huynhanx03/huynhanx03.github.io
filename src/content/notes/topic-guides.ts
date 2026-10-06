import definitions from '../../data/topic-guides.json';
import { getReadingStats } from './reading-time';
import { getAllNotes, type NoteLocale, type NoteSummary } from './index';

interface LocalizedText { en: string; vi: string }
export interface TopicGuideDefinition {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  prerequisites: LocalizedText;
  sections: Array<{ title: LocalizedText; noteKeys: string[] }>;
}
export interface TopicGuideStep { order: number; section: string; note: NoteSummary; minutes: number }
export interface TopicGuide {
  slug: string;
  title: string;
  description: string;
  prerequisites: string;
  sections: Array<{ title: string; steps: TopicGuideStep[] }>;
  steps: TopicGuideStep[];
  minutes: number;
}

export function resolveTopicGuides(
  source: TopicGuideDefinition[],
  notes: NoteSummary[],
  locale: NoteLocale,
): TopicGuide[] {
  const byKey = new Map(notes.filter((note) => note.locale === locale).map((note) => [note.translationKey, note]));

  return source.map((definition) => {
    let order = 0;
    const sections = definition.sections.map((section) => ({
      title: section.title[locale],
      steps: section.noteKeys.map((key) => {
        const note = byKey.get(key);
        if (!note) throw new Error(`Topic guide "${definition.slug}" references missing ${locale} note "${key}"`);
        order += 1;
        return {
          order,
          section: section.title[locale],
          note,
          minutes: getReadingStats(note.entry.body ?? '', locale).minutes,
        };
      }),
    }));
    const steps = sections.flatMap((section) => section.steps);

    return {
      slug: definition.slug,
      title: definition.title[locale],
      description: definition.description[locale],
      prerequisites: definition.prerequisites[locale],
      sections,
      steps,
      minutes: steps.reduce((total, step) => total + step.minutes, 0),
    };
  });
}

export async function getTopicGuides(locale: NoteLocale): Promise<TopicGuide[]> {
  return resolveTopicGuides(definitions as TopicGuideDefinition[], await getAllNotes(), locale);
}

export async function getTopicGuide(slug: string, locale: NoteLocale): Promise<TopicGuide | null> {
  return (await getTopicGuides(locale)).find((guide) => guide.slug === slug) ?? null;
}
