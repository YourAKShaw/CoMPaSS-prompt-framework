#!/usr/bin/env node
// Check that an assembled prompt follows the CoMPaSS architecture.
//
// Usage: node scripts/validate-prompt.ts [PROMPT_FILE|-] [--target-model reasoning|non-reasoning]
//          [--vendor <name>] [--json]
// Exit status: 0 no errors, 1 errors found, 2 usage error.
//
// Sections are read from XML tags (<mission>, <provisions>, <order_of_operations>,
// <anchors>, <scope>, <success_spec>) or, when no tags are present, from Markdown
// headings with the same names. A Markdown file whose fenced block holds the
// prompt is also accepted. This is a structural check: it cannot tell whether the
// Mission captures the user's real intention. Node.js 22.18+, no dependencies.
import {
  type AnchorTriggerId,
  type OrderTriggerId,
  type TargetOptions,
  UsageError,
  isMain,
  mandatorySectionTags,
  parseArgs,
  readInput,
  sectionOrder,
} from "./lib/compass.ts";

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  code: string;
  message: string;
  section?: string;
}

export interface Section {
  tag: string;
  content: string;
  attributes: string;
  start: number;
}

export interface PromptValidation {
  valid: boolean;
  format: "xml" | "markdown" | "none";
  sections: string[];
  hasMission: boolean;
  hasProvisions: boolean;
  hasScope: boolean;
  hasSuccessSpec: boolean;
  hasOrderOfOperations: boolean;
  hasAnchors: boolean;
  /** Triggers declared with trigger="…" or inferred from the section's content. */
  orderOfOperationsTrigger?: OrderTriggerId[];
  anchorTrigger?: AnchorTriggerId[];
  successSpec: string;
  hasVerificationChecks: boolean;
  placeholders: string[];
  findings: Finding[];
}

const HEADING_NAMES: Record<string, string> = {
  mission: "mission",
  provisions: "provisions",
  "order of operations": "order_of_operations",
  anchors: "anchors",
  scope: "scope",
  "success spec": "success_spec",
  "success specification": "success_spec",
};

const INTENTION =
  /\b(so that|so (the|we|i|they|you|it|our|people|users)\b|the (real )?goal|because|in order to|intention|the aim)/i;
const OUTPUT_SHAPE =
  /\b(output|return|format|deliver|respond with|produce|sections?|words|length|tone)\b/i;
const VERIFICATION =
  /before returning|done means|\bchecks?\b\s*:|\bverify\b|\bverified\b|acceptance|must (all )?be true|before (you )?(finish|submit|respond)/i;
const PASTED_CARD =
  /\b(intention confidence|efficient path)\b|^\s*\|\s*(action|intention|tier)\s*\|/im;
