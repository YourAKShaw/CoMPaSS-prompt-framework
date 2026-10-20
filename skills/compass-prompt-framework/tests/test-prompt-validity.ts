// Validation that assembled prompts follow the CoMPaSS architecture.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validatePrompt } from "../scripts/validate-prompt.ts";
import { EXAMPLE_NAMES, expectedPrompt, runScript, skillFile, SKILL_ROOT } from "./helpers.ts";

const codes = (prompt: string): string[] =>
  validatePrompt(prompt).findings.map((item) => item.code);

const VALID = `<mission>
Write a release note for version 2.0 so that existing users know what changes for them.
</mission>
<provisions>
- Audience: existing users of the CLI.
</provisions>
<scope>
- Use only the facts above; keep every bracketed placeholder exactly as written.
</scope>
<success_spec>
Output: a 120-word note in plain language.
Before returning, check: (1) every placeholder is preserved, (2) breaking changes come first.
</success_spec>`;

describe("Prompt validity (CoMPaSS compliance)", () => {
  for (const name of EXAMPLE_NAMES) {
    test(`${name}: contains all mandatory sections and no errors`, () => {
      const result = validatePrompt(expectedPrompt(name));
      assert.deepEqual(result.findings, []);
      assert.equal(result.valid, true);
      assert.equal(result.hasMission, true);
      assert.equal(result.hasProvisions, true);
      assert.equal(result.hasScope, true);
      assert.equal(result.hasSuccessSpec, true);
      assert.equal(result.sections[0], "mission");
    });

    test(`${name}: optional components have a stated inclusion trigger`, () => {
      const result = validatePrompt(expectedPrompt(name));
      if (result.hasOrderOfOperations) assert.ok(result.orderOfOperationsTrigger?.length);
      if (result.hasAnchors) assert.ok(result.anchorTrigger?.length);
    });

    test(`${name}: Success spec includes verification checks`, () => {
      const result = validatePrompt(expectedPrompt(name));
      assert.equal(result.hasVerificationChecks, true);
      assert.match(
        result.successSpec,
        name === "example-3-agentic" ? /Done means/ : /Before returning/,
      );
    });

    test(`${name}: the regression fixture matches the example asset`, () => {
      const asset = skillFile(`assets/examples/${name}.md`);
      assert.ok(
        asset.includes(`\`\`\`xml\n${expectedPrompt(name)}\`\`\``),
        "fixture drifted from asset",
      );
    });
  }

  test("optional components match the paper's inclusion decisions", () => {
    const triggers = (name: string): [string[] | undefined, string[] | undefined] => {
      const result = validatePrompt(expectedPrompt(name));
      return [result.orderOfOperationsTrigger, result.anchorTrigger];
    };
    assert.deepEqual(triggers("example-1-announcement"), [undefined, undefined]);
    assert.deepEqual(triggers("example-2-decision"), [["o-1"], undefined]);
    assert.deepEqual(triggers("example-3-agentic"), [["o-1", "o-3"], ["a-1"]]);
    assert.deepEqual(triggers("example-4-custom"), [undefined, ["a-1"]]);
  });

  test("reports missing mandatory sections", () => {
    const result = validatePrompt("<mission>Do X so that Y.</mission>");
    assert.equal(result.valid, false);
    const missing = result.findings
      .filter((item) => item.code === "missing-section")
      .map((item) => item.section);
    assert.deepEqual(missing.sort(), ["provisions", "scope", "success_spec"]);
  });

  test("requires Mission first", () => {
    const reordered =
      VALID.replace(/<mission>[\s\S]*?<\/mission>\n/, "") + "\n<mission>Do X so that Y.</mission>";
    assert.ok(codes(reordered).includes("mission-not-first"));
  });

  test("rejects an empty optional section", () => {
    const prompt = VALID.replace("<scope>", "<anchors></anchors>\n<scope>");
    assert.ok(codes(prompt).includes("empty-section"));
  });

  test("rejects a Success spec without output shape or verification", () => {
    const prompt = VALID.replace(
      /<success_spec>[\s\S]*<\/success_spec>/,
      "<success_spec>\nMake it good.\n</success_spec>",
    );
    const found = codes(prompt);
    assert.ok(found.includes("success-spec-without-output-shape"));
    assert.ok(found.includes("success-spec-without-verification"));
  });

  test("rejects a pasted analysis card (C-3)", () => {
    const prompt = VALID.replace("</provisions>", "Efficient path: single pass\n</provisions>");
    assert.ok(codes(prompt).includes("pasted-analysis-card"));
  });

  test("warns on persona lines, reasoning scripts, and untriggered steps", () => {
    const prompt = VALID.replace(
      "<mission>\n",
      "<mission>\nYou are a world-class writer. ",
    ).replace(
      "<scope>",
      "<order_of_operations>\n1. Think step by step.\n2. Consider the options.\n</order_of_operations>\n<scope>",
    );
    const result = validatePrompt(prompt);
    assert.equal(result.valid, true);
    const found = result.findings.map((item) => item.code);
    for (const code of ["persona-line", "reasoning-instruction", "order-without-trigger"]) {
      assert.ok(found.includes(code), code);
    }
  });

  test("honors declared triggers and target options", () => {
    const declared = VALID.replace(
      "<scope>",
      '<order_of_operations trigger="o-2">\n1. Solve each part.\n</order_of_operations>\n<scope>',
    );
    assert.deepEqual(validatePrompt(declared).orderOfOperationsTrigger, ["o-2"]);
    const steps = VALID.replace(
      "<scope>",
      "<order_of_operations>\n1. Solve each part.\n</order_of_operations>\n<scope>",
    );
    assert.deepEqual(
      validatePrompt(steps, { targetModel: "non-reasoning" }).orderOfOperationsTrigger,
      ["o-2"],
    );
  });

  test("warns when Mission states no intention or Scope has only prohibitions", () => {
    const prompt = VALID.replace("so that existing users know what changes for them", "").replace(
      "- Use only the facts above; keep every bracketed placeholder exactly as written.",
      "- Do not exaggerate.\n- Never mention pricing.",
    );
    const found = codes(prompt);
    assert.ok(found.includes("mission-without-intention"));
    assert.ok(found.includes("scope-only-prohibitions"));
    assert.ok(found.includes("scope-without-assumption-policy"));
  });

  test("accepts Markdown headings and a prompt inside a fenced block", () => {
    const headings: Record<string, string> = {
      mission: "Mission",
      provisions: "Provisions",
      scope: "Scope",
      success_spec: "Success spec",
    };
    const markdown = VALID.replace(
      /<(\w+)>/g,
      (_, tag: string) => `## ${headings[tag] ?? tag}`,
    ).replace(/<\/\w+>/g, "");
    const result = validatePrompt(markdown);
    assert.equal(result.format, "markdown");
    assert.equal(result.valid, true, JSON.stringify(result.findings));
    const fenced = validatePrompt(skillFile("assets/examples/example-2-decision.md"));
    assert.equal(fenced.valid, true);
    assert.equal(fenced.hasOrderOfOperations, true);
  });

  test("lists placeholders for the author to fill", () => {
    assert.ok(
      validatePrompt(expectedPrompt("example-2-decision")).placeholders.includes(
        "[PASTE: table sizes, row counts, growth rate]",
      ),
    );
  });

  test("CLI exit codes: 0 valid, 1 errors, 2 usage", () => {
    assert.equal(
      runScript("validate-prompt.ts", [
        `${SKILL_ROOT}tests/fixtures/expected-prompts/example-3-agentic.xml`,
      ]).status,
      0,
    );
    const invalid = runScript("validate-prompt.ts", ["-"], "<mission>x</mission>");
    assert.equal(invalid.status, 1);
    assert.match(invalid.stdout, /missing-section/);
    assert.equal(runScript("validate-prompt.ts", ["no-such-file.xml"]).status, 2);
    assert.equal(
      JSON.parse(runScript("validate-prompt.ts", ["--json", "-"], VALID).stdout).valid,
      true,
    );
  });
});
