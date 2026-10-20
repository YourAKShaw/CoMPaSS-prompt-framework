#!/usr/bin/env node
// Harness for the pre-registered CoMPaSS evaluation plan (paper Section 9.2).
//
// Usage:
//   node scripts/evaluate-skill.ts plan [--json]                       print the plan's requirements
//   node scripts/evaluate-skill.ts template                            print empty suite and results files
//   node scripts/evaluate-skill.ts validate-suite SUITE [--json]       check a task suite
//   node scripts/evaluate-skill.ts validate-results SUITE RESULTS [--json]
//   node scripts/evaluate-skill.ts report SUITE RESULTS [--json] [--allow-incomplete]
// Exit status: 0 valid, 1 validation errors, 2 usage error.
//
// It never calls a model and ships no results: runs are produced elsewhere and
// recorded in the results format below. Metrics are descriptive; the hypothesis
// section reports differences with paired bootstrap intervals and does not
// declare a winner. Node.js 22.18+, no dependencies, no network access.
import { readFileSync } from "node:fs";
import { UsageError, isMain } from "./lib/compass.ts";

export const PLAN = {
  source: "references/evaluation-plan.md (paper Section 9.2)",
  taskTarget: 150,
  categories: ["communication", "analysis_decision", "agentic_coding"],
  conditions: [
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
  /** GEPA- or DSPy-optimized prompt, required only for tasks with automatic metrics. */
  baselineCeiling: "optimized-baseline",
  minVendors: 3,
  modelTypes: ["reasoning", "non-reasoning"],
  minLayouts: 3,
  metrics: [
    "Blind rubric-graded task success",
    "Intention-match rate",
    "Success-spec compliance",
    "Tokens and latency",
    "Clarifying-question rate",
    "Spread across at least three meaning-preserving layouts (Sclar et al.)",
  ],
  hypothesis:
    "CoMPaSS improves intention-match rate over RTF and ART on Tier 1–2 tasks, at a measurable token cost.",
} as const;

export interface Task {
  id: string;
  category: string;
  tier: number;
  request: string;
  /** Written by the requester and hidden from every condition. */
  true_intention: string;
  automatic_metric?: boolean;
}

export interface Suite {
  name: string;
  tasks: Task[];
}

export interface Run {
  task_id: string;
  condition: string;
  model: string;
  vendor: string;
  model_type: "reasoning" | "non-reasoning";
  layout: string;
  /** Blind rubric grade, normalized to 0–1. */
  task_success: number;
  intention_match: boolean;
  /** null when the condition has no Success spec to comply with. */
  success_spec_compliance: boolean | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  asked_clarifying_question: boolean;
}

export interface Results {
  suite: string;
  runs: Run[];
}

export interface Check {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConditionMetrics {
  condition: string;
  runs: number;
  taskSuccess: number;
  intentionMatchRate: number;
  successSpecCompliance: number | null;
  meanInputTokens: number;
  meanOutputTokens: number;
  meanLatencyMs: number;
  clarifyingQuestionRate: number;
  layoutSpread: number | null;
  byModelType: Record<string, { runs: number; taskSuccess: number; intentionMatchRate: number }>;
}

export interface Comparison {
  baseline: string;
  tasks: number;
  intentionMatchDifference: number;
  ci95: [number, number];
  ciExcludesZero: boolean;
  meanTokenDifference: number;
}

export interface Report {
  complete: boolean;
  suite: string;
  conditions: ConditionMetrics[];
  hypothesis: { statement: string; comparisons: Comparison[] };
  notes: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mean = (values: number[]): number =>
  values.length === 0 ? Number.NaN : values.reduce((sum, value) => sum + value, 0) / values.length;

const rate = (values: boolean[]): number => mean(values.map((value) => (value ? 1 : 0)));

const round = (value: number, digits = 4): number => Number(value.toFixed(digits));

export function validateSuite(input: unknown): Check {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input) || typeof input.name !== "string" || !Array.isArray(input.tasks)) {
    return {
      valid: false,
      errors: ["suite must be an object with a name and a tasks array"],
      warnings,
    };
  }
  const ids = new Set<string>();
  const categories = new Map<string, number>();
  input.tasks.forEach((task: unknown, index) => {
    const where = `tasks[${index}]`;
    if (!isObject(task)) {
      errors.push(`${where}: must be an object`);
      return;
    }
    for (const field of ["id", "category", "request", "true_intention"]) {
      if (typeof task[field] !== "string" || !(task[field] as string).trim()) {
        errors.push(`${where}: ${field} must be a nonempty string`);
      }
    }
    if (typeof task.id === "string") {
      if (ids.has(task.id)) errors.push(`${where}: duplicate id ${task.id}`);
      ids.add(task.id);
    }
    if (typeof task.category === "string") {
      if (!(PLAN.categories as readonly string[]).includes(task.category)) {
        errors.push(`${where}: category must be one of ${PLAN.categories.join(", ")}`);
      }
      categories.set(task.category, (categories.get(task.category) ?? 0) + 1);
    }
    if (task.tier !== 1 && task.tier !== 2) {
      errors.push(`${where}: tier must be 1 or 2 (the hypothesis concerns Tier 1–2 tasks)`);
    }
    if (task.automatic_metric !== undefined && typeof task.automatic_metric !== "boolean") {
      errors.push(`${where}: automatic_metric must be a boolean when present`);
    }
  });
  for (const category of PLAN.categories) {
    if (!categories.has(category)) errors.push(`no tasks in category ${category}`);
  }
  if (input.tasks.length < PLAN.taskTarget * 0.9 || input.tasks.length > PLAN.taskTarget * 1.1) {
    warnings.push(
      `the plan calls for about ${PLAN.taskTarget} real requests; this suite has ${input.tasks.length}`,
    );
  }
  return { valid: errors.length === 0, errors, warnings };
}

function runErrors(run: unknown, where: string): string[] {
  if (!isObject(run)) return [`${where}: must be an object`];
  const errors: string[] = [];
  for (const field of ["task_id", "condition", "model", "vendor", "layout"]) {
    if (typeof run[field] !== "string" || !(run[field] as string).trim()) {
      errors.push(`${where}: ${field} must be a nonempty string`);
    }
  }
  if (!(PLAN.modelTypes as readonly unknown[]).includes(run.model_type)) {
    errors.push(`${where}: model_type must be reasoning or non-reasoning`);
  }
  if (typeof run.task_success !== "number" || run.task_success < 0 || run.task_success > 1) {
    errors.push(`${where}: task_success must be a number from 0 to 1`);
  }
  for (const field of ["intention_match", "asked_clarifying_question"]) {
    if (typeof run[field] !== "boolean") errors.push(`${where}: ${field} must be a boolean`);
  }
  if (run.success_spec_compliance !== null && typeof run.success_spec_compliance !== "boolean") {
    errors.push(`${where}: success_spec_compliance must be a boolean or null`);
  }
  for (const field of ["input_tokens", "output_tokens", "latency_ms"]) {
    if (typeof run[field] !== "number" || (run[field] as number) < 0) {
      errors.push(`${where}: ${field} must be a non-negative number`);
    }
  }
  return errors;
}

export function validateResults(suiteInput: unknown, resultsInput: unknown): Check {
  const suiteCheck = validateSuite(suiteInput);
  const errors = suiteCheck.errors.map((error) => `suite: ${error}`);
  const warnings = [...suiteCheck.warnings];
  if (!isObject(resultsInput) || !Array.isArray(resultsInput.runs)) {
    return {
      valid: false,
      errors: [...errors, "results must be an object with a runs array"],
      warnings,
    };
  }
  if (!suiteCheck.valid) return { valid: false, errors, warnings };
  const suite = suiteInput as unknown as Suite;
  const runs = resultsInput.runs as unknown[];
  if (resultsInput.suite !== suite.name) {
    errors.push(`results name suite ${String(resultsInput.suite)}, not ${suite.name}`);
  }
  const tasks = new Map(suite.tasks.map((task) => [task.id, task]));
  const allowed = new Set<string>([...PLAN.conditions, PLAN.baselineCeiling]);
  const valid: Run[] = [];
  runs.forEach((run, index) => {
    const problems = runErrors(run, `runs[${index}]`);
    const typed = run as Run;
    if (problems.length === 0) {
      if (!tasks.has(typed.task_id))
        problems.push(`runs[${index}]: unknown task_id ${typed.task_id}`);
      if (!allowed.has(typed.condition))
        problems.push(`runs[${index}]: unknown condition ${typed.condition}`);
    }
    errors.push(...problems);
    if (problems.length === 0) valid.push(typed);
  });

  const models = new Map<string, { vendor: string; type: string }>();
  for (const run of valid) models.set(run.model, { vendor: run.vendor, type: run.model_type });
  const vendors = new Map<string, Set<string>>();
  for (const { vendor, type } of models.values()) {
    vendors.set(vendor, (vendors.get(vendor) ?? new Set()).add(type));
  }
  if (vendors.size < PLAN.minVendors) {
    errors.push(
      `models come from ${vendors.size} vendors; the plan requires at least ${PLAN.minVendors}`,
    );
  }
  for (const [vendor, types] of vendors) {
    for (const type of PLAN.modelTypes) {
      if (!types.has(type)) errors.push(`vendor ${vendor} has no ${type} model`);
    }
  }

  const cells = new Set(
    valid.map((run) => `${run.task_id}\u0000${run.condition}\u0000${run.model}`),
  );
  let missing = 0;
  const examples: string[] = [];
  for (const task of suite.tasks) {
    const conditions: string[] = [...PLAN.conditions];
    if (task.automatic_metric) conditions.push(PLAN.baselineCeiling);
    for (const condition of conditions) {
      for (const model of models.keys()) {
        if (!cells.has(`${task.id}\u0000${condition}\u0000${model}`)) {
          missing++;
          if (examples.length < 5) examples.push(`${task.id}/${condition}/${model}`);
        }
      }
    }
  }
  if (missing > 0) {
    errors.push(
      `${missing} task × condition × model cells have no run (e.g. ${examples.join(", ")})`,
    );
  }
  for (const condition of PLAN.conditions) {
    const layouts = new Set(
      valid.filter((run) => run.condition === condition).map((run) => run.layout),
    );
    if (layouts.size < PLAN.minLayouts) {
      errors.push(
        `condition ${condition} uses ${layouts.size} layouts; the plan requires at least ${PLAN.minLayouts}`,
      );
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

/** Deterministic PRNG (mulberry32) so a report is reproducible from its inputs. */
function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function compare(runs: Run[], tasks: Task[], baseline: string, resamples = 2000): Comparison {
  const eligible = tasks
    .filter((task) => task.tier === 1 || task.tier === 2)
    .map((task) => task.id);
  const perTask = (condition: string): Map<string, Run[]> => {
    const map = new Map<string, Run[]>();
    for (const run of runs) {
      if (run.condition === condition && eligible.includes(run.task_id)) {
        map.set(run.task_id, [...(map.get(run.task_id) ?? []), run]);
      }
    }
    return map;
  };
  const compass = perTask("compass");
  const other = perTask(baseline);
  const paired = eligible.filter((id) => compass.has(id) && other.has(id));
  const differences = paired.map(
    (id) =>
      rate((compass.get(id) as Run[]).map((run) => run.intention_match)) -
      rate((other.get(id) as Run[]).map((run) => run.intention_match)),
  );
  const tokens = (list: Run[]): number =>
    mean(list.map((run) => run.input_tokens + run.output_tokens));
  const tokenDifference = mean(
    paired.map((id) => tokens(compass.get(id) as Run[]) - tokens(other.get(id) as Run[])),
  );
  const random = prng(9_2);
  const means: number[] = [];
  for (let sample = 0; sample < resamples && differences.length > 0; sample++) {
    let total = 0;
    for (let index = 0; index < differences.length; index++) {
      total += differences[Math.floor(random() * differences.length)] as number;
    }
    means.push(total / differences.length);
  }
  means.sort((a, b) => a - b);
  const quantile = (q: number): number =>
    means.length === 0
      ? Number.NaN
      : (means[Math.min(means.length - 1, Math.floor(q * means.length))] as number);
  const ci95: [number, number] = [round(quantile(0.025)), round(quantile(0.975))];
  return {
    baseline,
    tasks: paired.length,
    intentionMatchDifference: round(mean(differences)),
    ci95,
    ciExcludesZero: ci95[0] > 0 || ci95[1] < 0,
    meanTokenDifference: round(tokenDifference, 1),
  };
}

export function buildReport(
  suiteInput: unknown,
  resultsInput: unknown,
  allowIncomplete = false,
): Report {
  const check = validateResults(suiteInput, resultsInput);
  if (!check.valid && !allowIncomplete) {
    throw new UsageError(
      `results do not satisfy the pre-registered plan (${check.errors.length} errors); run validate-results, or pass --allow-incomplete for an exploratory report`,
    );
  }
  if (
    !isObject(resultsInput) ||
    !Array.isArray(resultsInput.runs) ||
    !validateSuite(suiteInput).valid
  ) {
    throw new UsageError("cannot report: the suite or results file is malformed");
  }
  const suite = suiteInput as unknown as Suite;
  const runs = (resultsInput.runs as unknown[]).filter(
    (run, index) => runErrors(run, String(index)).length === 0,
  ) as Run[];
  const conditions = ([...PLAN.conditions, PLAN.baselineCeiling] as string[])
    .map((condition) => {
      const list = runs.filter((run) => run.condition === condition);
      if (list.length === 0) return undefined;
      const compliance = list.flatMap((run) =>
        run.success_spec_compliance === null ? [] : [run.success_spec_compliance],
      );
      const layouts = new Map<string, number[]>();
      for (const run of list)
        layouts.set(run.layout, [...(layouts.get(run.layout) ?? []), run.task_success]);
      const layoutMeans = [...layouts.values()].map(mean);
      const byModelType: ConditionMetrics["byModelType"] = {};
      for (const type of PLAN.modelTypes) {
        const typed = list.filter((run) => run.model_type === type);
        if (typed.length > 0) {
          byModelType[type] = {
            runs: typed.length,
            taskSuccess: round(mean(typed.map((run) => run.task_success))),
            intentionMatchRate: round(rate(typed.map((run) => run.intention_match))),
          };
        }
      }
      return {
        condition,
        runs: list.length,
        taskSuccess: round(mean(list.map((run) => run.task_success))),
        intentionMatchRate: round(rate(list.map((run) => run.intention_match))),
        successSpecCompliance: compliance.length > 0 ? round(rate(compliance)) : null,
        meanInputTokens: round(mean(list.map((run) => run.input_tokens)), 1),
        meanOutputTokens: round(mean(list.map((run) => run.output_tokens)), 1),
        meanLatencyMs: round(mean(list.map((run) => run.latency_ms)), 1),
        clarifyingQuestionRate: round(rate(list.map((run) => run.asked_clarifying_question))),
        layoutSpread:
          layouts.size >= 2 ? round(Math.max(...layoutMeans) - Math.min(...layoutMeans)) : null,
        byModelType,
      } satisfies ConditionMetrics;
    })
    .filter((item): item is ConditionMetrics => item !== undefined);
  const notes = [
    "Descriptive metrics only. A comparison whose interval excludes zero is evidence for a difference on this suite, not proof of general superiority.",
    "Intervals are 95% paired bootstrap intervals over tasks (2,000 resamples, fixed seed).",
  ];
  if (!check.valid) {
    notes.unshift(
      `INCOMPLETE: ${check.errors.length} plan requirements are unmet; this is an exploratory report, not a run of the pre-registered plan.`,
    );
  }
  return {
    complete: check.valid,
    suite: suite.name,
    conditions,
    hypothesis: {
      statement: PLAN.hypothesis,
      comparisons: ["rtf", "art"].map((baseline) => compare(runs, suite.tasks, baseline)),
    },
    notes,
  };
}

function renderReport(report: Report): string {
  const percent = (value: number | null): string =>
    value === null || Number.isNaN(value) ? "—" : `${(value * 100).toFixed(1)}%`;
  const lines = [
    `# CoMPaSS evaluation report: ${report.suite}`,
    "",
    ...report.notes.map((note) => `> ${note}`),
    "",
    "| Condition | Runs | Task success | Intention match | Spec compliance | Mean tokens (in/out) | Mean latency | Clarifying rate | Layout spread |",
    "|---|---|---|---|---|---|---|---|---|",
    ...report.conditions.map(
      (item) =>
        `| ${item.condition} | ${item.runs} | ${percent(item.taskSuccess)} | ${percent(item.intentionMatchRate)} | ${percent(item.successSpecCompliance)} | ${item.meanInputTokens}/${item.meanOutputTokens} | ${item.meanLatencyMs} ms | ${percent(item.clarifyingQuestionRate)} | ${percent(item.layoutSpread)} |`,
    ),
    "",
    `**Pre-registered hypothesis:** ${report.hypothesis.statement}`,
    "",
    "| CoMPaSS vs | Paired tasks | Intention-match difference | 95% CI | CI excludes 0 | Mean token difference |",
    "|---|---|---|---|---|---|",
    ...report.hypothesis.comparisons.map(
      (item) =>
        `| ${item.baseline} | ${item.tasks} | ${percent(item.intentionMatchDifference)} | ${percent(item.ci95[0])} to ${percent(item.ci95[1])} | ${item.ciExcludesZero ? "yes" : "no"} | ${item.meanTokenDifference} |`,
    ),
  ];
  return lines.join("\n");
}

function renderCheck(label: string, check: Check): string {
  return [
    `${check.valid ? "PASS" : "FAIL"}: ${label}`,
    ...check.errors.map((error) => `ERROR: ${error}`),
    ...check.warnings.map((warning) => `WARNING: ${warning}`),
  ].join("\n");
}

const TEMPLATE = {
  suite: {
    name: "[SUITE NAME]",
    tasks: [
      {
        id: "[TASK ID]",
        category: "communication | analysis_decision | agentic_coding",
        tier: 1,
        request: "[THE REAL REQUEST, VERBATIM]",
        true_intention: "[WRITTEN BY THE REQUESTER; HIDDEN FROM EVERY CONDITION]",
        automatic_metric: false,
      },
    ],
  },
  results: {
    suite: "[SUITE NAME]",
    runs: [
      {
        task_id: "[TASK ID]",
        condition: [...PLAN.conditions, PLAN.baselineCeiling].join(" | "),
        model: "[MODEL ID]",
        vendor: "[VENDOR]",
        model_type: "reasoning | non-reasoning",
        layout: "[LAYOUT ID]",
        task_success: "[0–1, BLIND RUBRIC GRADE]",
        intention_match: "[true | false]",
        success_spec_compliance: "[true | false | null]",
        input_tokens: "[N]",
        output_tokens: "[N]",
        latency_ms: "[N]",
        asked_clarifying_question: "[true | false]",
      },
    ],
  },
};

function readJson(path: string | undefined): unknown {
  if (!path) throw new UsageError("missing file argument");
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new UsageError(`cannot read JSON from ${path}: ${(error as Error).message}`);
  }
}

function main(argv: string[]): number {
  const json = argv.includes("--json");
  const allowIncomplete = argv.includes("--allow-incomplete");
  const [command, ...files] = argv.filter(
    (arg) => arg !== "--json" && arg !== "--allow-incomplete",
  );
  const print = (value: unknown, text: string): void => {
    console.log(json ? JSON.stringify(value, null, 2) : text);
  };
  try {
    switch (command) {
      case "plan":
        print(
          PLAN,
          [
            "CoMPaSS pre-registered evaluation plan (not yet run)",
            `Source: ${PLAN.source}`,
            `Task suite: about ${PLAN.taskTarget} real requests across ${PLAN.categories.join(", ")}, each with a hidden true intention.`,
            `Conditions: ${PLAN.conditions.join(", ")}; plus ${PLAN.baselineCeiling} for tasks with automatic metrics.`,
            `Models: at least one reasoning and one non-reasoning model from each of ${PLAN.minVendors} vendors.`,
            `Metrics: ${PLAN.metrics.join("; ")}.`,
            `Hypothesis: ${PLAN.hypothesis}`,
          ].join("\n"),
        );
        return 0;
      case "template":
        console.log(JSON.stringify(TEMPLATE, null, 2));
        return 0;
      case "validate-suite": {
        const check = validateSuite(readJson(files[0]));
        print(check, renderCheck("task suite", check));
        return check.valid ? 0 : 1;
      }
      case "validate-results": {
        const check = validateResults(readJson(files[0]), readJson(files[1]));
        print(check, renderCheck("results against the pre-registered plan", check));
        return check.valid ? 0 : 1;
      }
      case "report": {
        const suite = readJson(files[0]);
        const results = readJson(files[1]);
        const check = validateResults(suite, results);
        if (!check.valid && !allowIncomplete) {
          print(check, renderCheck("results against the pre-registered plan", check));
          console.error("Not reporting: pass --allow-incomplete for an exploratory report.");
          return 1;
        }
        const report = buildReport(suite, results, allowIncomplete);
        print(report, renderReport(report));
        return 0;
      }
      default:
        throw new UsageError(command ? `unknown command: ${command}` : "missing command");
    }
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`usage error: ${error.message}`);
      console.error(
        "usage: node scripts/evaluate-skill.ts plan|template|validate-suite SUITE|validate-results SUITE RESULTS|report SUITE RESULTS [--json] [--allow-incomplete]",
      );
      return 2;
    }
    throw error;
  }
}

if (isMain(import.meta.url)) process.exitCode = main(process.argv.slice(2));
