// End-to-end tests: applying CoMPaSS to requirements, and keeping the skill
// consistent with the research paper it packages.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { loadComponentTable } from "../scripts/lib/compass.ts";
import { applyCompass } from "../scripts/scaffold-prompt.ts";
import { validatePrompt } from "../scripts/validate-prompt.ts";
import {
  PAPER_EXAMPLE_1,
  PAPER_EXAMPLE_3,
  REPO_ROOT,
  SKILL_ROOT,
  requirements,
  runScript,
  skillFile,
} from "./helpers.ts";

const PAPER_TITLE = "# CoMPaSS: An Analysis-First Prompting Technique for Large Language Models";
/** SHA-256 of the research document as received; the packaged copy must never change. */
const PAPER_SHA256 = "094dbdb23f4c53bf09cebb71afd1da8e53e6a2ecf17157e0d92c9e3f560a673b";

const paper = (): string => {
  const text = skillFile("references/compass-paper.md");
  return text.slice(text.indexOf(PAPER_TITLE));
};

/** Paper Examples 1–3, exactly as Section 7 prints them. */
const paperExamples = (): string[] => {
  const text = paper();
  const start = text.indexOf("### Example 1:");
  const end = text.indexOf("### Example 4 (counter-example)");
  const block = text.slice(start, end).trimEnd();
  return block.split(/\n(?=### Example \d:)/).map((example) => example.trim());
};

describe("End-to-end CoMPaSS application", () => {
  test("Tier 1 deliverable: announcement email", () => {
    const result = applyCompass(PAPER_EXAMPLE_1);
    assert.equal(result.tier, 1);
    assert.ok(result.prompt);
    assert.ok(result.prompt.includes("<mission>"));
    assert.ok(result.prompt.includes("<success_spec>"));
    assert.ok(!result.prompt.includes("<order_of_operations>"));
  });

  test("Tier 2 agentic task: flaky test fix", () => {
    const result = applyCompass(PAPER_EXAMPLE_3);
    assert.equal(result.tier, 2);
    assert.ok(result.prompt?.includes("<order_of_operations>"));
    assert.match(result.prompt ?? "", /Done means/);
  });

  test("Tier 0 stops without a prompt (C-1)", () => {
    for (const requirement of requirements("requirement-trivial.txt")) {
      const result = applyCompass(requirement);
      assert.equal(result.prompt, null, requirement);
      assert.match(result.message, /C-1/);
    }
  });

  test("low confidence asks instead of writing (C-2)", () => {
    const result = applyCompass("Fix the dashboard. Or maybe redesign it? Not sure.");
    assert.equal(result.prompt, null);
    assert.match(result.message, /C-2/);
  });

  test("every scaffolded Tier 1–2 skeleton passes the prompt validator", () => {
    for (const requirement of [
      ...requirements("requirement-tier-1.txt"),
      ...requirements("requirement-tier-2.txt"),
    ]) {
      for (const options of [{}, { fixedFormat: true, targetModel: "non-reasoning" as const }]) {
        const result = applyCompass(requirement, options);
        assert.ok(result.prompt, requirement);
        const validation = validatePrompt(result.prompt, options);
        assert.deepEqual(
          validation.findings.filter((finding) => finding.severity === "error"),
          [],
          requirement,
        );
        assert.equal(validation.sections[0], "mission");
      }
    }
  });

  test("CLI exits 3 when a gate stops prompt writing", () => {
    assert.equal(runScript("scaffold-prompt.ts", ["What is the capital of France?"]).status, 3);
    const ok = runScript("scaffold-prompt.ts", [PAPER_EXAMPLE_1]);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /```xml\n<mission>/);
  });
});

describe("Consistency with the research paper", () => {
  test("the packaged paper is byte-for-byte the research document", () => {
    assert.equal(createHash("sha256").update(paper()).digest("hex"), PAPER_SHA256);
  });

  test("SKILL.md contains paper Examples 1–3 verbatim and complete", () => {
    const skill = skillFile("SKILL.md");
    const examples = paperExamples();
    assert.equal(examples.length, 3);
    for (const example of examples) assert.ok(skill.includes(example), example.split("\n")[0]);
  });

  test("SKILL.md contains the custom Example 4 verbatim", () => {
    const custom = skillFile("assets/examples/example-4-custom.md").replace(
      "# Example 4:",
      "### Example 4:",
    );
    assert.ok(skillFile("SKILL.md").includes(custom.trimEnd()));
  });

  test("the component table quotes the paper's rules and triggers", () => {
    // The table stores plain text; the paper marks some words with *emphasis*.
    const text = paper().replaceAll("*", "");
    const table = loadComponentTable();
    const comprehend = table.components.find((item) => item.id === "comprehend");
    for (const rule of comprehend?.rules ?? []) {
      assert.ok(typeof rule !== "string" && text.includes(rule.text), JSON.stringify(rule));
    }
    for (const id of ["order_of_operations", "anchors"]) {
      const component = table.components.find((item) => item.id === id);
      assert.equal(component?.mandatory, false);
      assert.equal(component?.inclusion_triggers?.length, 3);
      if (id === "order_of_operations") {
        for (const trigger of component?.inclusion_triggers ?? [])
          assert.ok(text.includes(trigger.text), trigger.id);
      }
    }
    assert.deepEqual(
      table.components.filter((item) => item.mandatory).map((item) => item.letter),
      ["C", "M", "P", "S", "S"],
    );
    assert.equal(table.max_clarifying_questions, 3);
  });

  test("SKILL.md quotes rules C-1 to C-4 exactly as the paper states them", () => {
    const skill = skillFile("SKILL.md");
    for (const line of paper()
      .split("\n")
      .filter((item) => /^- \*\*C-[1-4] /.test(item))) {
      assert.ok(skill.includes(line), line);
    }
  });

  test("generated references are up to date with the paper", (context) => {
    const python = spawnSync("python3", ["--version"]);
    if (python.status !== 0) {
      context.skip("python3 is not available");
      return;
    }
    const check = spawnSync("python3", [`${SKILL_ROOT}scripts/generate-references.py`, "--check"], {
      encoding: "utf8",
    });
    assert.equal(check.status, 0, check.stdout + check.stderr);
  });

  test("the package validator passes", () => {
    const result = runScript("validate-skill.ts", []);
    assert.equal(result.status, 0, result.stdout);
  });
});

describe("Release metadata (repository checkout only)", () => {
  const plugin = `${REPO_ROOT}.claude-plugin/plugin.json`;
  const inRepository = existsSync(plugin) && existsSync(`${REPO_ROOT}package.json`);

  test(
    "versions agree across SKILL.md, plugin.json, package.json, and CHANGELOG.md",
    { skip: !inRepository },
    () => {
      const skillVersion = /^ {2}version: "([^"]+)"$/m.exec(skillFile("SKILL.md"))?.[1];
      const pluginVersion = (JSON.parse(readFileSync(plugin, "utf8")) as { version: string })
        .version;
      const packageVersion = (
        JSON.parse(readFileSync(`${REPO_ROOT}package.json`, "utf8")) as { version: string }
      ).version;
      const changelog = /^## \[(\d+\.\d+\.\d+[^\]]*)\]/m.exec(
        readFileSync(`${REPO_ROOT}CHANGELOG.md`, "utf8"),
      )?.[1];
      assert.ok(skillVersion);
      assert.equal(pluginVersion, skillVersion);
      assert.equal(packageVersion, skillVersion);
      assert.equal(changelog, skillVersion);
    },
  );
});
