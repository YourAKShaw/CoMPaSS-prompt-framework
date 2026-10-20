// Regression tests for the package validator, using disposable copies of the skill.
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { parseManifest, validate } from "../scripts/validate-skill.ts";
import { SKILL_ROOT, runScript } from "./helpers.ts";

/** Copy the skill into a temporary directory named like the skill, then apply a mutation. */
function mutated(change: (root: string) => void, name = "compass-prompt-framework"): string {
  const root = join(mkdtempSync(join(tmpdir(), "compass-skill-")), name);
  cpSync(SKILL_ROOT, root, { recursive: true });
  change(root);
  return root;
}

function edit(root: string, file: string, from: string | RegExp, to: string): void {
  const path = join(root, file);
  const text = readFileSync(path, "utf8");
  const next = text.replace(from, to);
  assert.notEqual(next, text, `mutation did not apply to ${file}`);
  writeFileSync(path, next);
}

function errorsFor(change: (root: string) => void, name?: string): string {
  const root = mutated(change, name);
  try {
    return validate(root).errors.join("\n");
  } finally {
    rmSync(join(root, ".."), { recursive: true, force: true });
  }
}

describe("package validator", () => {
  test("the packaged skill is valid", () => {
    const result = validate(SKILL_ROOT);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
    assert.ok(result.filesChecked > 30);
  });

  test("parses the specification fields and metadata map", () => {
    const manifest = parseManifest(readFileSync(join(SKILL_ROOT, "SKILL.md"), "utf8"));
    assert.equal(manifest.fields.name, "compass-prompt-framework");
    assert.equal(manifest.fields.license, "MIT");
    assert.match(manifest.metadata.version ?? "", /^\d+\.\d+\.\d+/);
    assert.ok((manifest.fields.description ?? "").length <= 1024);
  });

  test("rejects manifest problems", () => {
    assert.throws(() => parseManifest("no frontmatter"), /frontmatter delimiter/);
    assert.throws(() => parseManifest("---\nname: x\n"), /closing delimiter/);
    assert.throws(
      () => parseManifest("---\nname: x\ndescription: y\nversion: 1\n---\nbody"),
      /unsupported field 'version'/,
    );
    assert.throws(
      () => parseManifest("---\nname: x\ndescription: a: b\n---\nbody"),
      /ambiguous plain scalar/,
    );
    assert.throws(() => parseManifest("---\nname: x\n---\nbody"), /nonempty description/);
    assert.throws(
      () => parseManifest("---\nname: x\ndescription: y\n---\n"),
      /no instruction body/,
    );
    assert.throws(
      () => parseManifest("---\nname: x\n  nested: y\ndescription: y\n---\nbody"),
      /only metadata/,
    );
  });

  test("requires the name to match the directory", () => {
    assert.match(
      errorsFor(() => undefined, "renamed-skill"),
      /must match the skill directory name/,
    );
  });

  test("reports broken links and missing anchors", () => {
    const errors = errorsFor((root) => {
      edit(root, "SKILL.md", "(references/limitations.md)", "(references/missing.md)");
      edit(
        root,
        "SKILL.md",
        "(references/compass-paper.md#3-verification-of-the-starting-claims)",
        "(references/compass-paper.md#nope)",
      );
    });
    assert.match(errors, /references\/missing.md \(missing local target\)/);
    assert.match(errors, /#nope \(missing heading anchor\)/);
  });

  test("reports missing, empty, and unreachable resources", () => {
    const errors = errorsFor((root) => {
      rmSync(join(root, "assets/templates/s-scope.md"));
      writeFileSync(join(root, "references/notes.md"), "# Orphan\n");
      writeFileSync(join(root, "tests/fixtures/empty.txt"), "  \n");
    });
    assert.match(errors, /missing required resource: assets\/templates\/s-scope.md/);
    assert.match(errors, /references\/notes.md: not discoverable/);
    assert.match(errors, /tests\/fixtures\/empty.txt: empty resource/);
  });

  test("rejects symlinks, invalid component tables, and unfinished markers", () => {
    const errors = errorsFor((root) => {
      symlinkSync(join(root, "references/limitations.md"), join(root, "references/link.md"));
      edit(root, "assets/component-table.json", '"letter": "o"', '"letter": "O"');
      edit(root, "references/limitations.md", "## 9.1", "TODO: finish\n\n## 9.1");
    });
    assert.match(errors, /references\/link.md: symlinks are not portable/);
    assert.match(errors, /components must be C, o, M, P, a, S, S/);
    assert.match(errors, /limitations.md:\d+: unfinished marker/);
  });

  test("rejects reference-style links and links that leave the package", () => {
    const errors = errorsFor((root) => {
      edit(
        root,
        "references/limitations.md",
        "## 9.1",
        "[paper]: compass-paper.md\n\n[up](../../README.md)\n\n## 9.1",
      );
    });
    assert.match(errors, /use inline links/);
    assert.match(errors, /outside the skill package/);
  });

  test("CLI reports PASS, FAIL, and usage errors", () => {
    assert.equal(runScript("validate-skill.ts", []).status, 0);
    const json = JSON.parse(runScript("validate-skill.ts", ["--json"]).stdout) as {
      valid: boolean;
    };
    assert.equal(json.valid, true);
    assert.equal(runScript("validate-skill.ts", [join(SKILL_ROOT, "references")]).status, 1);
    assert.equal(runScript("validate-skill.ts", ["--strict"]).status, 2);
  });
});
