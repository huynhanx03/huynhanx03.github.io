import siteConfigJson from "./site.config.json";
import skillsJson from "./skills.json";
import projectsJson from "./projects.json";
import experienceJson from "./experience.json";
import achievementsJson from "./achievements.json";
import competitiveJson from "./competitive.json";
import statsJson from "./stats.json";
import { z } from "zod";
import type { Achievement, CompetitiveData, Experience, Project, SiteConfig, SkillCategory, StatsSnapshot } from "./types";

const siteSchema = z.object({
  name: z.string().min(1), role: z.string().min(1), summary: z.string().min(1), avatar: z.string().optional(),
  links: z.object({ email: z.string().min(1), github: z.url(), linkedin: z.url() }),
  seo: z.object({ title: z.string().min(1), description: z.string().min(1), keywords: z.array(z.string()) }),
});
const projectSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), description: z.string().min(1), techStack: z.array(z.string()), role: z.string().min(1),
  github: z.url().nullable(), demo: z.url().nullable(), image: z.string().nullable(), category: z.enum(["personal", "contribution"]), hidden: z.boolean().optional(),
  pullRequests: z.array(z.object({ title: z.string(), url: z.url(), number: z.string() })).optional(), stars: z.number().optional(),
});
const experienceSchema = z.object({ company: z.string().min(1), roles: z.array(z.object({ title: z.string(), period: z.string(), description: z.string() })) });
const achievementSchema = z.object({ id: z.string(), name: z.string(), issuer: z.string(), year: z.number(), type: z.enum(["certificate", "award"]), credentialUrl: z.url().nullable(), image: z.string().nullable() });
const skillSchema = z.object({ name: z.string(), skills: z.array(z.string()).optional(), subcategories: z.array(z.object({ name: z.string(), skills: z.array(z.string()) })).optional() });
const competitiveSchema = z.object({ platforms: z.record(z.string(), z.object({ username: z.string(), profileUrl: z.url() })) });
const platformStatsSchema = z.object({ username: z.string(), solved: z.number().nonnegative().nullable() });
const statsSchema = z.object({ generatedAt: z.iso.datetime(), codeforces: z.object({ username: z.string(), rating: z.number().nullable(), rank: z.string().nullable(), solved: z.number().nonnegative().nullable() }), leetcode: z.object({ username: z.string(), rating: z.number().nullable(), topPercentage: z.number().nullable(), solved: z.number().nonnegative().nullable() }), cses: platformStatsSchema, vnoi: platformStatsSchema, lqdoj: platformStatsSchema, sources: z.object({ codeforces: z.url(), leetcode: z.url(), cses: z.url(), vnoi: z.url(), lqdoj: z.url() }) });

export function getSiteConfig(): SiteConfig { return siteSchema.parse(siteConfigJson); }
export function getSkills(): SkillCategory[] { return z.object({ categories: z.array(skillSchema) }).parse(skillsJson).categories; }
export function getProjects(): Project[] { return z.object({ projects: z.array(projectSchema) }).parse(projectsJson).projects; }
export function getExperience(): Experience[] { return z.object({ experiences: z.array(experienceSchema) }).parse(experienceJson).experiences; }
export function getAchievements(): Achievement[] { return z.object({ achievements: z.array(achievementSchema) }).parse(achievementsJson).achievements; }
export function getCompetitiveData(): CompetitiveData { return competitiveSchema.parse(competitiveJson); }
export function getStatsSnapshot(): StatsSnapshot { return statsSchema.parse(statsJson); }
