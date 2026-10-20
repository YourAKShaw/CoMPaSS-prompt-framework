#!/usr/bin/env node
// Read-only package validation for the compass-prompt-framework skill.
//
// Usage: node scripts/validate-skill.ts [SKILL_ROOT] [--json]
// Exit status: 0 valid, 1 validation errors, 2 usage error.
//
// Checks the SKILL.md manifest against the Agent Skills specification fields
// (name, description, license, compatibility, metadata, allowed-tools), required
// resources, JSON assets, local Markdown links and heading anchors, reachability
// of every resource from SKILL.md, symlinks, and empty or unfinished files. The
// manifest parser is deliberately narrow: single-line scalars, plus a metadata
// map of single-line string values. Fenced code is ignored when reading links.
// No network access, no writes, no execution of package code. Node.js 22.18+.
import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED = [
  "SKILL.md",
  "references/compass-paper.md",
  "references/literature-summary.md",
  "references/component-reference.md",
  "references/worked-examples.md",
  "references/limitations.md",
  "references/evaluation-plan.md",
  "references/vs-frameworks.md",
  "assets/component-table.json",
  "assets/tier-decision-tree.md",
  "assets/templates/c-analysis-card.md",
  "assets/templates/m-mission.md",
  "assets/templates/p-provisions.md",
  "assets/templates/s-scope.md",
  "assets/templates/success-spec.md",
  "assets/templates/compass-prompt-skeleton.md",
  "assets/examples/example-1-announcement.md",
  "assets/examples/example-2-decision.md",
  "assets/examples/example-3-agentic.md",
  "assets/examples/example-4-custom.md",
  "scripts/lib/compass.ts",
  "scripts/analyze-requirement.ts",
  "scripts/scaffold-prompt.ts",
  "scripts/validate-prompt.ts",
  "scripts/evaluate-skill.ts",
  "scripts/validate-skill.ts",
  "scripts/generate-references.py",
];
/** Every file in these directories must be reachable through links from SKILL.md. */
const LINKED_DIRS = ["references", "assets", "scripts"];
/** Inventoried for symlinks and empty files, but not required to be linked. */
const SUPPORT_DIRS = ["tests"];
const TEXT_EXTENSIONS = new Set([".md", ".ts", ".py", ".json", ".txt", ".xml"]);
const MANIFEST_FIELDS = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
]);
const EXPECTED_LETTERS = ["C", "o", "M", "P", "a", "S", "S"];
const INLINE_LINK = /!?\[[^\]\n]*\]\(([^\n)]*)\)/g;
const FENCE = /^\s{0,3}(`{3,}|~{3,})(.*)$/;
const MARKER =
  /^\s*(?:[-*+]\s+|#{1,6}\s+)?(?:\[(?:TODO|TBD|FIXME)[:\]]|(?:TODO|TBD|FIXME)(?::|\s*$))/;

export interface ValidationResult {
  valid: boolean;
  root: string;
  filesChecked: number;
  errors: string[];
  warnings: string[];
}

export interface Manifest {
  fields: Record<string, string>;
  metadata: Record<string, string>;
  body: string;
}

function scalar(raw: string, key: string): string {
  const value = raw.trim();
  if (value.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed !== "string") throw new Error("not a string");
      return parsed;
    } catch {
      throw new Error(`${key}: double-quoted scalars must use JSON-compatible escaping`);
    }
  }
  if (value.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(value)) throw new Error(`${key}: invalid single-quoted scalar`);
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (
    /^[!&*{}[\]|>@`%]/.test(value) ||
    value.includes(": ") ||
    value.includes(" #") ||
    /^(true|false|null|~|yes|no|on|off)$/i.test(value) ||
    /^[-+]?\d+(\.\d+)?$/.test(value)
  ) {
    throw new Error(`${key}: ambiguous plain scalar; quote it as a string`);
  }
  return value;
}

