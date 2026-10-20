#!/usr/bin/env node
// Draft a CoMPaSS Comprehend (C) analysis card from a raw requirement.
//
// Usage: node scripts/analyze-requirement.ts "<requirement>" [--target-model reasoning|non-reasoning]
//          [--vendor <name>] [--fixed-format] [--json]
//        (reads the requirement from stdin when no argument is given)
// Exit status: 0 drafted, 2 usage error.
//
// The analysis is keyword heuristics, not understanding. It drafts every field and
// surfaces tier, confidence, and trigger signals; the prompt author confirms or
// overwrites them. Requires Node.js 22.18+; no dependencies, no network access.
import {
  type AnchorTriggerId,
  type Confidence,
  type Decision,
  type OptionalDecision,
  type OrderTriggerId,
  type RequirementAnalysis,
  type TargetOptions,
  type Tier,
  UsageError,
  isMain,
  loadComponentTable,
  parseArgs,
  readInput,
} from "./lib/compass.ts";

type TaskKind = "lookup" | "communication" | "decision" | "agentic" | "creation" | "review";

const KIND_PATTERNS: [TaskKind, RegExp][] = [
  [
    "decision",
    /\b(should (we|i)|whether|decide|choose|pick between|which (option|one|approach|tool|vendor|framework|database|stack)|versus|vs\.?|evaluate|compare)\b/i,
  ],
  [
    "agentic",
    /\b(fix|debug|implement|refactor|deploy|investigate|automate|set up|migrate|upgrade|patch|run)\b/i,
  ],
  ["review", /\b(review|audit|critique|assess|proofread|feedback on|check (my|this|our))\b/i],
  [
    "communication",
    /\b(write|draft|compose|announce|announcement|email|e-mail|message|tell|letter|post|reply|respond to|memo)\b/i,
  ],
  [
    "creation",
    /\b(design|create|build|plan|brief|spec|specification|outline|proposal|generate|produce|make|define|prepare|classify|categori[sz]e|label|summari[sz]e|translate|extract|rewrite|rephrase)\b/i,
  ],
];

