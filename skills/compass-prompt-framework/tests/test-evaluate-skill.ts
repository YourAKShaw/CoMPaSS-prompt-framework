// Tests for the evaluation-plan harness. All data here is SYNTHETIC, generated
// in memory to exercise the code paths; it is not, and must never be reported
// as, evaluation evidence about CoMPaSS.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  PLAN,
  type Results,
  type Run,
  type Suite,
  buildReport,
  validateResults,
  validateSuite,
} from "../scripts/evaluate-skill.ts";
import { runScript } from "./helpers.ts";

function syntheticSuite(count = 6): Suite {
  return {
    name: "synthetic",
    tasks: Array.from({ length: count }, (_, index) => ({
      id: `t${index}`,
      category: PLAN.categories[index % 3] as string,
      tier: 1 + (index % 2),
      request: `SYNTHETIC request ${index}`,
      true_intention: `SYNTHETIC intention ${index}`,
      automatic_metric: index === 0,
    })),
  };
}

/** A full factorial of synthetic runs; CoMPaSS matches intention on every task, others on none. */
function syntheticResults(suite: Suite): Results {
  const models = ["v1", "v2", "v3"].flatMap((vendor) =>
    PLAN.modelTypes.map((type) => ({ model: `${vendor}-${type}`, vendor, model_type: type })),
  );
  const runs: Run[] = [];
  for (const task of suite.tasks) {
    const conditions: string[] = [
      ...PLAN.conditions,
      ...(task.automatic_metric ? [PLAN.baselineCeiling] : []),
    ];
    for (const condition of conditions) {
      for (const model of models) {
        for (const layout of ["L1", "L2", "L3"]) {
          runs.push({
            task_id: task.id,
            condition,
            ...model,
            layout,
            task_success: layout === "L1" ? 1 : 0.5,
            intention_match: condition === "compass",
            success_spec_compliance: condition.startsWith("compass") ? true : null,
            input_tokens: condition === "compass" ? 300 : 100,
            output_tokens: 200,
            latency_ms: 1000,
            asked_clarifying_question: false,
          });
        }
      }
    }
  }
  return { suite: suite.name, runs };
}