/** Parse the intentionally narrow manifest format without guessing at general YAML. */
export function parseManifest(text: string): Manifest {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") throw new Error("SKILL.md must start with a YAML frontmatter delimiter");
  const end = lines.indexOf("---", 1);
  if (end < 0) throw new Error("frontmatter has no closing delimiter");
  const fields: Record<string, string> = {};
  const metadata: Record<string, string> = {};
  let inMetadata = false;
  for (const line of lines.slice(1, end)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const nested = /^ {2}([A-Za-z0-9_-]+):\s+(.+)$/.exec(line);
    if (nested) {
      if (!inMetadata) throw new Error("only metadata may contain nested keys");
      const [, key, raw] = nested as unknown as [string, string, string];
      if (key in metadata) throw new Error(`duplicate metadata key: ${key}`);
      metadata[key] = scalar(raw, `metadata.${key}`);
      continue;
    }
    const top = /^([a-z][a-z-]*):(?:\s+(.+))?$/.exec(line);
    if (!top) throw new Error(`unsupported frontmatter line: ${line.trim()}`);
    const [, key, raw] = top as unknown as [string, string, string | undefined];
    if (!MANIFEST_FIELDS.has(key)) {
      throw new Error(
        `unsupported field '${key}'; the Agent Skills specification allows ${[...MANIFEST_FIELDS].join(", ")}`,
      );
    }
    if (key in fields || (key === "metadata" && inMetadata))
      throw new Error(`duplicate frontmatter field: ${key}`);
    inMetadata = key === "metadata";
    if (inMetadata) {
      if (raw !== undefined) throw new Error("metadata must be a block map of key: value lines");
      fields.metadata = "";
      continue;
    }
    if (raw === undefined) throw new Error(`${key} must be a single-line value`);
    fields[key] = scalar(raw, key);
  }
  for (const key of ["name", "description"]) {
    if (!fields[key]?.trim()) throw new Error(`frontmatter requires a nonempty ${key}`);
  }
  const body = lines.slice(end + 1).join("\n");
  if (!body.trim()) throw new Error("SKILL.md has no instruction body");
  return { fields, metadata, body };
}

/** Yield [lineNumber, line] for lines outside fenced code blocks. */
function proseLines(text: string): [number, string][] {
  const out: [number, string][] = [];
  let marker: string | undefined;
  text.split(/\r?\n/).forEach((line, index) => {
    const match = FENCE.exec(line);
    if (match) {
      const fence = match[1] as string;
      if (marker === undefined) marker = fence;
      else if (
        fence[0] === marker[0] &&
        fence.length >= marker.length &&
        !(match[2] ?? "").trim()
      ) {
        marker = undefined;
      }
      return;
    }
    if (marker === undefined) out.push([index + 1, line]);
  });
  if (marker !== undefined) throw new Error("unclosed fenced code block");
  return out;
}

/** GitHub-style anchors for ATX headings. */
export function headingAnchors(lines: [number, string][]): Set<string> {
  const counts = new Map<string, number>();
  const anchors = new Set<string>();
  for (const [, line] of lines) {
    const match = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const heading = (match[1] as string).toLowerCase().replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
    const slug = [...heading]
      .filter((char) => /[\p{L}\p{N}\p{M} _-]/u.test(char))
      .join("")
      .replaceAll(" ", "-");
    const index = counts.get(slug) ?? 0;
    counts.set(slug, index + 1);
    anchors.add(index === 0 ? slug : `${slug}-${index}`);
  }
  return anchors;
}

function inventory(root: string, directory: string, files: Set<string>, errors: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(join(root, directory)).sort();
  } catch (error) {
    errors.push(`cannot list ${directory}: ${(error as Error).message}`);
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === "__pycache__") continue;
    const path = join(directory, name);
    const stat = lstatSync(join(root, path));
    if (stat.isSymbolicLink()) errors.push(`${path}: symlinks are not portable package resources`);
    else if (stat.isDirectory()) inventory(root, path, files, errors);
    else if (stat.isFile()) files.add(path.split(sep).join("/"));
  }
}