const CODE_CONTEXT =
  /`[^`]+`|\b(ci|pipeline|repo|repository|codebase|branch|pull request|pr|tests?|test suite|build|service|endpoint|deployment|production|staging|stack trace|logs?)\b|\b[\w.-]+\/[\w./-]+/i;
const MULTI_STEP =
  /\b(multi-step|step by step|end to end|across (files|services|the codebase)|agent|then|and then|after that)\b/i;
const QUESTION_START =
  /^(what|what's|whats|who|who's|when|where|which|why|how (many|much|long|old|far|do|does|to)|is|are|does|do|did|can i|define|convert)\b/i;
const ATTACHMENTS =
  /\b(pasted|attached|below|here is|here are|i've included|i have included|see the|the following)\b/i;
const HEDGES =
  /\b(not sure|maybe|perhaps|i (don't|do not) know|no idea|something like|or something|whatever|somehow|kind of|sort of|unsure|i guess|not certain|undecided)\b/gi;
const PURPOSE =
  /\b(so that|so (we|i|they|the team|people|users|customers) can|because|in order to|the goal is|our goal|my goal|goal:|aim is|to (help|make sure|ensure|let|enable|reduce|increase|improve))\b/i;
const PROBLEM =
  /\b(annoyed|frustrated|slow|slower|failing|fails|failed|broken|keeps|complain\w*|problem|issue|pain|costly|blocked|stuck|errors?|outage|churn|losing|late)\b(?! points?)/i;
const SEQUENCE =
  /\b(before|then|finally|step \d|in (this|that|the following) order|reproduce|sequence|compliance)\b|\bfirst,/i;
const MESSAGE_OBJECT =
  /\b(email|e-mail|message|announcement|announce|letter|post|reply|tell|memo|note to)\b/i;
const ARTIFACT_OBJECT =
  /\b(brief|spec|specification|proposal|plan|report|document|outline|prompt|persona|profile|strategy|roadmap|rfc|design|policy|guide)\b/i;
const FORMAT_HINT =
  /\b(template|our format|same format|format like|in the style of|house style|like this example|follow (our|the) (format|template|style|structure)|voice|brand voice|fixed (format|layout|structure))\b/i;
const CLASSIFICATION =
  /\b(classify|classification|categori[sz]e|label|tag each|sentiment|triage into)\b/i;
const REASONING_TASK =
  /\b(calculate|compute|solve|analy[sz]e|plan|reason|derive|estimate|prove)\b/i;

const KIND_LABEL: Record<TaskKind, string> = {
  lookup: "Looking up a fact",
  communication: "Drafting a message",
  decision: "Evaluating a decision",
  agentic: "Carrying out a multi-step change",
  creation: "Creating an artifact",
  review: "Reviewing existing work",
};

const DELIVERABLE: Record<TaskKind, string> = {
  lookup: "A direct answer.",
  communication: "A send-ready message; state its format and length.",
  decision:
    "A recommendation (do / do not / conditional) with the cheapest next step to reduce uncertainty.",
  agentic:
    "A verified change (for example a branch and PR description), or evidence of where the real defect lies.",
  creation: "The requested artifact, in a stated format and length.",
  review: "Prioritized findings, each with a concrete fix.",
};

const ALTERNATIVE: Record<TaskKind, string> = {
  lookup: "None material: the request asks for a fact.",
  communication:
    "A message for a different audience or purpose than stated, for example persuading decision-makers rather than informing the people affected.",
  decision: "The decision is already made and the user wants an execution plan, not an evaluation.",
  agentic:
    "Make the symptom disappear by any means (for example retries, skips, or loosened checks) instead of fixing the root cause.",
  creation:
    "A different artifact that shares the name, for example a narrative or marketing version rather than an operational one.",
  review: "A rewrite rather than findings, or approval rather than critique.",
};

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function clean(clause: string): string {
  return clause
    .replace(/^(can|could|would) you (please )?/i, "")
    .replace(/^please /i, "")
    .replace(/[?.!]+$/, "")
    .trim();
}

function classify(requirement: string): TaskKind | undefined {
  const kind = KIND_PATTERNS.find(([, pattern]) => pattern.test(requirement))?.[0];
  // "Write a brief" asks for an artifact, not a message.
  if (
    kind === "communication" &&
    ARTIFACT_OBJECT.test(requirement) &&
    !MESSAGE_OBJECT.test(requirement)
  ) {
    return "creation";
  }
  return kind;
}

function detectTier(
  requirement: string,
  kind: TaskKind | undefined,
): { tier: Tier; signals: string[] } {
  const signals: string[] = [];
  const short = words(requirement) <= 25;
  const question = QUESTION_START.test(requirement.trim()) || requirement.trim().endsWith("?");
  const deliverableVerb = kind !== undefined && kind !== "lookup";
  if (question && short && !deliverableVerb && !ATTACHMENTS.test(requirement)) {
    signals.push("short question with no deliverable verb and no attached materials");
    return { tier: 0, signals };
  }
  if (kind === "agentic" && (CODE_CONTEXT.test(requirement) || MULTI_STEP.test(requirement))) {
    signals.push("action verb that implies doing work, with code or multi-step context");
    return { tier: 2, signals };
  }
  if (MULTI_STEP.test(requirement) && /\bagent\b/i.test(requirement)) {
    signals.push("explicit agent or multi-step work");
    return { tier: 2, signals };
  }
  if (kind === "agentic") signals.push("work verb without code or multi-step context");
  if (deliverableVerb) signals.push(`deliverable verb (${kind})`);
  if (ATTACHMENTS.test(requirement)) signals.push("attached or pasted materials");
  if (!deliverableVerb && !ATTACHMENTS.test(requirement)) {
    signals.push("no clear deliverable verb; treated as Tier 1 so the C stage still runs");
  }
  return { tier: 1, signals };
}

function alternativeFromText(requirement: string): { first: string; second: string } | undefined {
  const parts = sentences(requirement);
  for (let index = 1; index < parts.length; index++) {
    const match = /^or (?:maybe |perhaps |should (?:we|i) )?(.+?)[?.!]*$/i.exec(
      parts[index] as string,
    );
    if (match?.[1]) {
      return { first: clean(parts[index - 1] as string), second: clean(match[1]) };
    }
  }
  const inline = /^(.+?),? or (?:maybe |perhaps )(.+?)[?.!]*$/i.exec(parts[0] ?? "");
  return inline?.[1] && inline[2]
    ? { first: clean(inline[1]), second: clean(inline[2]) }
    : undefined;
}

function detectConfidence(
  requirement: string,
  kind: TaskKind | undefined,
): { confidence: Confidence; signals: string[] } {
  const signals: string[] = [];
  const hedges = requirement.match(HEDGES) ?? [];
  const alternative = alternativeFromText(requirement);
  if (hedges.length > 0) signals.push(`hedging: ${hedges.map((hedge) => `"${hedge}"`).join(", ")}`);
  if (alternative)
    signals.push(`competing goals: "${alternative.first}" or "${alternative.second}"`);
  const vague = words(requirement) <= 6 && /\b(it|this|that|things|stuff)\b/i.test(requirement);
  if (vague) signals.push("very short request with an unspecified object");
  if ((hedges.length > 0 && alternative) || hedges.length >= 2 || vague) {
    return { confidence: "low", signals };
  }
  if (kind === "decision" && /\bshould (we|i)\b/i.test(requirement)) {
    signals.push("decision question: the user may already have decided");
    return { confidence: "medium", signals };
  }
  if (hedges.length > 0 || alternative || vague) return { confidence: "medium", signals };
  if (PURPOSE.test(requirement)) {
    signals.push("stated purpose");
    return { confidence: "high", signals };
  }
  if (PROBLEM.test(requirement)) {
    signals.push("stated problem the deliverable must address");
    return { confidence: "high", signals };
  }
  signals.push("no stated purpose or problem; the intention must be inferred");
  return { confidence: "medium", signals };
}

function decideOrder(
  requirement: string,
  kind: TaskKind | undefined,
  tier: Tier,
  options: TargetOptions,
): OptionalDecision<OrderTriggerId> {
  const triggers: OrderTriggerId[] = [];
  const reasons: string[] = [];
  if (tier === 0) return { include: false, triggers, reasons: ["Tier 0: no prompt is written."] };
  if (kind === "decision") {
    triggers.push("o-1");
    reasons.push("o-1: fix the decision criteria before scoring options.");
  } else if (kind === "agentic" && /\b(fix|debug|investigate|patch)\b/i.test(requirement)) {
    triggers.push("o-1");
    reasons.push("o-1: reproduce before fixing.");
  } else if (SEQUENCE.test(requirement)) {
    triggers.push("o-1");
    reasons.push("o-1: the request names a required sequence.");
  }
  if (
    options.targetModel === "non-reasoning" &&
    (kind === "decision" || kind === "agentic" || REASONING_TASK.test(requirement))
  ) {
    triggers.push("o-2");
    reasons.push("o-2: non-reasoning target model on a multi-step reasoning task.");
  }
  if (tier === 2) {
    triggers.push("o-3");
    reasons.push(
      "o-3: an agent working across steps usually needs a checkpoint; confirm one is required.",
    );
  }
  if (triggers.length === 0) {
    reasons.push("No trigger fired; omit o (steps would only describe how to think).");
  }
  return { include: triggers.length > 0, triggers, reasons };
}

function decideAnchors(
  requirement: string,
  tier: Tier,
  options: TargetOptions,
): OptionalDecision<AnchorTriggerId> {
  const triggers: AnchorTriggerId[] = [];
  const reasons: string[] = [];
  if (tier === 0) return { include: false, triggers, reasons: ["Tier 0: no prompt is written."] };
  if (options.fixedFormat || FORMAT_HINT.test(requirement)) {
    triggers.push("a-1");
    reasons.push("a-1: the format, voice, or labelling is easier to show than describe.");
  }
  if (CLASSIFICATION.test(requirement)) {
    triggers.push("a-2");
    reasons.push("a-2: fine-grained classification.");
  }
  if (options.vendor === "gemini") {
    triggers.push("a-3");
    reasons.push("a-3: the target vendor (Gemini) recommends examples by default.");
  }
  if (triggers.length === 0) {
    reasons.push(
      "No trigger detected in the text; omit a unless context shows a format easier to show than describe (--fixed-format).",
    );
  } else if (options.targetModel === "reasoning") {
    reasons.push("Reasoning target model: try without anchors first.");
  }
  return { include: triggers.length > 0, triggers, reasons };
}

function draftIntention(requirement: string): string {
  const purpose = sentences(requirement).find((sentence) => PURPOSE.test(sentence));
  if (purpose) return `Stated: "${clean(purpose)}". Confirm it is the outcome, not another action.`;
  const problem = sentences(requirement).find((sentence) => PROBLEM.test(sentence));
  if (problem) {
    return `Not stated; the context suggests addressing: "${clean(problem)}". Write the outcome in the world the user wants.`;
  }
  return "Not stated. Infer the outcome in the world the user wants, beyond the requested action, and record it as an assumption.";
}

function draftPath(
  tier: Tier,
  requirement: string,
  order: OptionalDecision<OrderTriggerId>,
  anchors: OptionalDecision<AnchorTriggerId>,
): string {
  if (tier === 0) return "Ask directly; skip the CoMPaSS prompt entirely.";
  const steps = order.include ? "fix the required sequence" : "no steps";
  const examples = anchors.include ? "one labelled template anchor" : "no examples";
  if (tier === 2) {
    return `Give the agent pointers (file paths, commands) rather than pasted content; ${steps}; ${examples}; verify with executable checks and report what was not verified.`;
  }
  const materials = ATTACHMENTS.test(requirement) ? "work from the pasted materials; " : "";
  return `Single pass; ${materials}unknown specifics as placeholders rather than questions; ${steps}; ${examples}; no extra research unless a needed fact is missing.`;
}

function clarifyingQuestions(requirement: string, max: number): string[] {
  const questions: string[] = [];
  const alternative = alternativeFromText(requirement);
  if (alternative) {
    questions.push(
      `Do you want to ${alternative.first.toLowerCase()}, or ${alternative.second.toLowerCase()}?`,
    );
  }
  questions.push("What should be true once this is done, and for whom?");
  questions.push(
    "What must exist at the end (an artifact, a decision, or a change), and in what form?",
  );
  return questions.slice(0, max);
}

/** Draft a Comprehend analysis card. Every text field is a heuristic draft for the author to confirm. */
export function analyzeRequirement(
  requirement: string,
  options: TargetOptions = {},
): RequirementAnalysis {
  const text = requirement.trim();
  if (!text) throw new UsageError("the requirement is empty");
  const detected = classify(text);
  const { tier, signals: tierSignals } = detectTier(text, detected);
  const kind: TaskKind | undefined = tier === 0 ? "lookup" : detected;
  const confidence =
    tier === 0
      ? { confidence: "high" as Confidence, signals: ["Tier 0: the request is answered directly."] }
      : detectConfidence(text, kind);
  const orderOfOperations = decideOrder(text, kind, tier, options);
  const anchors = decideAnchors(text, tier, options);
  const workSentence =
    sentences(text).find((sentence) => classify(sentence) !== undefined) ??
    sentences(text)[0] ??
    text;
  // A terse imperative such as "Fix it." needs its context sentence to name the action.
  const firstWorkSentence = words(clean(workSentence)) < 4 ? text : workSentence;
  const alternative = alternativeFromText(text);
  const alternativeReading =
    confidence.confidence === "low" && alternative
      ? `The user may want to ${alternative.second.toLowerCase()} rather than ${alternative.first.toLowerCase()}.`
      : kind
        ? ALTERNATIVE[kind]
        : "Unclear: the request names no recognisable deliverable.";
  const decision: Decision =
    tier === 0 ? "stop" : confidence.confidence === "low" ? "ask" : "proceed";
  const analysis: RequirementAnalysis = {
    requirement: text,
    action: `${kind ? KIND_LABEL[kind] : "Unclear action"}: "${clean(firstWorkSentence)}"`,
    intention: tier === 0 ? "Get a fact; no further outcome is implied." : draftIntention(text),
    deliverable: kind
      ? DELIVERABLE[kind]
      : "Not clear from the request; confirm what must exist at the end.",
    path: draftPath(tier, text, orderOfOperations, anchors),
    tier,
    tierSignals,
    intentionConfidence: confidence.confidence,
    confidenceSignals: confidence.signals,
    alternativeReading,
    clarifyingQuestions:
      decision === "ask"
        ? clarifyingQuestions(text, loadComponentTable().max_clarifying_questions)
        : [],
    orderOfOperations,
    anchors,
    decision,
    targetModel: options.targetModel ?? "unknown",
    heuristic: true,
  };
  if (confidence.confidence === "medium") {
    analysis.assumedIntention = `[State the reading you are acting on.] Not the alternative reading: ${alternativeReading.charAt(0).toLowerCase()}${alternativeReading.slice(1)} If the evidence contradicts the assumption, say so.`;
  }
  return analysis;
}

const DECISION_TEXT: Record<Decision, string> = {
  stop: "Stop (Tier 0): ask the question directly or use ART/RTF.",
  ask: "Ask clarifying questions, then restart the C stage.",
  proceed: "Proceed to write the prompt.",
};

/** Render an analysis as a Markdown analysis card. */
export function renderCard(analysis: RequirementAnalysis): string {
  const escape = (value: string): string => value.replaceAll("|", "\\|");
  const optional = <T extends string>(label: string, item: OptionalDecision<T>): string =>
    `- **${label}:** ${item.include ? `Include (${item.triggers.join(", ")})` : "Omit"}. ${item.reasons.join(" ")}`;
  const lines = [
    "> Heuristic draft from keyword signals. Confirm or overwrite every field before writing the prompt.",
    "",
    `**Raw requirement (verbatim):** ${analysis.requirement}`,
    "",
    "| Field | Answer |",
    "|---|---|",
    `| Action | ${escape(analysis.action)} |`,
    `| Intention | ${escape(analysis.intention)} |`,
    `| Deliverable / Decision | ${escape(analysis.deliverable)} |`,
    `| Efficient path | ${escape(analysis.path)} |`,
    `| Tier | ${analysis.tier} (${escape(analysis.tierSignals.join("; "))}) |`,
    `| Intention confidence | ${analysis.intentionConfidence} (${escape(analysis.confidenceSignals.join("; "))}). Alternative reading: ${escape(analysis.alternativeReading)} |`,
    "",
    optional("o (order of operations)", analysis.orderOfOperations),
    optional("a (anchors)", analysis.anchors),
  ];
  if (analysis.assumedIntention)
    lines.push(`- **Assumed intention (for Mission):** ${analysis.assumedIntention}`);
  if (analysis.clarifyingQuestions.length > 0) {
    lines.push("- **Clarifying questions:**");
    analysis.clarifyingQuestions.forEach((question, index) =>
      lines.push(`  ${index + 1}. ${question}`),
    );
  }
  lines.push("", `**Decision:** ${DECISION_TEXT[analysis.decision]}`);
  return lines.join("\n");
}

function main(argv: string[]): number {
  try {
    const args = parseArgs(argv);
    const requirement =
      args.positional.length > 0 ? args.positional.join(" ") : readInput(undefined);
    const analysis = analyzeRequirement(requirement, args.options);
    console.log(args.json ? JSON.stringify(analysis, null, 2) : renderCard(analysis));
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`usage error: ${error.message}`);
      console.error(
        'usage: node scripts/analyze-requirement.ts "<requirement>" [--target-model reasoning|non-reasoning] [--vendor <name>] [--fixed-format] [--json]',
      );
      return 2;
    }
    throw error;
  }
}

if (isMain(import.meta.url)) process.exitCode = main(process.argv.slice(2));