const PERSONA = /^\s*(?:[-*]\s*)?(you are (a|an|the) |act as |acting as )/im;
const THINK_STEPS =
  /\b(think step by step|let'?s think|explain your reasoning|show your reasoning)\b/i;
const ASSUMPTION_POLICY =
  /assum|\bask (before|if|when|first)\b|\bif\b[^.\n]*\b(blank|missing|insufficient|unknown|cannot|unclear)\b|stop and report|say what is missing|\blabel\b|use only the (facts|data|materials)|placeholder/i;
const NEGATIVE_RULE = /^\s*(?:[-*]|\d+\.)\s*(do not|don't|never|avoid|no )/i;
const RULE_LINE = /^\s*(?:[-*]|\d+\.)\s+/;
const PLACEHOLDER = /\[[A-Z][A-Z0-9 ,./'&()+_-]*(?::[^\]]*|,? e\.g\.[^\]]*)?\]/g;

function stripWrappingFence(text: string): string {
  if (/<mission[\s>]/i.test(text) && !/^\s*(```|~~~)/m.test(text)) return text;
  const fence = /^\s{0,3}(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^\s{0,3}\1\s*$/gm;
  for (const match of text.matchAll(fence)) {
    const body = match[2] ?? "";
    if (/<mission[\s>]/i.test(body)) return body;
  }
  return text;
}

function xmlSections(text: string): Section[] {
  const sections: Section[] = [];
  for (const tag of sectionOrder()) {
    const pattern = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
    for (const match of text.matchAll(pattern)) {
      sections.push({
        tag,
        attributes: match[1] ?? "",
        content: (match[2] ?? "").trim(),
        start: match.index ?? 0,
      });
    }
  }
  return sections.sort((a, b) => a.start - b.start);
}

function markdownSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let current: (Section & { level: number; body: string[] }) | undefined;
  let offset = 0;
  let fenced = false;
  const close = (): void => {
    if (current) sections.push({ ...current, content: current.body.join("\n").trim() });
    current = undefined;
  };
  for (const line of lines) {
    if (/^\s{0,3}(`{3,}|~{3,})/.test(line)) fenced = !fenced;
    const heading = fenced ? null : /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = (heading[1] as string).length;
      const name = (heading[2] as string)
        .toLowerCase()
        .replace(/^[cmpsoa]\s*[:.-]\s*/, "")
        .trim();
      const tag = HEADING_NAMES[name];
      if (tag) {
        close();
        current = { tag, attributes: "", content: "", start: offset, level, body: [] };
      } else if (current && level <= current.level) {
        close();
      } else {
        current?.body.push(line);
      }
    } else {
      current?.body.push(line);
    }
    offset += line.length + 1;
  }
  close();
  return sections;
}

function declaredTriggers(attributes: string): string[] {
  const match = /trigger\s*=\s*"([^"]*)"/i.exec(attributes);
  return match?.[1] ? match[1].split(/[\s,]+/).filter(Boolean) : [];
}

function inferOrderTriggers(section: Section, options: TargetOptions): OrderTriggerId[] {
  const declared = declaredTriggers(section.attributes).filter((id): id is OrderTriggerId =>
    ["o-1", "o-2", "o-3"].includes(id),
  );
  if (declared.length > 0) return declared;
  const triggers: OrderTriggerId[] = [];
  if (/\b(before|first|reproduce|criteria|only after|until)\b/i.test(section.content))
    triggers.push("o-1");
  if (options.targetModel === "non-reasoning") triggers.push("o-2");
  if (
    /\b(pause|checkpoint|report (back|after|progress)|and report|confirm|approval|stop and)\b/i.test(
      section.content,
    )
  )
    triggers.push("o-3");
  return triggers;
}

function inferAnchorTriggers(section: Section, options: TargetOptions): AnchorTriggerId[] {
  const declared = declaredTriggers(section.attributes).filter((id): id is AnchorTriggerId =>
    ["a-1", "a-2", "a-3"].includes(id),
  );
  if (declared.length > 0) return declared;
  const triggers: AnchorTriggerId[] = [];
  if (/<template\b|format only|<example\b/i.test(section.content)) triggers.push("a-1");
  if (/\b(label|category|categories|class(es)?)\s*:/i.test(section.content)) triggers.push("a-2");
  if (options.vendor === "gemini") triggers.push("a-3");
  return triggers;
}

function sentenceCount(text: string): number {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !/^assumed intention:/i.test(sentence)).length;
}