function checkComponentTable(text: string, errors: string[]): void {
  let table: {
    components?: { letter?: string; mandatory?: boolean; tag?: string }[];
    section_order?: string[];
  };
  try {
    table = JSON.parse(text) as typeof table;
  } catch (error) {
    errors.push(`assets/component-table.json: invalid JSON: ${(error as Error).message}`);
    return;
  }
  const components = table.components ?? [];
  const letters = components.map((item) => item.letter);
  if (letters.join("") !== EXPECTED_LETTERS.join("")) {
    errors.push(
      `assets/component-table.json: components must be ${EXPECTED_LETTERS.join(", ")} in order`,
    );
  }
  for (const item of components) {
    if (item.letter && item.mandatory !== (item.letter === item.letter.toUpperCase())) {
      errors.push(
        `assets/component-table.json: ${item.letter} must be ${item.letter === item.letter.toUpperCase() ? "mandatory" : "optional"} (uppercase letters are mandatory)`,
      );
    }
  }
  const tags = components.flatMap((item) => (item.tag ? [item.tag] : []));
  if (
    JSON.stringify([...(table.section_order ?? [])].sort()) !== JSON.stringify([...tags].sort())
  ) {
    errors.push(
      "assets/component-table.json: section_order must list every prompt section tag exactly once",
    );
  }
}

