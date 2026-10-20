#!/usr/bin/env node
// Draft a CoMPaSS analysis card and a prompt skeleton from a raw requirement.
//
// Usage: node scripts/scaffold-prompt.ts "<requirement>" [--target-model reasoning|non-reasoning]
//          [--vendor <name>] [--fixed-format] [--json]
//        (reads the requirement from stdin when no argument is given)
// Exit status: 0 skeleton drafted, 3 stopped at a gate (Tier 0 or clarification needed), 2 usage error.
//
// The skeleton applies the CoMPaSS gates and section order; every bracketed slot
// still needs the author's content. Optional sections appear only when a trigger
// fired. Node.js 22.18+, no dependencies, no network access.
import { analyzeRequirement, renderCard } from "./analyze-requirement.ts";
import {
  type RequirementAnalysis,
  type TargetOptions,
  type Tier,
  UsageError,
  isMain,
  parseArgs,
  readInput,
} from "./lib/compass.ts";

export interface CompassResult {
  analysis: RequirementAnalysis;
  tier: Tier;
  decision: RequirementAnalysis["decision"];
  /** The prompt skeleton, or null when a gate stopped prompt writing. */
  prompt: string | null;
  message: string;
}

const lower = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

function mission(analysis: RequirementAnalysis): string[] {
  const lines = [
    "<mission>",
    `[WHAT TO PRODUCE OR DECIDE: ${analysis.deliverable.replace(/\.$/, "")}], so that`,
    "[WHY: the outcome in the world the user wants].",
  ];
  if (analysis.intentionConfidence === "medium") {
    lines.push(
      `Assumed intention: [THE READING YOU ARE ACTING ON]; not ${lower(analysis.alternativeReading).replace(/\.$/, "")}.`,
      "If the evidence contradicts this assumption, say so.",
    );
  }
  lines.push("</mission>");
  return lines;
}

function provisions(analysis: RequirementAnalysis): string[] {
  const lines = ["<provisions>"];
  if (/\b(pasted|attached|below|here is|here are|included)\b/i.test(analysis.requirement)) {
    lines.push("<materials>", "[PASTE: the materials the user attached]", "</materials>");
  }
  if (analysis.tier === 2) {
    lines.push(
      "- Where to look: [REPO OR WORKSPACE PATH]; relevant files: [FILE PATHS].",
      "- Commands: [COMMAND TO REPRODUCE OR RUN], [COMMAND TO VERIFY].",
      "- Read files as you need them; do not load everything up front.",
    );
  } else {
    lines.push(
      "- Audience: [WHO READS OR ACTS ON THE OUTPUT].",
      "- Facts: [ONLY FACTS THAT CHANGE THE OUTPUT].",
    );
  }
  lines.push(
    "- Unknowns: [ANY FACT NOT YET KNOWN], kept as a bracketed placeholder.",
    "- Perspective (optional, style only): [ONE LINE, ONLY IF VOICE MATTERS].",
    "</provisions>",
  );
  return lines;
}

function orderOfOperations(analysis: RequirementAnalysis): string[] {
  const { triggers } = analysis.orderOfOperations;
  if (!analysis.orderOfOperations.include) return [];
  const lines = ["<order_of_operations>"];
  if (/^Evaluating a decision/.test(analysis.action)) {
    lines.push(
      "1. State the decision criteria and their weights before evaluating any option.",
      "2. Evaluate [N] options against those criteria, including the status quo.",
      "3. Recommend one option, with the conditions under which the recommendation flips.",
      "4. Propose the single cheapest experiment that would most reduce uncertainty.",
    );
  } else if (/\b(fix|debug|investigate|patch)\b/i.test(analysis.requirement)) {
    lines.push(
      "1. Reproduce: [HOW TO REPRODUCE, AND HOW OFTEN], and record the result before changing anything.",
      "2. Isolate: identify the cause and confirm it with a targeted experiment.",
      "3. Fix at the root, where the evidence points.",
      "4. Verify (see success_spec), then report.",
    );
  } else {
    lines.push(
      "1. [STEP THAT MUST HAPPEN FIRST] before [THE STEP THAT DEPENDS ON IT].",
      "2. [NEXT REQUIRED STEP].",
    );
  }
  if (triggers.includes("o-3")) {
    lines.push("Pause and report after step [N] if [CONDITION THAT NEEDS A HUMAN DECISION].");
  }
  lines.push("</order_of_operations>");
  return lines;
}

