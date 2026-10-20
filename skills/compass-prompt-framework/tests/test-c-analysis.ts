// Unit tests for the Comprehend (C) stage helper.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { analyzeRequirement, renderCard } from "../scripts/analyze-requirement.ts";
import {
  CUSTOM_EXAMPLE_4,
  PAPER_EXAMPLE_1,
  PAPER_EXAMPLE_2,
  PAPER_EXAMPLE_3,
  requirements,
  runScript,
} from "./helpers.ts";

describe("Comprehend (C) stage", () => {
  test("extracts Action, Intention, Deliverable, Path", () => {
    const result = analyzeRequirement("Write an announcement about the new rotation schedule.");
    for (const field of [result.action, result.intention, result.deliverable, result.path]) {
      assert.equal(typeof field, "string");
      assert.ok(field.length > 0);
    }
    assert.equal(result.heuristic, true);
  });

  test("identifies Tier 0 (trivial) requests and stops (C-1)", () => {
    const result = analyzeRequirement("What's the default PostgreSQL port?");
    assert.equal(result.tier, 0);
    assert.equal(result.decision, "stop");
    for (const requirement of requirements("requirement-trivial.txt")) {
      assert.equal(analyzeRequirement(requirement).tier, 0, requirement);
    }
  });

  test("flags low-confidence intentions and asks at most three questions (C-2)", () => {
    const result = analyzeRequirement("Fix the dashboard. Or maybe redesign it? Not sure.");
    assert.equal(result.intentionConfidence, "low");
    assert.equal(result.decision, "ask");
    assert.ok(result.alternativeReading.includes("redesign"));
    assert.ok(result.clarifyingQuestions.length > 0 && result.clarifyingQuestions.length <= 3);
    assert.match(result.clarifyingQuestions[0] as string, /fix the dashboard, or redesign it\?/);
  });

  test("treats a vague, contextless request as low confidence", () => {
    assert.equal(analyzeRequirement("Make it better.").intentionConfidence, "low");
  });

  test("classifies the fixture tiers", () => {
    for (const requirement of requirements("requirement-tier-1.txt")) {
      assert.equal(analyzeRequirement(requirement).tier, 1, requirement);
    }
    for (const requirement of requirements("requirement-tier-2.txt")) {
      assert.equal(analyzeRequirement(requirement).tier, 2, requirement);
    }
  });

  test("matches the paper's analysis of Example 1 (o and a omitted)", () => {
    const result = analyzeRequirement(PAPER_EXAMPLE_1);
    assert.equal(result.tier, 1);
    assert.equal(result.decision, "proceed");
    assert.equal(result.orderOfOperations.include, false);
    assert.equal(result.anchors.include, false);
    assert.match(result.intention, /pager load/);
  });

  test("matches the paper's analysis of Example 2 (medium confidence, o-1)", () => {
    const result = analyzeRequirement(PAPER_EXAMPLE_2);
    assert.equal(result.tier, 1);
    assert.equal(result.intentionConfidence, "medium");
    assert.match(result.alternativeReading, /already made/);
    assert.ok(result.assumedIntention);
    assert.deepEqual(result.orderOfOperations.triggers, ["o-1"]);
    assert.match(result.path, /pasted materials/);
  });

  test("matches the paper's analysis of Example 3 (Tier 2, high confidence, o-1 and o-3)", () => {
    const result = analyzeRequirement(PAPER_EXAMPLE_3);
    assert.equal(result.tier, 2);
    assert.equal(result.intentionConfidence, "high");
    assert.equal(result.assumedIntention, undefined);
    assert.deepEqual(result.orderOfOperations.triggers, ["o-1", "o-3"]);
    assert.match(result.alternativeReading, /by any means/);
    assert.match(result.path, /pointers/);
  });

  test("matches the custom Example 4 (medium confidence; a only with a known format)", () => {
    const plain = analyzeRequirement(CUSTOM_EXAMPLE_4);
    assert.equal(plain.tier, 1);
    assert.equal(plain.intentionConfidence, "medium");
    assert.equal(plain.orderOfOperations.include, false);
    assert.equal(plain.anchors.include, false);
    const withFormat = analyzeRequirement(CUSTOM_EXAMPLE_4, { fixedFormat: true });
    assert.deepEqual(withFormat.anchors.triggers, ["a-1"]);
  });

  test("applies target-model and vendor triggers (o-2, a-3)", () => {
    const decision = analyzeRequirement(PAPER_EXAMPLE_2, { targetModel: "non-reasoning" });
    assert.ok(decision.orderOfOperations.triggers.includes("o-2"));
    const gemini = analyzeRequirement(PAPER_EXAMPLE_1, {
      vendor: "gemini",
      targetModel: "reasoning",
    });
    assert.deepEqual(gemini.anchors.triggers, ["a-3"]);
    assert.ok(gemini.anchors.reasons.some((reason) => /try without anchors first/.test(reason)));
    const classification = analyzeRequirement(
      "Classify these 200 support tickets into our 12 categories.",
    );
    assert.ok(classification.anchors.triggers.includes("a-2"));
  });

  test("names what the path skips as well as what it does (C-4)", () => {
    const result = analyzeRequirement(PAPER_EXAMPLE_1);
    assert.match(result.path, /no steps/);
    assert.match(result.path, /no examples/);
  });

  test("rejects an empty requirement", () => {
    assert.throws(() => analyzeRequirement("   "), /empty/);
  });

  test("renders a card that labels itself a heuristic draft", () => {
    const card = renderCard(analyzeRequirement(PAPER_EXAMPLE_2));
    assert.match(card, /Heuristic draft/);
    assert.match(card, /\| Efficient path \|/);
    assert.match(card, /Assumed intention/);
  });

  test("CLI prints JSON and reports usage errors", () => {
    const ok = runScript("analyze-requirement.ts", ["--json", PAPER_EXAMPLE_3]);
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).tier, 2);
    const fromStdin = runScript("analyze-requirement.ts", [], "What is the capital of France?");
    assert.equal(fromStdin.status, 0, fromStdin.stderr);
    assert.match(fromStdin.stdout, /Stop \(Tier 0\)/);
    assert.equal(runScript("analyze-requirement.ts", ["--target-model", "huge", "x"]).status, 2);
    assert.equal(runScript("analyze-requirement.ts", [], "").status, 2);
  });
});
