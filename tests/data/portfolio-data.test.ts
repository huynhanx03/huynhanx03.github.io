import { describe, expect, it } from "vitest";
import { readFile } from 'node:fs/promises';
import {
  getAchievements,
  getExperience,
  getProjects,
  getSiteConfig,
  getSkills,
  getCompetitiveData,
  getStatsSnapshot,
} from "../../src/data/portfolio";

describe("portfolio data", () => {
  it("loads the site identity and SEO configuration", () => {
    const site = getSiteConfig();
    expect(site.name).toBe("Huỳnh Mai Cao Nhân");
    expect(site.links.github).toContain("github.com/huynhanx03");
    expect(site.seo.description.length).toBeGreaterThan(40);
  });

  it("preserves projects with stable ids and valid categories", () => {
    const projects = getProjects();
    expect(projects.length).toBeGreaterThan(10);
    expect(new Set(projects.map((project) => project.id)).size).toBe(projects.length);
    expect(projects.every((project) => ["personal", "contribution"].includes(project.category))).toBe(true);
  });

  it('uses canonical portfolio records on both locale routes', async () => {
    const projectsPage = await readFile(new URL('../../src/pages/[locale]/projects.astro', import.meta.url), 'utf8');
    const achievementsPage = await readFile(new URL('../../src/pages/[locale]/achievements.astro', import.meta.url), 'utf8');

    expect(projectsPage).toContain('getProjects().filter((project) => !project.hidden)');
    expect(projectsPage).not.toContain('localizedProject');
    expect(achievementsPage).toContain('const achievements = getAchievements();');
    expect(achievementsPage).not.toContain('localizedAchievement');
  });

  it("loads experience, achievements, and skills without empty collections", () => {
    expect(getExperience().length).toBeGreaterThan(0);
    expect(getAchievements().length).toBeGreaterThan(0);
    expect(Object.keys(getCompetitiveData().platforms)).toEqual(['codeforces', 'leetcode', 'cses', 'vnoi', 'lqdoj']);
    expect(getStatsSnapshot().codeforces.username).toBe('nhan43');
    expect(getSkills().length).toBeGreaterThan(0);
  });
});
