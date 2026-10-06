import definitions from '../../data/topic-guides.json';
import { getReadingStats } from './reading-time';
import { getAllNotes, type NoteLocale, type NoteSummary } from './index';

type LocalizedText = Partial<Record<NoteLocale, string>>;
export interface TopicGuideDefinition {
  slug: string;
  locales?: NoteLocale[];
  title: LocalizedText;
  description: LocalizedText;
  prerequisites: LocalizedText;
  prerequisiteTopics?: string[];
  sections: Array<{ title: LocalizedText; noteKeys: string[] }>;
}
export interface TopicGuideStep { order: number; section: string; note: NoteSummary; minutes: number }
export interface TopicGuide {
  slug: string;
  title: string;
  description: string;
  prerequisites: string;
  prerequisiteTopics: Array<{ slug: string; title: string }>;
  sections: Array<{ title: string; steps: TopicGuideStep[] }>;
  steps: TopicGuideStep[];
  minutes: number;
}

function localizedText(text: LocalizedText, locale: NoteLocale, slug: string): string {
  const value = text[locale];
  if (!value) throw new Error(`Topic guide "${slug}" is missing ${locale} text`);
  return value;
}

export function resolveTopicGuides(
  source: TopicGuideDefinition[],
  notes: NoteSummary[],
  locale: NoteLocale,
): TopicGuide[] {
  const byKey = new Map(notes.filter((note) => note.locale === locale).map((note) => [note.translationKey, note]));
  const availableDefinitions = source.filter((definition) => (definition.locales ?? ['en', 'vi']).includes(locale));
  const definitionsBySlug = new Map(availableDefinitions.map((definition) => [definition.slug, definition]));

  return availableDefinitions.map((definition) => {
    let order = 0;
    const sections = definition.sections.map((section) => {
      const sectionTitle = localizedText(section.title, locale, definition.slug);
      return {
        title: sectionTitle,
        steps: section.noteKeys.map((key) => {
          const note = byKey.get(key);
          if (!note) throw new Error(`Topic guide "${definition.slug}" references missing ${locale} note "${key}"`);
          order += 1;
          return {
            order,
            section: sectionTitle,
            note,
            minutes: getReadingStats(note.entry.body ?? '', locale).minutes,
          };
        }),
      };
    });
    const steps = sections.flatMap((section) => section.steps);
    const prerequisiteTopics = (definition.prerequisiteTopics ?? []).map((prerequisiteSlug) => {
      const prerequisite = definitionsBySlug.get(prerequisiteSlug);
      if (!prerequisite) throw new Error(`Topic guide "${definition.slug}" references missing prerequisite topic "${prerequisiteSlug}"`);
      return { slug: prerequisiteSlug, title: localizedText(prerequisite.title, locale, prerequisiteSlug) };
    });

    return {
      slug: definition.slug,
      title: localizedText(definition.title, locale, definition.slug),
      description: localizedText(definition.description, locale, definition.slug),
      prerequisites: localizedText(definition.prerequisites, locale, definition.slug),
      prerequisiteTopics,
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
