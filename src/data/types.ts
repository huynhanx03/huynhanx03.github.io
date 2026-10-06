export type ProjectCategory = "personal" | "contribution";

export interface SiteConfig {
  name: string;
  role: string;
  summary: string;
  avatar?: string;
  links: { email: string; github: string; linkedin: string };
  seo: { title: string; description: string; keywords: string[] };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  role: string;
  github: string | null;
  demo: string | null;
  image: string | null;
  category: ProjectCategory;
  hidden?: boolean;
  pullRequests?: Array<{ title: string; url: string; number: string }>;
  stars?: number;
}

export interface ExperienceRole { title: string; period: string; description: string }
export interface Experience { company: string; roles: ExperienceRole[] }
export interface Achievement { id: string; name: string; issuer: string; year: number; type: "certificate" | "award"; credentialUrl: string | null; image: string | null }
export interface SkillSubcategory { name: string; skills: string[] }
export interface SkillCategory { name: string; skills?: string[]; subcategories?: SkillSubcategory[] }
export interface StatsSnapshot {
  generatedAt: string;
  codeforces: { username: string; rating: number | null; rank: string | null; solved: number | null };
  leetcode: { username: string; rating: number | null; topPercentage: number | null; solved: number | null };
  cses: { username: string; solved: number | null };
  vnoi: { username: string; solved: number | null };
  lqdoj: { username: string; solved: number | null };
  sources: { codeforces: string; leetcode: string; cses: string; vnoi: string; lqdoj: string };
}
export interface CompetitiveData { platforms: Record<string, { username: string; profileUrl: string }> }