export function validate(rootInput: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const root = resolve(rootInput);
  try {
    if (!statSync(root).isDirectory()) throw new Error("not a directory");
  } catch {
    return {
      valid: false,
      root,
      filesChecked: 0,
      errors: ["skill root is not a directory"],
      warnings,
    };
  }
  const files = new Set<string>(["SKILL.md"]);
  for (const directory of [...LINKED_DIRS, ...SUPPORT_DIRS]) {
    const path = join(root, directory);
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink())
      errors.push(`${directory}: resource directory must not be a symlink`);
    else if (stat.isDirectory()) inventory(root, directory, files, errors);
  }

  const contents = new Map<string, string>();
  for (const file of [...new Set([...files, ...REQUIRED])].sort()) {
    const path = join(root, file);
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      errors.push(`missing required resource: ${file}`);
      continue;
    }
    if (stat.isSymbolicLink() || !stat.isFile()) {
      errors.push(`${file}: must be a regular file, not a symlink`);
      continue;
    }
    const data = readFileSync(path);
    if (!data.toString("utf8").trim()) {
      errors.push(`${file}: empty resource`);
      continue;
    }
    if (TEXT_EXTENSIONS.has(extname(file))) {
      const text = new TextDecoder("utf-8", { fatal: true });
      try {
        contents.set(file, text.decode(data));
      } catch {
        errors.push(`${file}: not valid UTF-8`);
      }
    }
  }

  const skill = contents.get("SKILL.md");
  if (skill !== undefined) {
    try {
      const { fields, metadata } = parseManifest(skill);
      const name = fields.name as string;
      if (name.length > 64 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        errors.push("name must be 1–64 lowercase letters or digits with single interior hyphens");
      }
      if (name !== basename(root))
        errors.push(`manifest name must match the skill directory name: ${basename(root)}`);
      const description = fields.description as string;
      if (description.length > 1024) errors.push("description exceeds 1024 characters");
      if (/\[(TODO|TBD|FIXME)[:\]]/.test(description))
        errors.push("description contains an unfinished marker");
      if (!/\buse when\b/i.test(description))
        warnings.push("description should say when to use the skill");
      if ((fields.compatibility ?? "").length > 500)
        errors.push("compatibility exceeds 500 characters");
      if (
        metadata.version !== undefined &&
        !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(metadata.version)
      ) {
        errors.push("metadata.version must be a semantic version");
      }
    } catch (error) {
      errors.push((error as Error).message);
    }
    if (skill.split("\n").length >= 500)
      warnings.push("SKILL.md should stay under 500 lines for progressive disclosure");
  }
  const table = contents.get("assets/component-table.json");
  if (table !== undefined) checkComponentTable(table, errors);
  for (const [file, text] of contents) {
    if (extname(file) === ".json" && file !== "assets/component-table.json") {
      try {
        JSON.parse(text);
      } catch (error) {
        errors.push(`${file}: invalid JSON: ${(error as Error).message}`);
      }
    }
  }

  const docs = new Map<string, [number, string][]>();
  const anchors = new Map<string, Set<string>>();
  for (const [file, text] of contents) {
    if (extname(file) !== ".md") continue;
    try {
      const lines = proseLines(text);
      docs.set(file, lines);
      anchors.set(file, headingAnchors(lines));
      for (const [number, line] of lines) {
        if (!file.startsWith("assets/") && MARKER.test(line))
          errors.push(`${file}:${number}: unfinished marker`);
        if (/^\s*\[[^\]]+\]:/.test(line))
          errors.push(`${file}:${number}: use inline links so dependencies are validated`);
      }
    } catch (error) {
      errors.push(`${file}: ${(error as Error).message}`);
    }
  }

  const realRoot = realpathSync(root);
  const graph = new Map<string, Set<string>>();
  for (const [file, lines] of docs) {
    for (const [number, raw] of lines) {
      const line = raw.replace(/(`+).*?\1/g, "");
      for (const match of line.matchAll(INLINE_LINK)) {
        const where = `${file}:${number}`;
        const destination = /^\s*(<[^>]+>|\S+)(?:\s+"[^"]*")?\s*$/.exec(match[1] ?? "");
        if (!destination) {
          errors.push(`${where}: unsupported or empty link destination`);
          continue;
        }
        const target = (destination[1] as string).replace(/^<|>$/g, "");
        if (/^(https?|mailto|tel):/i.test(target)) continue;
        try {
          if (
            /^[a-z][a-z0-9+.-]*:/i.test(target) ||
            target.startsWith("//") ||
            target.includes("?") ||
            target.includes("\\")
          ) {
            throw new Error("unsupported local link or scheme");
          }
          const [pathPart = "", fragment] = target.split("#", 2) as [string, string | undefined];
          const absolute = pathPart
            ? resolve(dirname(join(root, file)), decodeURIComponent(pathPart))
            : join(root, file);
          const dependency = relative(root, absolute).split(sep).join("/");
          if (dependency.startsWith("..")) throw new Error("target is outside the skill package");
          if (!contents.has(dependency)) {
            throw new Error(
              files.has(dependency)
                ? "target is not a packaged text resource"
                : "missing local target",
            );
          }
          if (realpathSync(absolute) !== join(realRoot, ...dependency.split("/"))) {
            throw new Error("target path contains a symlink");
          }
          if (fragment && !anchors.get(dependency)?.has(decodeURIComponent(fragment))) {
            throw new Error("missing heading anchor");
          }
          graph.set(file, (graph.get(file) ?? new Set()).add(dependency));
        } catch (error) {
          errors.push(`${where}: invalid local link ${target} (${(error as Error).message})`);
        }
      }
    }
  }

  const reachable = new Set<string>();
  const pending = ["SKILL.md"];
  while (pending.length > 0) {
    const current = pending.shift() as string;
    if (reachable.has(current)) continue;
    reachable.add(current);
    pending.push(...(graph.get(current) ?? []));
  }
  for (const file of [...files].sort()) {
    const top = file.split("/")[0] as string;
    if (LINKED_DIRS.includes(top) && !reachable.has(file)) {
      errors.push(`${file}: not discoverable through links from SKILL.md`);
    }
  }
  return { valid: errors.length === 0, root, filesChecked: contents.size, errors, warnings };
}

function main(argv: string[]): number {
  const json = argv.includes("--json");
  const positional = argv.filter((arg) => arg !== "--json");
  if (positional.length > 1 || positional.some((arg) => arg.startsWith("--"))) {
    console.error("usage: node scripts/validate-skill.ts [SKILL_ROOT] [--json]");
    return 2;
  }
  const root = positional[0] ?? fileURLToPath(new URL("..", import.meta.url));
  const result = validate(root);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `${result.valid ? "PASS" : "FAIL"}: compass-prompt-framework package (${result.filesChecked} text files checked)`,
    );
    for (const error of result.errors) console.log(`ERROR: ${error}`);
    for (const warning of result.warnings) console.log(`WARNING: ${warning}`);
    console.log(
      "Structural validation only; prompt quality, agent behavior, and external URLs are not verified.",
    );
  }
  return result.valid ? 0 : 1;
}

const entry = process.argv[1];
if (entry !== undefined && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
