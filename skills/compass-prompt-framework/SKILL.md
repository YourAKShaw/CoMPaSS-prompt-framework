---
name: compass-prompt-framework
description: "Write, rewrite, or review prompts with CoMPaSS, an analysis-first prompting technique for consequential deliverables, decisions, and agent briefs. It first analyzes the user's Action, Intention, Deliverable/Decision, and Efficient path, applies tier and ambiguity gates, then assembles Mission, Provisions, Scope, and Success spec, adding order of operations or anchors only when their triggers fire. Use when asked for a high-stakes prompt, a system or task prompt, an agent or subagent brief, or a decision prompt where misreading intent is costly, or when the user mentions CoMPaSS, analysis-first prompting, or prompt success criteria. Not for trivial or factual questions, or requests that already state purpose, audience, and format: answer directly or use ART or RTF."
license: MIT
metadata:
  version: "0.1.0-alpha"
  author: "Ayush Kumar Shaw"
  source: "https://github.com/YourAKShaw/CoMPaSS-prompt-framework"
  status: "Research-grade proposal; not benchmarked"
  keywords: "prompt engineering, agent briefs, prompting framework, decision prompts, agentic automation, context engineering"
  tags: "prompt engineering, frameworks, agents"
---

# CoMPaSS: An Analysis-First Prompting Framework for AI Agents

CoMPaSS (read "compass") is a structured technique for building consequential prompts. Before any prompt is written, it forces a use-case analysis: what is the user doing (**Action**), why (**Intention**), what must come out (**Deliverable/Decision**), and what is the cheapest reliable route (**Efficient path**). It then assembles the prompt from seven components with explicit inclusion rules: **C**omprehend, **o**rder of operations, **M**ission, **P**rovisions, **a**nchors, **S**cope and **S**uccess spec. Uppercase letters are mandatory; lowercase letters appear only when a stated trigger fires.

