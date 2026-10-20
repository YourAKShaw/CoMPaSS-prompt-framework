# Component reference

A full page for each CoMPaSS component: what it is, when to include or omit it, its rules, a template, common mistakes, and examples. The normative text comes from Sections 5.1–5.3 and 6 of [the CoMPaSS paper](compass-paper.md); quoted rules are verbatim. Guidance marked **Practice note** is this skill's elaboration, not a claim from the paper. CoMPaSS is a **Proposal**: it has not been benchmarked ([limitations](limitations.md)).

## Contents

- [The architecture at a glance](#the-architecture-at-a-glance)
- [C: Comprehend](#c-comprehend)
- [o: order of operations](#o-order-of-operations)
- [M: Mission](#m-mission)
- [P: Provisions](#p-provisions)
- [a: anchors](#a-anchors)
- [S: Scope](#s-scope)
- [S: Success spec](#s-success-spec)
- [Assembly and revision](#assembly-and-revision)

## The architecture at a glance

CoMPaSS is read as "compass": establish the user's intention and the efficient path before writing the prompt. Uppercase letters (C, M, P, S, S) are mandatory. Lowercase letters (o, a) are optional and governed by inclusion rules. The two S components are deliberately separate: **Scope** governs the work while it is under way, and **Success spec** governs the finished artifact.

| Letter | Component | Mandatory / Optional | Appears in the prompt as | Machine-readable rules |
|---|---|---|---|---|
| **C** | Comprehend | Mandatory, performed *before* writing | Nothing directly; its answers feed M, P, S and the o/a decisions | [`component-table.json`](../assets/component-table.json) |
| **o** | order of operations | Optional | `<order_of_operations>` | triggers `o-1`–`o-3` |
| **M** | Mission | Mandatory | `<mission>` | — |
| **P** | Provisions | Mandatory | `<provisions>` | — |
| **a** | anchors | Optional | `<anchors>` | triggers `a-1`–`a-3` |
| **S** | Scope | Mandatory | `<scope>` | — |
| **S** | Success spec | Mandatory | `<success_spec>` | — |

The acronym order (C-o-M-P-a-S-S) is the reading order of the name. The default **prompt** order is different: Mission → Provisions → (order) → (anchors) → Scope → Success spec.

---

## C: Comprehend

**Mandatory; the analysis-first stage.** The prompt author completes this stage before writing anything. The author may be a person or a model used as a meta-prompter. The output is a short **analysis card** with four required fields and two control fields.

| Field | Question | Example answer form |
|---|---|---|
| **Action** | What is the user doing right now? | "Drafting a team announcement" |
| **Intention** | Why are they doing it? What outcome in the world do they want? | "Get the rotation adopted without a morale hit" |
| **Deliverable / Decision** | What artifact or decision must exist at the end? | "Send-ready message, 150–250 words" |
| **Efficient path** | What is the cheapest route that reliably gets there? | "Single pass; placeholders for unknown dates; no examples" |
| *Tier* (control) | 0 = trivial, 1 = single-turn artifact or decision, 2 = multi-step or agentic | "Tier 1" |
| *Intention confidence* (control) | High / medium / low, plus the strongest alternative reading | "Medium-high; alternative: persuade leadership (rejected: 'tell my team')" |

### Why it comes first

Requests usually state an *action* ("write an email", "fix this test") and leave the *intention* implicit. A well-structured prompt aimed at the wrong intention still fails. Existing frameworks (RTF, CO-STAR, RISEN, CRISPE) begin at prompt-writing; RISEN's "End Goal" and CO-STAR's "Objective" capture purpose, but neither defines a procedure for discovering it (paper Section 4).

### Rules

- **C-1 (tier gate).** For Tier 0, stop. Ask the question directly or use ART/RTF.
- **C-2 (ambiguity gate).** If intention confidence is *low*, ask at most three clarifying questions before writing the prompt. If *medium*, proceed, but write the assumed intention explicitly into Mission so the model and the user can both see and correct it.
- **C-3 (no verbatim card).** The card is not pasted into the prompt. Action and Intention go into **M**, Deliverable goes into **M** and **S**uccess spec, and Path decides whether **o** and **a** are included and what goes into **P**.
- **C-4 (path realism).** The efficient path must name what can be skipped (research, examples, steps) as well as what must be done.

### Include / omit

Never omit. C is the one component that cannot be skipped, including when the result is "Tier 0, stop": the tier gate is itself an output of C.

### Template

[`assets/templates/c-analysis-card.md`](../assets/templates/c-analysis-card.md). The [tier decision tree](../assets/tier-decision-tree.md) applies C-1 and C-2.

### Common mistakes

- **Restating the action as the intention.** "Intention: write an announcement" repeats the Action. Ask what changes in the world if the deliverable succeeds ("the team accepts the rotation").
- **Treating the requested means as the goal.** In Example 2 the user asks about ClickHouse, but the intention is fast dashboards at acceptable cost and risk; "ClickHouse is one candidate means, not the goal."
- **Skipping the alternative reading.** The strongest alternative reading is what turns confidence from a feeling into a check. Record it and why it was rejected or kept open.
- **Confident misreading.** A wrong intention written confidently into Mission may steer the model *more* strongly than silence would. When unsure, rate confidence medium and make the assumption visible.
- **A path that only adds.** Rule C-4: the path must name what is skipped (for example "no examples", "placeholders rather than questions").
- **Asking more than three questions** at low confidence, or asking questions whose answers would not change the prompt.
- **Pasting the card into the prompt** (violates C-3).

### Examples

| Example | Confidence | Alternative reading | Handling |
|---|---|---|---|
| [1: announcement](worked-examples.md#example-1-communication-task-optional-components-omitted) | Medium-high | Persuade leadership | Rejected: the user said "tell my team" |
| [2: migration decision](worked-examples.md#example-2-analytical--decision-task-includes-o-omits-a) | Medium | Decision already made; wants a plan | "Assumed intention" line in Mission |
| [3: flaky test](worked-examples.md#example-3-agentic-coding--multi-step-task-full-architecture-o-and-a-included) | High | "Make CI green by any means" | Rejected: retries or skips would hide a possible production bug |
| [4: ICP brief](worked-examples.md#example-4-go-to-market-brief-custom-includes-a-omits-o) | Medium | Narrative buyer persona for marketing | "Assumed intention" line in Mission |
| [Counter-example](worked-examples.md#counter-example-when-not-to-use-compass) | — | — | Tier 0: stop and ask directly |

---

## o: order of operations

**Optional.** A required sequence of steps, included only when the order itself is a requirement.

### Include only if at least one trigger fires

1. **o-1: Sequence is a requirement**, for example "reproduce before fixing", "fix decision criteria before scoring options", or a compliance-mandated order.
2. **o-2: The target is a non-reasoning model on a multi-step reasoning task.** Decomposition methods (least-to-most, plan-and-solve) have evidence of benefit there.
3. **o-3: An agent needs checkpoints**, where progress must be reported or confirmed between phases.

### Omit

Omit when the steps would merely describe *how to think* to a reasoning model (OpenAI guidance; Meincke et al., 2025). If no trigger fires, omit the section entirely; do not leave an empty tag.

### Why

Least-to-most and plan-and-solve prompting show decomposition gains on earlier, non-reasoning models ([literature summary](literature-summary.md#21-reasoning-elicitation-methods)). For reasoning models, explicit CoT prompting gives "only marginal, if any, gains in answer accuracy" while response time rises by 20–80% ([literature summary](literature-summary.md#22-how-reasoning-models-change-prompting-practice)). The distinction that survives: steps that constrain the *procedure* (what must happen before what) remain valuable; steps that script the model's *thinking* do not.

### Template

```xml
<order_of_operations>
1. [Step whose position is itself a requirement]
2. [Next step]
3. [Final step, often "verify (see success_spec)"]
Pause and report after step [N] if [condition that needs a human decision].
</order_of_operations>
```

### Common mistakes

- **"Think step by step" in disguise:** steps such as "1. Understand the problem. 2. Consider options. 3. Answer." describe thinking, not a required procedure.
- **Including o because the task is Tier 2.** Tier does not fire a trigger; a checkpoint requirement (o-3) or a required sequence (o-1) does.
- **Checkpoints without a condition.** "Pause after step 2" should say when and why, as Example 3 does: if the root cause is in production code and the fix would change customer-facing pricing behavior.

### Examples

- **Included, o-1:** Example 2 fixes the decision criteria before scoring options, "so the recommendation cannot be rationalized after the fact."
- **Included, o-1 and o-3:** Example 3 requires "reproduce before fixing" and a pause-and-report checkpoint.
- **Omitted:** Example 1 (a single short artifact has no required sequence) and Example 4 (one brief on a reasoning model; steps would only describe how to think).

---

## M: Mission

**Mandatory.** One statement of *what* to produce or decide and *why* (the intention).

### Rules

- One or two sentences stating the deliverable or decision and the intention behind it ("…so that…").
- When C-2 applies, add an "Assumed intention:" line.
- Mission comes first among the prompt sections, so the model reads the purpose before the details.

### Why

Vendor guidance converges on clear, direct instructions ("Claude responds well to clear, explicit instructions"; "Keep prompts simple and direct"). RISEN's "End goal" and CO-STAR's "Objective" occupy the same slot; Mission differs by always carrying the intention from C, not only the action.

### Template

[`assets/templates/m-mission.md`](../assets/templates/m-mission.md).

### Common mistakes

- **Action without intention:** "Write an announcement about the rotation" omits *why*, so the model cannot trade off tone against completeness.
- **Hidden assumption:** proceeding at medium confidence without an "Assumed intention:" line, so neither the model nor the user can correct it.
- **A persona opener** ("You are a world-class…") in place of the purpose. Perspective belongs in Provisions as one line, if at all.
- **Mission sprawl:** constraints and format details belong in Scope and Success spec.

### Examples

- Example 3: "Find and fix the root cause … so the team can trust CI again. A fix that only hides the flakiness is a failure." Naming the unacceptable outcome sharpens the goal.
- Example 2 adds: "Assumed intention: we have not committed to migrating; if the evidence clearly favors migration, say so and stop at a recommendation rather than writing a migration plan."

---

## P: Provisions

**Mandatory.** The smallest set of high-signal context a capable newcomer would need: facts, audience, materials (for agents, *pointers* such as file paths and commands, for just-in-time retrieval) and tool notes.

### Rules

- Include only context that changes the output.
- Replace unknown facts with explicit placeholders rather than inventing them.
- For agents, prefer pointers over pasted content.
- **Persona rule:** no "You are a world-class X" line by default. If perspective or voice matters, add one *perspective line* and treat it as a style lever, not an accuracy lever.

### Why

Anthropic frames context engineering as "finding the *smallest possible* set of high-signal tokens that maximize the likelihood of some desired outcome," with "just in time" retrieval for agents. Independent persona studies found that personas do not improve factual accuracy and that "the effect of each persona can be largely random" (Zheng et al., 2024; Basil et al., 2025), while Anthropic presents role prompting as useful for tone and focus. CoMPaSS resolves the tension by demoting persona to an optional perspective line ([literature summary](literature-summary.md#23-role-and-persona-prompting)).

### Template

[`assets/templates/p-provisions.md`](../assets/templates/p-provisions.md).

### Common mistakes

- **Context dumping:** pasting everything available. Each item should change the output.
- **Invented specifics:** filling unknown dates, figures or links with plausible values. Use `[PLACEHOLDER]` and a Scope rule to preserve it.
- **Pasting a repository into an agent brief** instead of giving paths and commands to read on demand.
- **Persona as accuracy lever:** "You are a senior database expert" does not make the analysis more correct.

### Examples

- Example 1 uses a perspective line: "a lead who has heard the complaints and is fixing a process, not defending one."
- Example 2 nests pasted data in `<workload_data>` and states an assumption policy for a blank latency target.
- Example 3 gives pointers only and says: "Read files as you need them; do not load the whole repository up front."

---

## a: anchors

**Optional.** Examples or exemplars that show format, voice or labelling.

### Include when a trigger fires

1. **a-1:** format, voice or labelling is easier to show than describe;
2. **a-2:** the task is fine-grained classification;
3. **a-3:** the target vendor recommends examples by default (Gemini).

Use 3–5 diverse examples as a few-shot set, or one clearly labelled *template* anchor as a format skeleton.

### Omit

For reasoning models, try without anchors first. Omit when the format can be fully specified in the Success spec.

### Why

Vendors disagree on defaults: Anthropic recommends "3-5 diverse, relevant examples"; Google says "We recommend to always include few-shot examples in your prompts"; OpenAI's reasoning guidance says to try zero-shot first ([literature summary](literature-summary.md#24-few-shot-examples)). The common ground is that examples help when format, voice or labelling is easier to show than to describe.

### Template

```xml
<anchors>
<template note="Format only. Do not reuse its content.">
[Skeleton of the required format, with bracketed slots]
</template>
</anchors>
```

For a few-shot set, wrap each of 3–5 diverse examples in `<example>` tags with consistent formatting.

### Common mistakes

- **Content leakage:** an example with real-looking content gets copied. Label template anchors "Format only" and use bracketed slots.
- **Uniform examples:** few-shot sets that share an unintended pattern (length, topic, label balance) teach that pattern. Make them diverse.
- **One example as a few-shot set:** a single full example anchors content heavily; prefer a template skeleton or 3–5 diverse examples.
- **Anchors by habit** on a reasoning model when the Success spec already describes the format.

### Examples

- **Included, a-1:** Example 3 uses one template anchor for a team PR-description format; Example 4 uses one for a reusable ICP brief layout and deliberately supplies no example personas.
- **Omitted:** Example 1 (the voice fits in one line) and Example 2 (the memo structure can be fully specified in the Success spec, and the target is a reasoning model).

---

## S: Scope

**Mandatory.** Constraints and boundaries: what is in and out, non-goals, prohibited shortcuts, length or budget limits, and the **assumption policy** (ask, or proceed and state assumptions).

### Rules

- State boundaries, non-goals, prohibited shortcuts, and limits.
- State the assumption policy.
- Phrase rules positively where possible, telling the model what to do rather than only what to avoid, as Anthropic's guidance recommends.

### Why

Scope corresponds to Shumer's "constraints", RISEN's "Narrowing" and ART's "Terms". It governs the work *while it is under way*; Success spec governs the finished artifact.

### Template

[`assets/templates/s-scope.md`](../assets/templates/s-scope.md).

### Common mistakes

- **Only prohibitions:** "Don't make things up" is weaker than "Base claims on the pasted data; label any figure you estimate as an estimate."
- **Missing shortcut bans:** for agents, the shortcuts that satisfy the letter of the Mission while defeating it (retries, skips, loosened assertions in Example 3).
- **No stopping rule:** Example 3's "If you cannot reproduce the failure in 200 runs, stop and report what you tried" prevents unbounded work.
- **Mixing in acceptance checks:** "the test passes 200 times" is a Success spec check, not a Scope rule.

### Examples

- Example 1: "Use only the facts above; keep every bracketed placeholder exactly as written."
- Example 2: "Include migration and operational costs, not only query speed."
- Example 3: "Change only files needed for the fix; no unrelated refactors or dependency upgrades."

---

## S: Success spec

**Mandatory.** Two parts:

1. **Output shape:** format, sections, length, tone. For machine-consumed output, use the provider's schema enforcement (structured outputs or tool schemas) rather than prose instructions. For reasoning-heavy tasks that need structure, ask for reasoning first and formatting second, following Tam et al.
2. **Verification / acceptance checks:** concrete, checkable conditions the output must satisfy before it is returned. For agents, these are executable checks plus a report of what was and was not verified, following Shumer's template.

### Why

Popular frameworks specify output format but rarely acceptance checks (paper Section 4). For reasoning models, telling the model *how to think* is low value; telling it *what done looks like* and *how to check it* remains high value. Strict format constraints can degrade reasoning (Tam et al., 2024), and constrained decoding enforces schemas at the API layer ([literature summary](literature-summary.md#25-structured-output-constrained-decoding-and-format-sensitivity)).

### Template

[`assets/templates/success-spec.md`](../assets/templates/success-spec.md).

### Common mistakes

- **Collapsing to a vague instruction** ("make sure it's high quality"). Every check must be checkable.
- **Format without verification:** a word count and headings, but no "Before returning, check:" conditions.
- **Prose schemas for machine consumers:** describing JSON in prose instead of using structured outputs or tool schemas.
- **Agents that report only success:** require a "Not verified" section or equivalent report of what was not checked.

### Examples

- Example 1: "Before returning, check: (1) every placeholder is preserved, (2) the pager-load concern is addressed explicitly, (3) no unstated promises appear."
- Example 2: "the criteria section precedes the comparison; every non-pasted number is labelled as an estimate; the recommendation is consistent with the comparison table."
- Example 3: "Done means all of the following are true and reported: 1. The test passes in at least 200 consecutive runs after the fix. …"

---

## Assembly and revision

1. **Delimit sections** with XML tags or Markdown headings, in the order Mission → Provisions → (order) → (anchors) → Scope → Success spec. "There are no canonical 'best' XML tags", and because format effects vary by model (Sclar et al.), treat this layout as a default, not a guarantee. Skeleton: [`assets/templates/compass-prompt-skeleton.md`](../assets/templates/compass-prompt-skeleton.md).
2. **Run the prompt, compare the output against the Success spec, and revise the component that failed.** Do not add components that did not address the failure.
3. **If a metric and data exist,** hand the prompt to an automated optimizer (for example DSPy or GEPA); when both exist, automatic optimization beats hand-tuning.

**Practice note:** map each observed failure to one component before editing.

| Observed failure | Revise |
|---|---|
| Right format, wrong goal | C, then Mission (re-check the intention and alternative reading) |
| Invented facts or figures | Provisions (placeholders) and Scope (evidence rule) |
| Skipped a required step or checkpoint | order of operations (or add it if o-1/o-3 now fires) |
| Wrong format, voice or labels | Success spec first; anchors if the format is easier to show (a-1) |
| Took a forbidden shortcut | Scope |
| Returned without checking | Success spec verification checks |