function anchors(analysis: RequirementAnalysis): string[] {
  if (!analysis.anchors.include) return [];
  if (analysis.anchors.triggers.includes("a-2") && !analysis.anchors.triggers.includes("a-1")) {
    return [
      "<anchors>",
      "<example>[INPUT 1] → [LABEL]</example>",
      "<example>[INPUT 2, DIFFERENT IN KIND] → [LABEL]</example>",
      "<example>[INPUT 3, A HARD CASE] → [LABEL]</example>",
      "</anchors>",
    ];
  }
  return [
    "<anchors>",
    '<template note="Format only. Do not reuse its content.">',
    "[SKELETON OF THE REQUIRED FORMAT, WITH BRACKETED SLOTS]",
    "</template>",
    "</anchors>",
  ];
}

function scope(analysis: RequirementAnalysis): string[] {
  const lines = [
    "<scope>",
    "- In scope: [WHAT THE WORK COVERS]. Out of scope: [NON-GOALS].",
    "- Use only the facts provided; keep every bracketed placeholder exactly as written.",
  ];
  if (analysis.tier === 2) {
    lines.push(
      "- Prohibited shortcuts: [SHORTCUTS THAT WOULD HIDE THE PROBLEM, e.g. retries, skips, loosened checks].",
      "- Change only what the task needs; no unrelated refactors or upgrades.",
      "- If [LIMIT] is reached without success, stop and report what you tried.",
    );
  } else {
    lines.push("- Limits: [LENGTH OR BUDGET].");
  }
  lines.push("- Assumption policy: proceed and label each assumption you make.", "</scope>");
  return lines;
}

function successSpec(analysis: RequirementAnalysis): string[] {
  if (analysis.tier === 2) {
    return [
      "<success_spec>",
      "Done means all of the following are true and reported:",
      "1. [EXECUTABLE CHECK, WITH COMMAND OR THRESHOLD].",
      "2. [EXECUTABLE CHECK].",
      "3. A report of what was and was not verified.",
      "Return: [ARTIFACTS AND EVIDENCE TO HAND BACK].",
      "</success_spec>",
    ];
  }
  return [
    "<success_spec>",
    "Output: [FORMAT], with sections [SECTIONS IN ORDER], [LENGTH], in a [TONE] tone.",
    "Before returning, check: (1) every placeholder is preserved,",
    "(2) [CHECK TIED TO THE MISSION], (3) [CHECK TIED TO A SCOPE RULE].",
    "</success_spec>",
  ];
}

/** Build a prompt skeleton in the default order: Mission → Provisions → (order) → (anchors) → Scope → Success spec. */
export function scaffoldPrompt(analysis: RequirementAnalysis): string {
  if (analysis.decision !== "proceed") {
    throw new UsageError(
      `cannot scaffold a prompt when the C-stage decision is "${analysis.decision}"`,
    );
  }
  return [mission, provisions, orderOfOperations, anchors, scope, successSpec]
    .map((section) => section(analysis))
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join("\n"))
    .join("\n\n");
}

/** Apply the CoMPaSS gates to a requirement and, when they allow it, draft a prompt skeleton. */
export function applyCompass(requirement: string, options: TargetOptions = {}): CompassResult {
  const analysis = analyzeRequirement(requirement, options);
  const base = { analysis, tier: analysis.tier, decision: analysis.decision };
  if (analysis.decision === "stop") {
    return {
      ...base,
      prompt: null,
      message: "Tier 0 (rule C-1): stop. Ask the question directly or use ART/RTF.",
    };
  }
  if (analysis.decision === "ask") {
    return {
      ...base,
      prompt: null,
      message: `Low intention confidence (rule C-2): ask these questions, then restart the C stage:\n${analysis.clarifyingQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}`,
    };
  }
  return {
    ...base,
    prompt: scaffoldPrompt(analysis),
    message:
      "Skeleton drafted. Fill every bracketed slot; delete any line that does not change the output.",
  };
}

function main(argv: string[]): number {
  try {
    const args = parseArgs(argv);
    const requirement =
      args.positional.length > 0 ? args.positional.join(" ") : readInput(undefined);
    const result = applyCompass(requirement, args.options);
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(renderCard(result.analysis));
      console.log(`\n${result.message}`);
      if (result.prompt) console.log(`\n\`\`\`xml\n${result.prompt}\n\`\`\``);
    }
    return result.prompt ? 0 : 3;
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`usage error: ${error.message}`);
      console.error(
        'usage: node scripts/scaffold-prompt.ts "<requirement>" [--target-model reasoning|non-reasoning] [--vendor <name>] [--fixed-format] [--json]',
      );
      return 2;
    }
    throw error;
  }
}

if (isMain(import.meta.url)) process.exitCode = main(process.argv.slice(2));
