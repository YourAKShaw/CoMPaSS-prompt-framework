// Shared CoMPaSS types and rules, loaded from assets/component-table.json so the
// scripts and the documentation share one source of truth.
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Tier = 0 | 1 | 2;
export type Confidence = "high" | "medium" | "low";
export type TargetModel = "reasoning" | "non-reasoning" | "unknown";
export type Decision = "stop" | "ask" | "proceed";
export type OrderTriggerId = "o-1" | "o-2" | "o-3";
export type AnchorTriggerId = "a-1" | "a-2" | "a-3";

export interface Trigger {
  id: string;
  name: string;
  text: string;
}

export interface Component {
  id: string;
  letter: string;
  name: string;
  mandatory: boolean;
  stage: "before_prompt_writing" | "prompt";
  appears_in_prompt: boolean;
  tag?: string;
  purpose: string;
  inclusion_triggers?: Trigger[];
  exclusion_rule?: string;
  rules?: (string | Trigger)[];
}

export interface ComponentTable {
  framework: string;
  skill_version: string;
  section_order: string[];
  max_clarifying_questions: number;
  tiers: { tier: Tier; name: string; action: string }[];
  intention_confidence: { level: Confidence; action: string }[];
  components: Component[];
}

/** Options that describe the prompt's target; none of them can be read from the request text. */
export interface TargetOptions {
  targetModel?: TargetModel;
  /** Model vendor, e.g. "gemini". Gemini recommends examples by default (trigger a-3). */
  vendor?: string;
  /** The output must follow a format, voice, or labelling that is easier to show than describe (a-1). */
  fixedFormat?: boolean;
}

export interface OptionalDecision<T extends string> {
  include: boolean;
  triggers: T[];
  reasons: string[];
}

/** A drafted Comprehend analysis card. Every text field is a draft for the author to confirm. */
export interface RequirementAnalysis {
  requirement: string;
  action: string;
  intention: string;
  deliverable: string;
  path: string;
  tier: Tier;
  tierSignals: string[];
  intentionConfidence: Confidence;
  confidenceSignals: string[];
  alternativeReading: string;
  assumedIntention?: string;
  clarifyingQuestions: string[];
  orderOfOperations: OptionalDecision<OrderTriggerId>;
  anchors: OptionalDecision<AnchorTriggerId>;
  decision: Decision;
  targetModel: TargetModel;
  heuristic: true;
}

export const SKILL_ROOT = fileURLToPath(new URL("../../", import.meta.url));

let cachedTable: ComponentTable | undefined;

export function loadComponentTable(): ComponentTable {
  cachedTable ??= JSON.parse(
    readFileSync(new URL("../../assets/component-table.json", import.meta.url), "utf8"),
  ) as ComponentTable;
  return cachedTable;
}

export function component(id: string): Component {
  const found = loadComponentTable().components.find((item) => item.id === id);
  if (!found) throw new Error(`unknown CoMPaSS component: ${id}`);
  return found;
}

/** Prompt section tags in the default order: Mission → Provisions → (order) → (anchors) → Scope → Success spec. */
export function sectionOrder(): string[] {
  return loadComponentTable().section_order;
}

export function mandatorySectionTags(): string[] {
  return loadComponentTable()
    .components.filter((item) => item.mandatory && item.tag)
    .map((item) => item.tag as string);
}

export function triggerText(componentId: string, triggerId: string): string {
  const trigger = component(componentId).inclusion_triggers?.find((item) => item.id === triggerId);
  if (!trigger) throw new Error(`unknown trigger ${triggerId} for ${componentId}`);
  return trigger.text;
}

export interface ParsedArgs {
  positional: string[];
  json: boolean;
  options: TargetOptions;
}

export class UsageError extends Error {}

/** Parse the flags shared by the helper CLIs. */
export function parseArgs(
  argv: string[],
  extraFlags: string[] = [],
): ParsedArgs & {
  flags: Set<string>;
} {
  const parsed: ParsedArgs & { flags: Set<string> } = {
    positional: [],
    json: false,
    options: {},
    flags: new Set(),
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index] as string;
    const value = (): string => {
      const next = argv[++index];
      if (next === undefined || next.startsWith("--")) throw new UsageError(`${arg} needs a value`);
      return next;
    };
    if (arg === "--json") parsed.json = true;
    else if (arg === "--fixed-format") parsed.options.fixedFormat = true;
    else if (arg === "--vendor") parsed.options.vendor = value().toLowerCase();
    else if (arg === "--target-model") {
      const model = value();
      if (model !== "reasoning" && model !== "non-reasoning" && model !== "unknown") {
        throw new UsageError("--target-model must be reasoning, non-reasoning, or unknown");
      }
      parsed.options.targetModel = model;
    } else if (extraFlags.includes(arg)) parsed.flags.add(arg);
    else if (arg.startsWith("--")) throw new UsageError(`unknown option: ${arg}`);
    else parsed.positional.push(arg);
  }
  return parsed;
}

/** Read a positional file argument, or stdin when it is "-" or absent. */
export function readInput(path: string | undefined): string {
  return readFileSync(path === undefined || path === "-" ? 0 : path, "utf8");
}

/** True when this module is the script Node was started with. */
export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(entry);
  } catch {
    return false;
  }
}
