import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";
import { stripLeadingHeading } from "./src/plugins/strip-leading-heading.mjs";

const site = process.env.PUBLIC_SITE_URL ?? "https://huynhanx03.github.io";
const base = process.env.PUBLIC_BASE_PATH || undefined;

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap({
    filter: (page) => {
      const pathname = new URL(page).pathname.replace(/\/$/, '') || '/';
      const configuredBase = (base ?? '').replace(/\/$/, '');
      const route = configuredBase && pathname.startsWith(configuredBase) ? pathname.slice(configuredBase.length) || '/' : pathname;
      if (route === '/' || ['/experience', '/projects', '/achievements'].includes(route)) return false;
      if (/\/(?:en|vi)\/[^/]+\/[^/]+$/.test(route) && !route.includes('/notes/')) return false;
      return true;
    },
  })],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" }, defaultColor: false },
    processor: unified({ remarkPlugins: [stripLeadingHeading] }),
  },
});
