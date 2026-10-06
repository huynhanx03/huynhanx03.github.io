import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

describe("Astro bootstrap", () => {
  it("uses pnpm with shared Makefile commands and no local wrapper", () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    const makefile = readFileSync(resolve(root, "Makefile"), "utf8");
    const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
    const deploy = readFileSync(resolve(root, ".github/workflows/deploy-pages.yml"), "utf8");
    const verifyBuild = readFileSync(resolve(root, "scripts/verify-build.mjs"), "utf8");

    expect(packageJson.packageManager).toBe("pnpm@12.6.0");
    expect(packageJson.engines.node).toBe(">=26.10.0");
    expect(makefile).toContain(".DEFAULT_GOAL := dev");
    expect(makefile).toContain("install:");
    expect(makefile).toContain("dev:");
    expect(makefile).toContain("test:");
    expect(makefile).toContain("check:");
    expect(makefile).toContain("content-validate:");
    expect(makefile).toContain("verify-build:");
    expect(ci).toContain("run: make install");
    expect(ci).toContain("run: make check");
    expect(ci).toContain("run: make verify-build");
    expect(deploy).toContain("run: make install");
    expect(deploy).toContain("run: make check");
    expect(deploy).toContain("run: make verify-build");
    expect(verifyBuild).toContain('hreflang="${lang}"');
    expect(verifyBuild).toContain('hreflang="x-default"');
    expect(verifyBuild).not.toContain("for (const language of ['en', 'vi', 'x-default'])");
    expect(ci + deploy).not.toContain("jdx/mise-action");
    expect(packageJson.scripts).toMatchObject({
      dev: expect.any(String),
      build: expect.any(String),
      check: expect.any(String),
      typecheck: expect.any(String),
    });
    expect(existsSync(resolve(root, "astro.config.mjs"))).toBe(true);
    expect(existsSync(resolve(root, "Makefile"))).toBe(true);
    expect(existsSync(resolve(root, ".mise.toml"))).toBe(false);
    expect(existsSync(resolve(root, "start-local.sh"))).toBe(false);
  });
});
