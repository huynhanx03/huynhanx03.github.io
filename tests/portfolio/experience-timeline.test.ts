import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('experience timeline presentation', () => {
  it('uses the English source experience copy on every locale route', async () => {
    const page = await readFile(new URL('../../src/pages/[locale]/experience.astro', import.meta.url), 'utf8');

    expect(page).toContain('<ExperienceList experiences={getExperience()} />');
    expect(page).not.toContain('localizedExperience(');
  });

  it('highlights each timeline marker when its card is hovered or keyboard focused', async () => {
    const component = await readFile(new URL('../../src/components/portfolio/ExperienceList.astro', import.meta.url), 'utf8');

    expect(component).toContain('tabindex="0"');
    expect(component).toContain('.experience-timeline-entry:hover .timeline-dot');
    expect(component).toContain('.experience-timeline-entry:focus-within .timeline-dot');
  });
});
