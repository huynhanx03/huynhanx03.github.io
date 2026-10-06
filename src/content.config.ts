import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string().min(1),
    category: z.string().min(1),
    tags: z.array(z.string()).default([]),
    kind: z.enum(['note', 'guide', 'interview-question', 'reference', 'link', 'project-log', 'glossary']).default('note'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    translationKey: z.string().optional(),
    series: z.string().optional(),
    seriesOrder: z.number().int().positive().optional(),
    related: z.array(z.string()).default([]),
    sources: z.array(z.object({ title: z.string().min(1), url: z.url() })).default([]),
    description: z.string().optional(),
    draft: z.boolean().default(false),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { notes };