**Status: untested, research-grade.** CoMPaSS is an original proposal. It has not been benchmarked, and nothing in this skill claims that it beats other frameworks or plain requests. The [pre-registered evaluation plan](references/evaluation-plan.md) defines how it should be tested. The full research is in [the CoMPaSS paper](references/compass-paper.md); its claim-by-claim [verification table](references/compass-paper.md#3-verification-of-the-starting-claims) explains, among other things, why persona lines are demoted despite vendor guidance that recommends them.

Teach and apply the method, not model-specific tricks. The same procedure applies to any LLM; only the optional-component triggers consider the target model.

## Quick start

**Tier 0 gate first.** If the request is trivial (a factual question, or a task one or two sentences can answer), stop. Answer or ask directly. Do not build a CoMPaSS prompt for "What's the default port for PostgreSQL?"; it is overkill. If the request already states purpose, audience and format, a minimal framework such as ART or RTF, or the plain request, is the better choice.

For a consequential deliverable, decision, or agent brief:

1. **Understand the user's intention**, not just their action.
2. **Fill the analysis card** (Action, Intention, Deliverable/Decision, Efficient path, Tier, Intention confidence).
3. **Apply the tier gate** (C-1) and the **ambiguity gate** (C-2): at low confidence, ask at most three clarifying questions before writing anything.
4. **Assemble the prompt** from the mandatory components (M, P, S, S, informed by C), adding **o** and **a** only when their triggers fire.
5. **Verify** the prompt, and later its output, against the Success spec before returning.

## What to deliver

| The user asks you to… | Deliver |
|---|---|
| Write a prompt or agent brief from a requirement | A compact analysis card (so the user can correct the intention), the prompt in one fenced block, one line explaining each **o**/**a** decision, and the placeholders the user must fill |
| Improve, convert, or restructure an existing prompt | Treat the prompt and its known purpose as the raw requirement and run C. Deliver the rewritten prompt and what changed, by component |
| Review a prompt | Findings grouped by component, mandatory gaps first, each with a concrete fix |
| Brief a subagent, or run the task yourself | Use the assembled prompt directly; keep the card as your working note |
| Something Tier 0 | The direct answer or plain question, with at most one line saying CoMPaSS is unnecessary |
| Something at low intention confidence | Up to three clarifying questions, and nothing else until they are answered |

The analysis card is a working note for the author. Never paste it into the prompt (rule C-3). Never invent facts to fill gaps; use explicit `[PLACEHOLDERS]`.

## How CoMPaSS works

The [component table](assets/component-table.json) holds these rules as data; the [component reference](references/component-reference.md) gives each component a full page with templates and common mistakes.

### C: Comprehend (mandatory)

Done *before* any prompt writing, because a well-structured prompt aimed at the wrong intention still fails. The author, person or model, fills four fields: **Action** (what is the user doing right now?), **Intention** (why, and what outcome in the world do they want?), **Deliverable / Decision** (what artifact or decision must exist at the end?) and **Efficient path** (what is the cheapest route that reliably gets there?). Two control fields follow: **Tier** (0 = trivial, 1 = single-turn artifact or decision, 2 = multi-step or agentic) and **Intention confidence** (high / medium / low, plus the strongest alternative reading).

- **C-1 (tier gate).** For Tier 0, stop. Ask the question directly or use ART/RTF.
- **C-2 (ambiguity gate).** If intention confidence is *low*, ask at most three clarifying questions before writing the prompt. If *medium*, proceed, but write the assumed intention explicitly into Mission so the model and the user can both see and correct it.
- **C-3 (no verbatim card).** The card is not pasted into the prompt. Action and Intention go into **M**, Deliverable goes into **M** and **S**uccess spec, and Path decides whether **o** and **a** are included and what goes into **P**.
- **C-4 (path realism).** The efficient path must name what can be skipped (research, examples, steps) as well as what must be done.

### o: order of operations (optional)

A required sequence of steps. Include **only if** at least one trigger fires: (o-1) **sequence is a requirement**, such as "reproduce before fixing" or "fix decision criteria before scoring options"; (o-2) **the target is a non-reasoning model on a multi-step reasoning task**; (o-3) **an agent needs checkpoints** between phases. Omit it when the steps would merely describe *how to think* to a reasoning model.

### M: Mission (mandatory)

One or two sentences stating the deliverable or decision and the intention behind it ("…so that…"). When C-2 applies, add an "Assumed intention:" line. Mission comes first among the prompt sections, so the model reads the purpose before the details.

### P: Provisions (mandatory)

The smallest set of high-signal context a capable newcomer would need: facts, audience, materials and tool notes. For agents, give *pointers* such as file paths and commands, for just-in-time retrieval, rather than pasted content. Replace unknown facts with explicit placeholders. **Persona rule:** no "You are a world-class X" line by default. If perspective or voice matters, add one *perspective line* and treat it as a style lever, not an accuracy lever.

### a: anchors (optional)

Examples or exemplars. Include when (a-1) **format, voice or labelling is easier to show than describe**, (a-2) the task is **fine-grained classification**, or (a-3) the **target vendor recommends examples by default** (Gemini). Use 3–5 diverse examples as a few-shot set, or one clearly labelled *template* anchor as a format skeleton. For reasoning models, try without anchors first.

### S: Scope (mandatory)

Constraints and boundaries: what is in and out, non-goals, prohibited shortcuts, length or budget limits, and the **assumption policy** (ask, or proceed and state assumptions). Phrase rules positively where possible: say what to do, not only what to avoid. Scope governs the work while it is under way.

### S: Success spec (mandatory)

Governs the finished artifact, in two parts. **Output shape:** format, sections, length, tone; for machine-consumed output, use the provider's schema enforcement (structured outputs or tool schemas) rather than prose; for reasoning-heavy tasks that need structure, ask for reasoning first and formatting second. **Verification / acceptance checks:** concrete, checkable conditions the output must satisfy before it is returned; for agents, executable checks plus a report of what was and was not verified. Never collapse it into a vague instruction.

## Step-by-step procedure

1. **Capture the raw requirement** verbatim, including any attached materials.
2. **Run C (Comprehend):** fill in Action, Intention, Deliverable/Decision and Efficient path. Record the strongest alternative reading of the intention.
3. **Set the tier.** If Tier 0, stop and ask directly (or use ART/RTF).
4. **Apply the ambiguity gate.** Low confidence: ask up to three clarifying questions, then restart at step 2. Medium: continue and plan an "Assumed intention" line.
5. **Write M (Mission):** what, and why, in one or two sentences.
6. **Assemble P (Provisions):** include only context that changes the output. Replace unknown facts with explicit placeholders rather than inventing them. For agents, prefer pointers over pasted content.
7. **Decide on o:** apply the three triggers. If none fire, omit it.
8. **Decide on a:** apply the anchor triggers. If none fire, omit it.
9. **Write S (Scope):** constraints, non-goals and the assumption policy.
10. **Write S (Success spec):** output shape, plus verification checks. Move schema enforcement to the API layer when the output is machine-consumed.
11. **Delimit sections** with XML tags or Markdown headings, in the order Mission → Provisions → (order) → (anchors) → Scope → Success spec. Because format effects vary by model, treat this layout as a default, not a guarantee.
12. **Run the prompt, compare the output against the Success spec, and revise the component that failed.** Do not add components that did not address the failure. If a metric and data exist, hand the prompt to an automated optimizer (for example DSPy or GEPA).

When you will not run the prompt yourself, end at step 11 and hand step 12 to the user: say which Success spec checks to compare the output against.

## Worked examples

Examples 1–3 are verbatim from Section 7 of the paper (illustrative, not test results). Example 4 is this skill's custom example. All of them, plus the counter-example, are consolidated in [worked examples](references/worked-examples.md).

### Example 1: Communication task (optional components *omitted*)

**(a) User requirement**
> "Can you write something to tell my team we're switching to a weekly on-call rotation starting next month? People are already annoyed about pager load."

**(b) Use-case analysis (C)**

| Field | Analysis |
|---|---|
| Action | Drafting an internal announcement of a process change |
| Intention | Get the new rotation accepted with minimal friction by showing it responds to the pager-load complaint, and make sure each person knows what changes for them |
| Deliverable | A send-ready message (subject line + body, about 150–250 words) |
| Efficient path | Single-pass draft; unknown specifics (dates, tool, schedule link) as placeholders rather than questions; no steps; no examples |
| Tier | 1 |
| Intention confidence | Medium-high. Alternative reading: a proposal to persuade leadership. Rejected because the user said "tell my team." |

**Why o and a are omitted:** a single short artifact has no required sequence, so **o** has no trigger; the desired voice ("direct, acknowledges frustration, no corporate spin") fits in one line, so **a** has no trigger. Adding them would spend tokens without addressing a likely failure.

**(c) Resulting prompt**

```xml
<mission>
Write a short announcement to my engineering team that we are moving to a weekly
on-call rotation. The goal is for the team to accept the change and know exactly
what it means for them; many are frustrated about pager load, so the message must
show how this change addresses that.
</mission>

<provisions>
- Audience: my direct team of backend engineers who currently share on-call ad hoc.
- Change: weekly rotation starting [START DATE]; handoff at [HANDOFF DAY/TIME];
  schedule lives at [SCHEDULE LINK]; escalation path is [ESCALATION CONTACT].
- Known concern: pager load feels unpredictable and unevenly shared.
- Sender: me, the team lead. Perspective: a lead who has heard the complaints and
  is fixing a process, not defending one.
</provisions>

<scope>
- Use only the facts above; keep every bracketed placeholder exactly as written.
- Acknowledge the frustration in one sentence, then move to specifics.
- Avoid promising outcomes I have not stated (for example, fewer total pages).
</scope>

<success_spec>
Output: a subject line, then a message of 150–250 words in plain, direct language,
ending with one clear call to action (check your first shift date at [SCHEDULE LINK]
and raise conflicts by [DEADLINE]).
Before returning, check: (1) every placeholder is preserved, (2) the pager-load
concern is addressed explicitly, (3) no unstated promises appear.
</success_spec>
```

### Example 2: Analytical / decision task (includes o; omits a)

**(a) User requirement**
> "Our product-analytics dashboards on Postgres are getting slow. Should we move to ClickHouse? I've pasted our table sizes, the slowest queries, and our team size."

**(b) Use-case analysis (C)**

| Field | Analysis |
|---|---|
| Action | Evaluating a database migration for analytics workloads |
| Intention | Make dashboards fast enough for the business at acceptable cost and risk. ClickHouse is one candidate means, not the goal. |
| Decision | Recommend migrate / do not migrate / conditional, with the cheapest next step to reduce uncertainty |
| Efficient path | Fix the decision criteria first, evaluate the status quo with tuning as well as ClickHouse, and recommend the lowest-cost option that meets the criteria. No examples needed; the target is a reasoning model. |
| Tier | 1 (high stakes) |
| Intention confidence | Medium. Alternative reading: the decision is already made and the user wants a migration plan. Handled with an explicit "Assumed intention" line. |

**Why o is included:** sequence is a requirement (trigger 1). Criteria must be fixed *before* the options are scored, so the recommendation cannot be rationalized after the fact. The steps constrain the *decision procedure*, not the model's internal reasoning.
**Why a is omitted:** the memo structure can be fully specified in the Success spec, and the target is a reasoning model, for which zero-shot comes first.

**(c) Resulting prompt**

```xml
<mission>
Decide whether we should migrate our product-analytics workload from Postgres to
ClickHouse, or whether a cheaper option meets our needs. The real goal is dashboards
that are fast enough for the business at acceptable cost and operational risk.
Assumed intention: we have not committed to migrating; if the evidence clearly favors
migration, say so and stop at a recommendation rather than writing a migration plan.
</mission>

<provisions>
<workload_data>
[PASTE: table sizes, row counts, growth rate]
[PASTE: slowest queries with latency and frequency]
</workload_data>
- Team: [N] engineers; no one has run ClickHouse in production.
- Dashboard latency target: [TARGET, e.g. p95 under N seconds] (state an assumption
  if this is blank).
- Budget/ops constraints: [ANY KNOWN LIMITS].
</provisions>

<order_of_operations>
1. State the decision criteria and their weights before evaluating any option.
2. Evaluate at least three options against those criteria: (a) Postgres with
   targeted tuning (indexes, partitioning, materialized views or rollups),
   (b) Postgres plus a columnar extension or read replica, (c) ClickHouse.
3. Recommend one option, with the conditions under which the recommendation flips.
4. Propose the single cheapest experiment that would most reduce uncertainty.
</order_of_operations>

<scope>
- Base claims on the pasted data; label any figure you estimate as an estimate.
- Include migration and operational costs, not only query speed.
- If the data is insufficient for a confident recommendation, say what is missing.
</scope>

<success_spec>
Output: a decision memo in Markdown, under 700 words, with sections: Recommendation
(one sentence) · Criteria and weights · Option comparison (table) · Risks ·
What would change this decision · Next experiment · Confidence (high/medium/low,
with one-line reason).
Before returning, check: the criteria section precedes the comparison; every
non-pasted number is labelled as an estimate; the recommendation is consistent
with the comparison table.
</success_spec>
```

### Example 3: Agentic coding / multi-step task (full architecture: o and a included)

**(a) User requirement**
> "The checkout-service CI keeps failing on `test_apply_discount` at random. Fix it."

**(b) Use-case analysis (C)**

| Field | Analysis |
|---|---|
| Action | Unblocking a CI pipeline affected by a flaky test |
| Intention | Restore trust in the test suite so merges can proceed, *without* masking a real defect. Flakiness can indicate a race or ordering bug in production code. |
| Deliverable | A branch with a root-cause fix and a PR description, *or* evidence that the defect is in production code with a proposed fix |
| Efficient path | Reproduce → identify the source of non-determinism → fix at the root → verify by repeated runs → report. Give the agent file pointers and commands rather than pasting code (just-in-time retrieval). |
| Tier | 2 (agentic) |
| Intention confidence | High. Alternative reading: "make CI green by any means." Rejected because retries or skips would hide a possible production bug. |

**Why o is included:** sequence is a requirement ("reproduce before fixing"), and the agent needs checkpoints (triggers 1 and 3).
**Why a is included:** the PR description must follow a team format that is easier to show than to describe. A single labelled *template* anchor is used for format only.

**(c) Resulting prompt**

```xml
<mission>
Find and fix the root cause of the intermittent failure of test_apply_discount in
checkout-service, so the team can trust CI again. A fix that only hides the
flakiness is a failure: if the non-determinism comes from production code, fix it
there.
</mission>

<provisions>
- Repo: [REPO PATH]. Service code: services/checkout/. Test: tests/test_discounts.py.
- Run the single test: [TEST COMMAND] -k test_apply_discount
- Run the full suite: [FULL SUITE COMMAND]
- CI logs of recent failures: [LOG LOCATION OR CI LINK]
- Read files as you need them; do not load the whole repository up front.
</provisions>

<order_of_operations>
1. Reproduce: run the test repeatedly (at least 50 runs) and record the failure rate
   before changing anything.
2. Isolate: identify the source of non-determinism (e.g. ordering, time, shared state,
   concurrency, randomness, external calls) and confirm it with a targeted experiment.
3. Fix at the root, in test or production code as the evidence indicates.
4. Verify (see success_spec), then write the PR description.
Pause and report after step 2 if the root cause is in production code and the fix
would change customer-facing pricing behavior.
</order_of_operations>

<anchors>
<template note="Format only. Do not reuse its content.">
## Root cause
[One paragraph: what was non-deterministic and why.]
## Fix
[What changed, in which files, and why this addresses the root cause.]
## Evidence
[Failure rate before: X/50. After: Y/N runs. Full suite: pass/fail.]
## Not verified
[Anything you could not check.]
</template>
</anchors>

<scope>
- Do not add retries, sleeps, skips, or xfail markers, and do not loosen assertions.
- Change only files needed for the fix; no unrelated refactors or dependency upgrades.
- If you cannot reproduce the failure in 200 runs, stop and report what you tried.
</scope>

<success_spec>
Done means all of the following are true and reported:
1. The test passes in at least 200 consecutive runs after the fix.
2. The full suite passes.
3. The PR description follows the template, including the "Not verified" section.
Return: the branch name, the PR description, and the before/after failure rates.
</success_spec>
```

### Example 4: Go-to-market brief (custom: includes a; omits o)

*Custom example defined for this skill (Proposal; illustrative, not test results). It fills the combination the paper's examples leave open: **a** included, **o** omitted. The task comes from the author's own work at NayaManas, a founder-led workflow automation and AI implementation agency.*

**(a) User requirement**
> "Write a brief for the first customer ICP persona for NayaManas AI services. What are the defining characteristics, pain points, and signals we should look for?"

**(b) Use-case analysis (C)**

| Field | Analysis |
|---|---|
| Action | Defining the first ideal customer profile (ICP) for a founder-led workflow automation and AI implementation agency |
| Intention | Focus limited founder outreach and sales time on the prospects most likely to buy, succeed with an implementation, and refer others, instead of everyone who "could use AI" |
| Deliverable | A one-page ICP brief: defining characteristics, pain points, observable buying signals and disqualifiers, with every claim labelled as evidence or hypothesis |
| Efficient path | Single pass from the founder's own evidence (past engagements, discovery calls), with placeholders for what is not yet pasted; no market research, no invented statistics, no steps; one template anchor for the brief's fixed layout |
| Tier | 1 |
| Intention confidence | Medium. Alternative reading: a marketing *buyer persona* (a named, narrative character for website copy). "Signals we should look for" points to targeting and qualification, so the ICP reading is assumed and written into Mission. |

**Why o is omitted:** a single brief has no required sequence, the target is a reasoning model, and listing steps would only tell it how to think, which is the case the omission rule names. No checkpoint is needed.
**Why a is included:** the brief has a fixed layout that the founder will reuse for later segments and compare side by side, which is easier to show than to describe (trigger a-1). A single labelled *template* anchor is used for format only. Example personas are deliberately not supplied: invented companies would anchor the content, not just the format.

**(c) Resulting prompt**

```xml
<mission>
Write the first ideal customer profile (ICP) brief for NayaManas, a founder-led
workflow automation and AI implementation agency, so that outreach and sales time
goes to the prospects most likely to buy, succeed with an implementation, and
refer others.
Assumed intention: this is a qualification ICP for targeting and screening
prospects, not a narrative buyer persona for marketing copy. If the evidence below
cannot support a qualification ICP, say what is missing instead of writing a persona.
</mission>

<provisions>
<evidence>
[PASTE: notes from past engagements and pilots: client type, size, problem, outcome]
[PASTE: recurring themes from discovery calls, with rough counts]
</evidence>
- Offer: workflow automation and AI implementation services, delivered by the
  founder [AND ANY CONTRACTORS].
- Capacity: [N] concurrent engagements; typical engagement [LENGTH] at [PRICE RANGE].
- Regions and languages served: [REGIONS].
- Known exclusions: [ANY WORK WE DO NOT TAKE, e.g. regulated data we cannot handle].
</provisions>

<anchors>
<template note="Format only. Do not reuse its content.">
## ICP: [Segment name]
**One-line definition:** [who, size, situation]
## Defining characteristics
| Attribute | Value | Basis |
|---|---|---|
| [Attribute] | [Value] | [Evidence or hypothesis] |
## Pain points
1. [Pain, in the customer's words] (Basis: [evidence or hypothesis])
## Buying signals
- [Observable signal], seen in [where it can be observed]
## Disqualifiers
- [Signal that the prospect is not a fit]
## Open questions
- [What would confirm or kill this ICP]
</template>
</anchors>

<scope>
- Define one ICP segment: the strongest one the evidence supports. Name a runner-up
  segment in one line at most.
- Base characteristics on the pasted evidence; label anything else as a hypothesis.
- Make every buying signal observable from outside the company (job posts, tooling,
  public statements, hiring) or in a first call.
- Use only figures from the evidence; keep every bracketed placeholder as written,
  and leave statistics, market sizes and customer quotes out unless pasted.
</scope>

<success_spec>
Output: a Markdown brief under 600 words that follows the template headings in order.
Before returning, check: (1) every characteristic and pain point carries a Basis
label, (2) each buying signal says where it can be observed, (3) there are at least
three disqualifiers, (4) every number comes from the pasted evidence or is labelled
as an estimate.
</success_spec>
```

The same example lives in [`assets/examples/example-4-custom.md`](assets/examples/example-4-custom.md).

### Counter-example: when not to use CoMPaSS

**User requirement:** "What's the default port for PostgreSQL?"
**C analysis:** Action = looking up a fact; Deliverable = one number; Path = ask directly. **Tier 0 → stop.** A full CoMPaSS prompt would cost more than the task is worth; the plain question is the correct choice.

## Template: Comprehend analysis card

Copy this card, or the fuller [analysis card template](assets/templates/c-analysis-card.md), as your working note:

```markdown
**Raw requirement (verbatim):** [exactly what the user said]

| Field | Answer |
|---|---|
| Action | What is the user doing right now? |
| Intention | Why? What outcome in the world do they want? |
| Deliverable / Decision | What artifact or decision must exist at the end? |
| Efficient path | Cheapest reliable route; name what is skipped as well as what is done |
| Tier | 0 = trivial · 1 = single-turn artifact or decision · 2 = multi-step / agentic |
| Intention confidence | High / Medium / Low + strongest alternative reading |

o: include / omit (trigger: o-1 · o-2 · o-3 · none)
a: include / omit (trigger: a-1 · a-2 · a-3 · none)
Decision: Proceed / Ask up to 3 clarifying questions / Stop (Tier 0)
```

Section templates: [Mission](assets/templates/m-mission.md), [Provisions](assets/templates/p-provisions.md), [Scope](assets/templates/s-scope.md), [Success spec](assets/templates/success-spec.md), and the [full prompt skeleton](assets/templates/compass-prompt-skeleton.md). The [tier decision tree](assets/tier-decision-tree.md) walks through both gates.

## Optional helper scripts

The method needs no tooling. Where Node.js 22.18 or later is available, these zero-dependency scripts help; run them with the skill directory as `<skill-dir>`. Their analysis is keyword heuristics, not understanding: treat every field they draft as a starting point to confirm or overwrite.

| Command | Purpose |
|---|---|
| `node <skill-dir>/scripts/analyze-requirement.ts "<requirement>"` | Draft an analysis card with tier, confidence and o/a trigger signals ([source](scripts/analyze-requirement.ts)) |
| `node <skill-dir>/scripts/scaffold-prompt.ts "<requirement>"` | Draft the card and a prompt skeleton in the default section order ([source](scripts/scaffold-prompt.ts)) |
| `node <skill-dir>/scripts/validate-prompt.ts <prompt-file>` | Check a prompt's CoMPaSS structure: mandatory sections, order, verification checks, optional-component triggers, pasted cards, persona lines ([source](scripts/validate-prompt.ts)) |
| `node <skill-dir>/scripts/evaluate-skill.ts plan` | Print the pre-registered evaluation plan's requirements; other subcommands validate a task suite and results and compute its metrics ([source](scripts/evaluate-skill.ts)) |

Options: `--target-model reasoning|non-reasoning`, `--vendor <name>`, `--fixed-format` (the output follows a format easier to show than describe) and `--json`. Shared logic: [compass library](scripts/lib/compass.ts). A structural pass from `validate-prompt.ts` shows the prompt is well-formed, not that it captures the right intention.

## Reference materials

Load only what the task needs.

| Need | Read |
|---|---|
| Each component in depth: rules, templates, common mistakes | [Component reference](references/component-reference.md) |
| A pattern similar to the current task | [Worked examples](references/worked-examples.md) |
| Whether a simpler framework fits better; ART, RTF, CO-STAR, RISEN, CRISPE | [Positioning versus other frameworks](references/vs-frameworks.md) |
| The evidence behind a rule (CoT, personas, examples, formats, context engineering) | [Literature summary](references/literature-summary.md) |
| What CoMPaSS costs and does not do | [Limitations](references/limitations.md) |
| How CoMPaSS should be tested | [Evaluation plan](references/evaluation-plan.md) |
| The complete research, with all citations | [CoMPaSS paper](references/compass-paper.md) |

## Important notes

- **Untested.** CoMPaSS has not been benchmarked. Never present it, or a prompt built with it, as proven to perform better. Section 9.2 of the paper outlines a pre-registered evaluation plan.
- **Use case dependent.** CoMPaSS adds overhead on trivial tasks. The tier gate exists to prevent this, but only if it is applied honestly; resist "framework creep."
- **Optional components require triggers.** Do not include all seven components for every request; apply the stated inclusion rules, and never leave an empty optional section.
- **Misreading intention is the new failure mode.** A wrong intention written confidently into Mission may steer the model more strongly than silence would. Make medium-confidence assumptions visible; ask at low confidence.
- **Layout is a default.** No section order or tag set is proven optimal across models.
- **When a metric and data exist,** automated optimization (DSPy, GEPA) beats hand-tuning; CoMPaSS matters most where neither exists.

## Maintaining this skill

The paper copy is immutable. The literature summary, positioning, limitations, evaluation plan, paper examples and consolidated worked examples are generated from it by the [reference generator](scripts/generate-references.py) (`python3 <skill-dir>/scripts/generate-references.py --check` reports drift). Keep the component table, this file and the component reference consistent when a rule changes.

Check the package offline with the [package validator](scripts/validate-skill.ts): `node <skill-dir>/scripts/validate-skill.ts`. It checks the manifest, required resources, JSON assets, local links and anchors, and that every resource is reachable from this file. It does not evaluate prompt quality or agent behavior. The regression tests live in `tests/` ([C stage](tests/test-c-analysis.ts), [prompt validity](tests/test-prompt-validity.ts), [integration](tests/test-integration.ts), [evaluation harness](tests/test-evaluate-skill.ts), [package validator](tests/test-validate-skill.ts)), with [requirement fixtures](tests/fixtures/requirement-tier-1.txt). Package format: [Agent Skills specification](https://agentskills.io/specification).