/** Validate a prompt against the CoMPaSS architecture. */
export function validatePrompt(prompt: string, options: TargetOptions = {}): PromptValidation {
  const text = stripWrappingFence(prompt);
  let sections = xmlSections(text);
  let format: PromptValidation["format"] = "xml";
  if (sections.length === 0) {
    sections = markdownSections(text);
    format = sections.length > 0 ? "markdown" : "none";
  }
  const findings: Finding[] = [];
  const add = (severity: Severity, code: string, message: string, section?: string): void => {
    findings.push(section ? { severity, code, message, section } : { severity, code, message });
  };
  const byTag = new Map<string, Section>();
  for (const section of sections) {
    if (byTag.has(section.tag)) {
      add("error", "duplicate-section", `<${section.tag}> appears more than once.`, section.tag);
    } else {
      byTag.set(section.tag, section);
    }
    if (!section.content) {
      add(
        "error",
        "empty-section",
        section.tag === "order_of_operations" || section.tag === "anchors"
          ? `<${section.tag}> is empty; omit an optional section when no trigger fires.`
          : `<${section.tag}> is empty.`,
        section.tag,
      );
    }
  }
  for (const tag of mandatorySectionTags()) {
    if (!byTag.has(tag))
      add("error", "missing-section", `Mandatory section <${tag}> is missing.`, tag);
  }

  const order = sections.map((section) => section.tag);
  if (order.length > 0 && byTag.has("mission") && order[0] !== "mission") {
    add(
      "error",
      "mission-not-first",
      "Mission must come first among the prompt sections.",
      "mission",
    );
  }
  const expected = sectionOrder().filter((tag) => byTag.has(tag));
  const actual = [...new Set(order)];
  if (actual.join() !== expected.join()) {
    add(
      "warning",
      "section-order",
      `Sections are in the order ${actual.join(" → ")}; the default is ${expected.join(" → ")}. A default, not a guarantee, but deviate deliberately.`,
    );
  }

  const mission = byTag.get("mission");
  if (mission?.content) {
    if (!INTENTION.test(mission.content)) {
      add(
        "warning",
        "mission-without-intention",
        'Mission should state why (the intention), not only what: "…so that…".',
        "mission",
      );
    }
    if (sentenceCount(mission.content) > 3) {
      add(
        "warning",
        "mission-too-long",
        'Mission should be one or two sentences, plus an "Assumed intention:" line when C-2 applies.',
        "mission",
      );
    }
  }
  for (const section of sections) {
    if (section.tag !== "mission" && /assumed intention\s*:/i.test(section.content)) {
      add(
        "warning",
        "assumed-intention-outside-mission",
        'Put the "Assumed intention:" line in Mission (rule C-2).',
        section.tag,
      );
    }
  }

  const successSpec = byTag.get("success_spec")?.content ?? "";
  const hasVerificationChecks = VERIFICATION.test(successSpec);
  if (successSpec) {
    if (!OUTPUT_SHAPE.test(successSpec)) {
      add(
        "error",
        "success-spec-without-output-shape",
        "Success spec must state the output shape: format, sections, length, tone.",
        "success_spec",
      );
    }
    if (!hasVerificationChecks) {
      add(
        "error",
        "success-spec-without-verification",
        'Success spec must list concrete verification checks ("Before returning, check: …" or "Done means …").',
        "success_spec",
      );
    }
  }

  const scope = byTag.get("scope")?.content ?? "";
  if (scope) {
    if (!ASSUMPTION_POLICY.test(scope)) {
      add(
        "warning",
        "scope-without-assumption-policy",
        "Scope should state the assumption policy: ask, or proceed and state assumptions.",
        "scope",
      );
    }
    const rules = scope.split("\n").filter((line) => RULE_LINE.test(line));
    if (rules.length > 0 && rules.every((line) => NEGATIVE_RULE.test(line))) {
      add(
        "warning",
        "scope-only-prohibitions",
        "Every Scope rule is a prohibition; phrase rules positively where possible.",
        "scope",
      );
    }
  }

  let orderOfOperationsTrigger: OrderTriggerId[] | undefined;
  const orderSection = byTag.get("order_of_operations");
  if (orderSection?.content) {
    orderOfOperationsTrigger = inferOrderTriggers(orderSection, options);
    if (orderOfOperationsTrigger.length === 0) {
      orderOfOperationsTrigger = undefined;
      add(
        "warning",
        "order-without-trigger",
        'No o trigger is evident (o-1 required sequence, o-2 non-reasoning model on multi-step reasoning, o-3 agent checkpoints). Omit it if the steps only describe how to think, or declare trigger="o-1".',
        "order_of_operations",
      );
    }
  }

  let anchorTrigger: AnchorTriggerId[] | undefined;
  const anchorSection = byTag.get("anchors");
  if (anchorSection?.content) {
    anchorTrigger = inferAnchorTriggers(anchorSection, options);
    if (anchorTrigger.length === 0) {
      anchorTrigger = undefined;
      add(
        "warning",
        "anchors-without-trigger",
        'No a trigger is evident (a-1 easier to show than describe, a-2 fine-grained classification, a-3 vendor recommends examples). Declare trigger="a-1" or omit anchors.',
        "anchors",
      );
    }
    const examples = anchorSection.content.match(/<example\b/gi)?.length ?? 0;
    if (examples === 1 || examples > 5) {
      add(
        "warning",
        "anchor-example-count",
        `Found ${examples} <example> anchors; use 3–5 diverse examples or one labelled template.`,
        "anchors",
      );
    }
    if (/<template\b/i.test(anchorSection.content) && !/format only/i.test(anchorSection.content)) {
      add(
        "warning",
        "template-anchor-unlabelled",
        "Label a template anchor as format only, so its content is not reused.",
        "anchors",
      );
    }
  }

  if (PASTED_CARD.test(text)) {
    add(
      "error",
      "pasted-analysis-card",
      "The analysis card is pasted into the prompt; move its answers into M, P, and S instead (rule C-3).",
    );
  }
  if (PERSONA.test(text)) {
    add(
      "warning",
      "persona-line",
      "Persona line found. Personas are not an accuracy lever; use one perspective line in Provisions only if voice matters.",
    );
  }
  if (THINK_STEPS.test(text)) {
    add(
      "warning",
      "reasoning-instruction",
      options.targetModel === "non-reasoning"
        ? "Explicit reasoning instruction found; prefer an order-of-operations section with a required sequence."
        : 'Explicit "think step by step"-style instruction found; reasoning models gain little from it. State what done looks like instead.',
    );
  }
  if (format === "none") {
    add(
      "error",
      "no-sections",
      "No CoMPaSS sections found. Delimit sections with XML tags or Markdown headings.",
    );
  }

  const placeholders = [...new Set(text.match(PLACEHOLDER) ?? [])];
  const result: PromptValidation = {
    valid: !findings.some((finding) => finding.severity === "error"),
    format,
    sections: order,
    hasMission: byTag.has("mission"),
    hasProvisions: byTag.has("provisions"),
    hasScope: byTag.has("scope"),
    hasSuccessSpec: byTag.has("success_spec"),
    hasOrderOfOperations: byTag.has("order_of_operations"),
    hasAnchors: byTag.has("anchors"),
    successSpec,
    hasVerificationChecks,
    placeholders,
    findings,
  };
  if (orderOfOperationsTrigger) result.orderOfOperationsTrigger = orderOfOperationsTrigger;
  if (anchorTrigger) result.anchorTrigger = anchorTrigger;
  return result;
}

