// Shared test helpers: fixture loading and CLI execution.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SKILL_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export function skillFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/** Non-comment, nonempty lines of a requirement fixture. */
export function requirements(name: string): string[] {
  return skillFile(`tests/fixtures/${name}`)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function expectedPrompt(name: string): string {
  return skillFile(`tests/fixtures/expected-prompts/${name}.xml`);
}

export const EXAMPLE_NAMES = [
  "example-1-announcement",
  "example-2-decision",
  "example-3-agentic",
  "example-4-custom",
] as const;

export const PAPER_EXAMPLE_1 = requirements("requirement-tier-1.txt")[0] as string;
export const PAPER_EXAMPLE_2 = requirements("requirement-tier-1.txt")[1] as string;
export const CUSTOM_EXAMPLE_4 = requirements("requirement-tier-1.txt")[2] as string;
export const PAPER_EXAMPLE_3 = requirements("requirement-tier-2.txt")[0] as string;

export function runScript(
  script: string,
  args: string[],
  input?: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [`${SKILL_ROOT}scripts/${script}`, ...args], {
    encoding: "utf8",
    input,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
