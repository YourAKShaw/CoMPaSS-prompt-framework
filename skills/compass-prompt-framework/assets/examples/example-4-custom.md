# Example 4: Go-to-market brief (custom: includes a; omits o)

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
