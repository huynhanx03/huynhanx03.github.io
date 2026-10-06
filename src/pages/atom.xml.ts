import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNotesByLocale, notePath } from '../content/notes';
import { sitePath } from '../lib/paths';

export async function GET(context: APIContext) {
  const notes = await getNotesByLocale('en');
  const origin = context.site ?? new URL('https://huynhanx03.github.io');
  const site = new URL(sitePath('/'), origin);
  return rss({
    title: 'Nhân.dev notes',
    description: 'Notes about backend engineering and systems.',
    site,
    customData: '<language>en</language>',
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description ?? note.data.category,
      link: new URL(notePath(note), site).toString(),
      pubDate: note.data.updated,
      categories: note.data.tags,
    })),
  });
}