export function renderValidation(result: PromptValidation): string {
  const lines = [
    `${result.valid ? "PASS" : "FAIL"}: CoMPaSS prompt structure (${result.format}; sections: ${result.sections.join(" → ") || "none"})`,
  ];
  for (const finding of result.findings) {
    lines.push(
      `${finding.severity.toUpperCase()} [${finding.code}]${finding.section ? ` <${finding.section}>` : ""}: ${finding.message}`,
    );
  }
  if (result.orderOfOperationsTrigger)
    lines.push(`o triggers: ${result.orderOfOperationsTrigger.join(", ")}`);
  if (result.anchorTrigger) lines.push(`a triggers: ${result.anchorTrigger.join(", ")}`);
  if (result.placeholders.length > 0)
    lines.push(`Placeholders to fill: ${result.placeholders.join(", ")}`);
  lines.push(
    "Structural check only; it does not verify that the Mission captures the user's real intention.",
  );
  return lines.join("\n");
}

function main(argv: string[]): number {
  try {
    const args = parseArgs(argv);
    if (args.positional.length > 1) throw new UsageError("give one prompt file, or - for stdin");
    const result = validatePrompt(readInput(args.positional[0]), args.options);
    console.log(args.json ? JSON.stringify(result, null, 2) : renderValidation(result));
    return result.valid ? 0 : 1;
  } catch (error) {
    if (error instanceof UsageError || (error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(`usage error: ${(error as Error).message}`);
      console.error(
        "usage: node scripts/validate-prompt.ts [PROMPT_FILE|-] [--target-model reasoning|non-reasoning] [--vendor <name>] [--json]",
      );
      return 2;
    }
    throw error;
  }
}

if (isMain(import.meta.url)) process.exitCode = main(process.argv.slice(2));