describe("evaluation harness (paper Section 9.2)", () => {
  test("encodes the pre-registered conditions, models, and hypothesis", () => {
    assert.deepEqual(
      [...PLAN.conditions],
      [
        "plain",
        "art",
        "rtf",
        "co-star",
        "risen",
        "compass",
        "compass-no-c",
        "compass-no-o",
        "compass-no-a",
      ],
    );
    assert.equal(PLAN.taskTarget, 150);
    assert.equal(PLAN.minVendors, 3);
    assert.equal(PLAN.minLayouts, 3);
    assert.match(PLAN.hypothesis, /intention-match rate over RTF and ART on Tier 1–2 tasks/);
  });

  test("accepts a well-formed suite and warns when it is far from 150 tasks", () => {
    const check = validateSuite(syntheticSuite());
    assert.equal(check.valid, true, check.errors.join("\n"));
    assert.match(check.warnings[0] ?? "", /about 150/);
    assert.deepEqual(validateSuite(syntheticSuite(150)).warnings, []);
  });

  test("rejects malformed suites", () => {
    const suite = syntheticSuite();
    (suite.tasks[1] as { true_intention: string }).true_intention = "";
    (suite.tasks[2] as { id: string }).id = "t0";
    (suite.tasks[3] as { tier: number }).tier = 0;
    const check = validateSuite(suite);
    assert.equal(check.valid, false);
    assert.ok(check.errors.some((error) => /true_intention/.test(error)));
    assert.ok(check.errors.some((error) => /duplicate id/.test(error)));
    assert.ok(check.errors.some((error) => /tier must be 1 or 2/.test(error)));
    assert.equal(validateSuite({ tasks: [] }).valid, false);
    const oneCategory = syntheticSuite();
    for (const task of oneCategory.tasks) task.category = "communication";
    assert.ok(
      validateSuite(oneCategory).errors.some((error) =>
        /no tasks in category agentic_coding/.test(error),
      ),
    );
  });

  test("accepts complete results", () => {
    const suite = syntheticSuite();
    const check = validateResults(suite, syntheticResults(suite));
    assert.equal(check.valid, true, check.errors.join("\n"));
  });

  test("reports missing coverage: cells, vendors, model types, layouts, baseline", () => {
    const suite = syntheticSuite();
    const results = syntheticResults(suite);
    const partial: Results = {
      suite: suite.name,
      runs: results.runs.filter(
        (run) =>
          run.vendor !== "v3" &&
          !(run.vendor === "v2" && run.model_type === "reasoning") &&
          !(run.condition === "rtf" && run.layout === "L3") &&
          run.condition !== PLAN.baselineCeiling &&
          !(run.task_id === "t1" && run.condition === "art"),
      ),
    };
    const errors = validateResults(suite, partial).errors.join("\n");
    assert.match(errors, /2 vendors/);
    assert.match(errors, /vendor v2 has no reasoning model/);
    assert.match(errors, /condition rtf uses 2 layouts/);
    assert.match(errors, /t0\/optimized-baseline/);
    assert.match(errors, /cells have no run/);
  });

  test("rejects invalid run records", () => {
    const suite = syntheticSuite();
    const results = syntheticResults(suite);
    const bad = { ...(results.runs[0] as Run), task_success: 2, condition: "magic" };
    const errors = validateResults(suite, {
      suite: suite.name,
      runs: [...results.runs, bad],
    }).errors.join("\n");
    assert.match(errors, /task_success must be a number from 0 to 1/);
    assert.equal(validateResults(suite, { suite: "other", runs: results.runs }).valid, false);
  });

  test("computes descriptive metrics and paired comparisons", () => {
    const suite = syntheticSuite();
    const report = buildReport(suite, syntheticResults(suite));
    assert.equal(report.complete, true);
    const compass = report.conditions.find((item) => item.condition === "compass");
    assert.equal(compass?.intentionMatchRate, 1);
    assert.equal(compass?.successSpecCompliance, 1);
    assert.equal(compass?.layoutSpread, 0.5);
    assert.equal(
      report.conditions.find((item) => item.condition === "plain")?.successSpecCompliance,
      null,
    );
    for (const comparison of report.hypothesis.comparisons) {
      assert.equal(comparison.tasks, 6);
      assert.equal(comparison.intentionMatchDifference, 1);
      assert.deepEqual(comparison.ci95, [1, 1]);
      assert.equal(comparison.ciExcludesZero, true);
      assert.equal(comparison.meanTokenDifference, 200);
    }
    assert.ok(report.notes.some((note) => /not proof of general superiority/.test(note)));
  });

  test("is deterministic", () => {
    const suite = syntheticSuite();
    const results = syntheticResults(suite);
    results.runs.forEach((run, index) => {
      run.intention_match = index % 3 === 0;
    });
    assert.deepEqual(buildReport(suite, results), buildReport(suite, results));
  });

  test("refuses incomplete results unless explicitly exploratory", () => {
    const suite = syntheticSuite();
    const partial = { suite: suite.name, runs: syntheticResults(suite).runs.slice(0, 50) };
    assert.throws(() => buildReport(suite, partial), /do not satisfy the pre-registered plan/);
    const exploratory = buildReport(suite, partial, true);
    assert.equal(exploratory.complete, false);
    assert.match(exploratory.notes[0] ?? "", /INCOMPLETE/);
  });

  test("CLI commands and exit codes", () => {
    const directory = mkdtempSync(join(tmpdir(), "compass-eval-"));
    const suite = syntheticSuite();
    const suitePath = join(directory, "suite.json");
    const resultsPath = join(directory, "results.json");
    const partialPath = join(directory, "partial.json");
    writeFileSync(suitePath, JSON.stringify(suite));
    writeFileSync(resultsPath, JSON.stringify(syntheticResults(suite)));
    writeFileSync(partialPath, JSON.stringify({ suite: suite.name, runs: [] }));
    assert.match(runScript("evaluate-skill.ts", ["plan"]).stdout, /not yet run/);
    assert.equal(
      JSON.parse(runScript("evaluate-skill.ts", ["template"]).stdout).suite.tasks.length,
      1,
    );
    assert.equal(runScript("evaluate-skill.ts", ["validate-suite", suitePath]).status, 0);
    assert.equal(
      runScript("evaluate-skill.ts", ["validate-results", suitePath, resultsPath]).status,
      0,
    );
    const report = runScript("evaluate-skill.ts", ["report", suitePath, resultsPath]);
    assert.equal(report.status, 0, report.stderr);
    assert.match(report.stdout, /\| compass \|/);
    assert.equal(runScript("evaluate-skill.ts", ["report", suitePath, partialPath]).status, 1);
    assert.equal(
      runScript("evaluate-skill.ts", ["report", suitePath, partialPath, "--allow-incomplete"])
        .status,
      0,
    );
    assert.equal(runScript("evaluate-skill.ts", ["fly"]).status, 2);
    assert.equal(
      runScript("evaluate-skill.ts", ["validate-suite", join(directory, "missing.json")]).status,
      2,
    );
  });
});
