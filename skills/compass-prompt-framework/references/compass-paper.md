> **Revision note:** Generated from research on October 20, 2026; immutable reference. Everything below the horizontal rule after this note is the CoMPaSS research document, copied verbatim. Do not edit it; publish revisions as new files. The section extracts in this folder are generated from it by `scripts/generate-references.py`.

---

# CoMPaSS: An Analysis-First Prompting Technique for Large Language Models

CoMPaSS is a new, untested prompting technique: before anyone writes a prompt, it works out what the user is doing, why, and what they must produce or decide. It then builds the prompt from five mandatory parts and two optional ones, and the rules for including each part draw on published prompting research and current vendor guidance.

**Author:** Ayush
**Status:** Original proposal. Not benchmarked or validated. No experiments were run.
**Date:** October 2026

## TL;DR

- **Verified finding:** Published research and vendor documentation do not show any single prompt framework to be best. Most named frameworks (RTF, CO-STAR, RISEN, CRISPE) are checklists over the same ingredients. The strongest evidence concerns specific practices: clear instructions, well-chosen examples, a minimal set of high-signal context, schema-enforced output for machine consumers, and less forced "think step by step" on reasoning models.
- **Proposal:** CoMPaSS adds a required use-case analysis stage before prompt writing. It answers four questions: what is the user doing (Action), why (Intention), what must come out (Deliverable/Decision), and what is the cheapest reliable route (Path). It then builds the prompt from **C**omprehend, **o**rder of operations, **M**ission, **P**rovisions, **a**nchors, **S**cope and **S**uccess spec. Uppercase letters are mandatory and lowercase letters are optional.
- **Recommendation:** Use CoMPaSS for consequential single-turn deliverables, decisions and agent briefs, where misreading the user's purpose is costly. For trivial or well-specified tasks, use a plain question or a minimal framework such as ART or RTF. CoMPaSS should be treated as a hypothesis until the evaluation plan in Section 9 has been run.

---

## Abstract

Most prompt frameworks for large language models (LLMs) recombine the same ingredients: a role, context, a task, constraints and an output format. This document reviews the primary evidence on current prompting methods, from chain-of-thought and its variants through persona prompting, structured output, format sensitivity, reasoning models, context engineering and automated prompt optimization. Four patterns stand out. Explicit reasoning prompts add less on models that reason internally. Persona prompts do not reliably improve factual accuracy. Strict format constraints can hurt reasoning while helping parsing and classification. Vendors now emphasize a minimal set of high-signal context over clever wording. Existing frameworks also assume the author already knows what the user is trying to achieve. CoMPaSS is proposed to close that gap. It begins with a mandatory use-case analysis (Action, Intention, Deliverable/Decision, Path) and then assembles a prompt from a fixed architecture, with explicit rules for when each optional component is included. The document gives the procedure, worked examples, a comparison with ART, RTF, CO-STAR, RISEN, CRISPE and context engineering, and an evaluation plan. CoMPaSS has not been tested, and this document makes no claim of measured improvement.

---

## 1. How to read this document

Claims are labelled **Verified finding** (checked against a primary source), **Partially verified / Unverified** (secondary or untraceable; treat as an assumption), or **Proposal** (original, untested design). Sections 2–3 review the literature, Sections 4–8 present the proposal, and Section 9 is future work.

---

## 2. Background and literature summary

### 2.1 Reasoning-elicitation methods

**Chain-of-thought (CoT) prompting. Verified finding.** Wei et al. (2022) showed that few-shot exemplars containing intermediate reasoning steps improve performance on arithmetic, commonsense and symbolic reasoning tasks. With eight CoT exemplars, PaLM 540B's GSM8K solve rate rose from 18% with standard prompting to 57% with CoT, above the prior best of 55% (Wei et al., NeurIPS 2022, Figure 2). *Where it fails:* the authors describe CoT as an emergent ability of model scale. It did not help models below roughly 100B parameters, which produced "fluent but illogical chains of thought" and scored below standard prompting.\[1\]

**Zero-shot CoT. Verified finding.** Kojima et al. (2022) showed that adding the single phrase "Let's think step by step" raised InstructGPT (text-davinci-002) accuracy on MultiArith from 17.7% to 78.7% and on GSM8K from 10.4% to 40.7%, with no hand-crafted examples.\[2\]\[3\] *Where it underperforms:* the authors report that it still trails few-shot CoT with carefully crafted, task-specific exemplars.\[4\]

**Self-consistency. Verified finding.** Wang et al. (ICLR 2023) replace greedy decoding with sampling of multiple reasoning paths and selection of the most consistent final answer. They report gains over CoT on GSM8K (+17.9%), SVAMP (+11.0%), AQuA (+12.2%), StrategyQA (+6.4%) and ARC-challenge (+3.9%).\[5\] *Limitations (author's analysis of the method design):* it multiplies inference cost by the number of samples, and it needs answers that can be compared and voted on. That makes it a poor fit for open-ended prose.

**Tree of Thoughts (ToT). Verified finding.** Yao et al. (2023) generalize CoT into a search over intermediate "thoughts" with self-evaluation and backtracking. On Game of 24, "while GPT-4 with chain-of-thought prompting only solved 4% of tasks, our method achieved a success rate of 74%."\[6\] *Limitations (author's analysis):* ToT needs many model calls and task-specific decomposition and evaluation design, so it is heavy for everyday tasks.

**Least-to-most prompting. Verified finding.** Zhou et al. (2022/2023) decompose a problem into simpler subproblems and solve them in sequence. With GPT-3 code-davinci-002, least-to-most prompting solved the SCAN compositional-generalization benchmark in every split "with an accuracy of at least 99% using just 14 exemplars, compared to only 16% accuracy with chain-of-thought prompting."\[7\]

**Plan-and-solve (PS) prompting. Verified finding.** Wang et al. (2023) ask the model first to devise a plan and then to execute it. PS targets "missing-step errors", and the PS+ variant targets "calculation errors". On GPT-3 the zero-shot method "consistently outperforms Zero-shot-CoT across all datasets by a large margin" and is comparable to 8-shot CoT on math reasoning.\[8\]

**Step-back prompting. Verified finding.** Zheng et al. (2023/2024) prompt the model to abstract to high-level concepts or principles before answering. The authors report that it "improves PaLM-2L performance on MMLU (Physics and Chemistry) by 7% and 11% respectively, TimeQA by 27%, and MuSiQue by 7%."\[9\] The abstract does not say whether these are absolute or relative gains, and the figures apply to PaLM-2L.

**ReAct. Verified finding.** Yao et al. (ICLR 2023) interleave reasoning traces with actions such as tool or API calls. On ALFWorld and WebShop, one- or two-shot ReAct prompting beat imitation- and reinforcement-learning baselines by an absolute 34% and 10% in success rate. On HotpotQA and Fever, interacting with a Wikipedia API reduced the hallucination and error propagation seen in pure CoT.\[10\] *Where it underperforms:* on knowledge tasks, Google's summary calls ReAct "competitive with" CoT rather than uniformly better, and the best results came from combining ReAct with CoT plus self-consistency.\[11\]

### 2.2 How reasoning models change prompting practice

**Verified finding.** OpenAI's reasoning best-practices guide advises: "Keep prompts simple and direct" and "Avoid chain-of-thought prompts: Since these models perform reasoning internally, prompting them to 'think step by step' or 'explain your reasoning' is unnecessary." It also recommends delimiters (Markdown, XML tags, section titles) and "Try zero shot first, then few shot if needed."\[12\]\[13\]

**Verified finding.** Meincke, Mollick, Mollick and Shapiro (Wharton Generative AI Labs, *Prompting Science Report 2*, 2025) tested explicit CoT prompting on GPQA Diamond (198 PhD-level questions, 25 trials each) with five non-reasoning models (Sonnet 3.5, Gemini 2.0 Flash, GPT-4o-mini, GPT-4o, Gemini Pro 1.5), reporting that "CoT generally improves average performance by a small amount… However, CoT can introduce more variability in answers, sometimes triggering occasional errors in questions the model would otherwise get right." It also raised error rates on "easy" questions for three of five non-reasoning models. For reasoning models (o3-mini, o4-mini, Gemini Flash 2.5), the report found "only marginal, if any, gains in answer accuracy," while response time rose by 20–80%.

**Verified finding.** Anthropic's documentation notes that "Claude's reasoning frequently exceeds what a human would prescribe," and that multishot examples still shape how Claude reasons inside its thinking blocks. Its extended-thinking guidance suggests asking Claude to "verify its work with a simple test before declaring a task complete."\[14\]\[15\]

**Implication used later:** for reasoning models, telling the model *how to think* is low value. Telling it *what done looks like* and *how to check it* remains high value.

### 2.3 Role and persona prompting

**Verified finding.** Zheng et al. (Findings of EMNLP 2024) tested 162 personas across 4 LLM families on 2,410 factual questions. They found that "adding personas in system prompts does not improve model performance across a range of questions compared to the control setting where no persona is added," and that "the effect of each persona can be largely random."\[16\]\[17\]

**Verified finding.** Basil et al. (*Prompting Science Report 4*, 2025) found that expert personas showed no consistent benefit to factual accuracy across models. Domain-mismatched experts sometimes degraded performance, and low-knowledge personas ("layperson", "young child") often reduced accuracy.\[18\]

**Verified finding (vendor position, in tension with the above).** Anthropic's documentation states that "in complex scenarios like legal analysis or financial modeling, role prompting can significantly boost Claude's performance," and presents role prompting as useful for tone and focus.\[19\]

**Synthesis:** the independent evidence does not support personas as an *accuracy* lever on factual tasks. They may still shape tone, vocabulary and perspective. CoMPaSS therefore drops the persona from the mandatory set.

### 2.4 Few-shot examples

**Verified finding.** Anthropic recommends: "Include 3-5 diverse, relevant examples," wrapped in `<example>` tags, and diverse enough that the model does not pick up unintended patterns.\[14\]\[20\]
**Verified finding.** Google's Gemini documentation says: "We recommend to always include few-shot examples in your prompts," and stresses consistent formatting across examples.\[21\]
**Verified finding.** OpenAI's reasoning-model guidance says to try zero-shot first.\[13\]
**Synthesis:** examples clearly help when format, voice or labelling is easier to show than describe. Vendors disagree on whether they should be a default.

### 2.5 Structured output, constrained decoding and format sensitivity

**Verified finding.** OpenAI's Structured Outputs feature (August 2024) constrains decoding to a developer-supplied JSON Schema. OpenAI reports that gpt-4o-2024-08-06 with Structured Outputs "scores a perfect 100%" on its evals of complex schema following, using constrained decoding. OpenAI also notes that "Structured Outputs doesn't prevent all kinds of model mistakes," and that a model may refuse instead of matching the schema.\[22\]

**Verified finding.** Tam et al. ("Let Me Speak Freely?", EMNLP 2024 Industry) found "a significant decline in LLMs' reasoning abilities under format restrictions," with "stricter format constraints generally lead[ing] to greater performance degradation in reasoning tasks." Format restrictions, however, improved accuracy on classification tasks. Letting the model answer in natural language and then converting to the format ("NL-to-Format") performed nearly as well as unrestricted natural language.\[23\]\[24\]\[25\]

**Verified finding.** Sclar et al. (ICLR 2024) found that "several widely used open-source LLMs are extremely sensitive to subtle changes in prompt formatting in few-shot settings," "with performance differences of up to 76 accuracy points when evaluated using LLaMA-2-13B," that "Sensitivity remains even when increasing model size, the number of few-shot examples, or performing instruction tuning," and that "format performance only weakly correlates between models."

**Verified finding.** Anthropic recommends XML tags to separate instructions, context and examples, while noting "There are no canonical 'best' XML tags that Claude has been trained with in particular". Its context-engineering post adds that "the exact formatting of prompts is likely becoming less important as models become more capable."\[26\]\[27\]

**Implication used later:** schema enforcement belongs at the API layer for machine-consumed output. For reasoning-heavy tasks, reasoning should come before formatting. No single prompt layout should be assumed optimal across models.

### 2.6 Context engineering and agent briefs

**Verified finding.** Anthropic (Applied AI team, "Effective context engineering for AI agents", September 2025): "At Anthropic, we view context engineering as the natural progression of prompt engineering." Good context engineering means "finding the *smallest possible* set of high-signal tokens that maximize the likelihood of some desired outcome." The post recommends system prompts at the "right altitude"; minimal, non-overlapping tools ("One of the most common failure modes we see is bloated tool sets"); diverse canonical examples; "just in time" retrieval and progressive disclosure; and, for long-horizon tasks, compaction, structured note-taking and multi-agent architectures. It advises starting with "a minimal prompt with the best model available" and adding instructions and examples based on observed failure modes.\[27\]

**Verified finding.** Matt Shumer ("The Ultimate Guide to Prompting AI Agents", shumer.dev) argues that agents "don't need a sentence. They need a brief," and writes: "I call it the 3 C's: context, constraints, and composition." His template includes an explicit "Verification (don't finish until)" block and asks the agent to report what it did and did not check.\[28\]\[29\]

### 2.7 Automated prompt optimization

**Verified finding.** DSPy (Khattab et al., 2023) treats LM pipelines as declarative programs whose prompts can be compiled and optimized against a metric. GEPA (Agrawal et al., 2025; accepted at ICLR 2026) is a reflective, Pareto-based prompt optimizer whose authors report that it "outperforms the leading prompt optimizer, MIPROv2, by over 10% (e.g., +12% accuracy on AIME-2025)" and that "Across six tasks, GEPA outperforms GRPO by 6% on average and by up to 20%, while using up to 35x fewer rollouts."
**Implication:** when a metric and a dataset exist, automatic optimization beats hand-tuning. Manual frameworks such as CoMPaSS matter most where neither exists.

---

## 3. Verification of the starting claims

The user's prior discussion contained several claims. Each was checked:

| Claim from prior discussion | Status | Notes |
|---|---|---|
| No single framework is universally best; most are mnemonic checklists over shared ingredients | **Partially verified (consistent with evidence)** | No study ranks frameworks universally. Sclar et al. show format effects vary across models, and Wharton's *Prompting Science Report 1* is titled "Prompt Engineering is Complicated and Contingent."\[30\] The "checklist" characterization is the author's analysis. |
| RTF (Role, Task, Format)\[31\] is a common minimal default | **Unverified origin** | Widely repeated on blogs. No original author, paper or vendor document was found, and secondary sources themselves report no traceable origin.\[31\] |
| CO-STAR attributed to Sheila Teo / GovTech; won Singapore's first GPT-4 Prompt Engineering Competition (2023); documented on Towards Data Science; separates Style from Tone | **Verified, with a correction** | Teo's Towards Data Science article (December 2023) describes winning "Singapore's first ever GPT-4 Prompt Engineering competition" (over 400 participants, organized by GovTech) and credits CO-STAR as "a brainchild of GovTech Singapore's Data Science & AI team." GovTech created it, Teo popularized it, and Teo (not CO-STAR) won.\[32\]\[33\] Style and Tone are separate components.\[34\] |
| RISEN attributed to Kyle Balmer | **Partially verified (secondary only)** | Multiple secondary sources attribute it to Balmer's "promptentrepreneur" TikTok content. No primary post was located, and letter expansions vary between sources.\[35\]\[36\]\[37\] |
| CRISPE attributed to Matt Nigh on GitHub, February 2023 | **Verified (author and repository); date secondary** | Published papers cite Nigh (2023) and the repository `mattnigh/ChatGPT3-Free-Prompt-List`.\[38\]\[39\] The exact date (7 February 2023) comes from a secondary source reporting the commit history.\[40\] |
| Anthropic describes context engineering as the natural progression of prompt engineering; smallest set of high-signal tokens | **Verified** | Direct quotes in Section 2.6.\[27\] |
| Matt Shumer's "3 C's" (Context, Constraints, Composition) | **Verified** | Primary source: shumer.dev.\[29\] |
| Clear, direct instructions | **Verified** | Anthropic: "Claude responds well to clear, explicit instructions." OpenAI: "Keep prompts simple and direct."\[12\]\[14\] |
| Explaining the why | **Partially verified** | Consistent with Anthropic's guidance; the specific wording was not re-checked against a primary page. |
| 3–5 diverse few-shot examples | **Verified (Anthropic)** | Google recommends examples always; OpenAI says try zero-shot first for reasoning models.\[13\]\[21\] |
| Structured output (JSON/XML/Markdown), XML sectioning | **Verified, with a caveat** | Supported by vendor docs. Strict format constraints can degrade reasoning (Tam et al.).\[41\] |
| Less need for "think step by step" on frontier reasoning models | **Verified** | OpenAI guidance; Meincke et al. 2025.\[12\]\[42\] |
| Agents: progressive disclosure, just-in-time retrieval, compaction, tight tool descriptions, verification criteria | **Verified** | Anthropic (2025); Shumer.\[27\] |
| Automated prompt optimization (DSPy, GEPA) | **Verified** | Khattab et al. 2023; Agrawal et al. 2025.\[43\] |
| ART (Act As, Request, Terms) | **User's own framework** | No external source exists or is claimed. |

---

## 4. Problem statement

**Proposal (author's analysis).** Existing frameworks have three recurring weaknesses:

1. **They begin at prompt-writing, not at understanding.** RTF, CO-STAR, RISEN and CRISPE assume the author already knows the real objective. Requests usually state an *action* ("write an email", "fix this test") and leave the *intention* implicit. A well-structured prompt aimed at the wrong intention still fails. RISEN's "End Goal" and CO-STAR's "Objective" capture purpose, but neither defines a procedure for discovering it.
2. **They treat components as always-on.** Persona, step lists and examples are standard slots, yet Section 2 shows personas do not reliably improve accuracy, explicit reasoning steps add little for reasoning models, and examples help only in some situations. A framework needs inclusion *rules*, not only slots.
3. **They rarely define "done."** Except for Shumer's agent template, popular frameworks specify output format but not acceptance checks.

The design goal: force a short analysis of the user's situation, convert it into a fixed prompt architecture, include optional parts only when a stated rule fires, and always define success and verification.

---

## 5. The technique: CoMPaSS (Proposal)

### 5.1 Name and rationale

**CoMPaSS** is read as "compass." A compass establishes direction before movement, which is the core idea: establish the user's intention and the efficient path before writing the prompt. Uppercase letters (C, M, P, S, S) are mandatory. Lowercase letters (o, a) are optional and governed by inclusion rules. Each letter maps to one distinct component. The two S components are deliberately separate: **Scope** governs the work while it is under way, and **Success spec** governs the finished artifact.

### 5.2 Acronym breakdown

| Letter | Component | Mandatory / Optional | Purpose | Literature grounding |
|---|---|---|---|---|
| **C** | **Comprehend** (use-case analysis) | Mandatory, performed *before* writing | Identify Action, Intention, Deliverable/Decision and efficient Path; set the complexity tier; surface ambiguity | Gap in existing frameworks (Section 4); Anthropic's "start minimal, add based on failure modes" |
| **o** | **order of operations** | Optional | A required sequence of steps, included only when the order itself is a requirement | Least-to-most, plan-and-solve, ReAct; OpenAI and Meincke et al. on reasoning models |
| **M** | **Mission** | Mandatory | One statement of *what* to produce or decide and *why* (the intention) | RISEN "End Goal", CO-STAR "Objective"; vendor guidance on clear, direct instructions |
| **P** | **Provisions** | Mandatory | The minimal high-signal context: facts, materials, audience, tools or file pointers, plus an optional one-line perspective in place of a persona | Anthropic context engineering; Zheng et al. and Basil et al. on personas |
| **a** | **anchors** | Optional | Examples or exemplars that show format, voice or labelling | Anthropic (3–5 diverse examples); Google (examples recommended); OpenAI (zero-shot first for reasoning models) |
| **S** | **Scope** | Mandatory | Constraints, boundaries, non-goals and the assumption/clarification policy | Shumer's "constraints"; RISEN "Narrowing"; ART "Terms" |
| **S** | **Success spec** | Mandatory | Output shape (format, length, tone) and verification/acceptance checks | Shumer; OpenAI Structured Outputs; Tam et al.; Anthropic's "verify its work" guidance |

### 5.3 Component details

#### C: Comprehend (mandatory; the analysis-first stage)

The prompt author completes this stage. The author may be a person or a model used as a meta-prompter. The output is a short **analysis card** with four required fields and two control fields:

| Field | Question | Example answer form |
|---|---|---|
| **Action** | What is the user doing right now? | "Drafting a team announcement" |
| **Intention** | Why are they doing it? What outcome in the world do they want? | "Get the rotation adopted without a morale hit" |
| **Deliverable / Decision** | What artifact or decision must exist at the end? | "Send-ready message, 150–250 words" |
| **Efficient path** | What is the cheapest route that reliably gets there? | "Single pass; placeholders for unknown dates; no examples" |
| *Tier* (control) | 0 = trivial, 1 = single-turn artifact or decision, 2 = multi-step or agentic | "Tier 1" |
| *Intention confidence* (control) | High / medium / low, plus the strongest alternative reading | "Medium-high; alternative: persuade leadership (rejected: 'tell my team')" |

**Rules:**
- **C-1 (tier gate).** For Tier 0, stop. Ask the question directly or use ART/RTF.
- **C-2 (ambiguity gate).** If intention confidence is *low*, ask at most three clarifying questions before writing the prompt. If *medium*, proceed, but write the assumed intention explicitly into Mission so the model and the user can both see and correct it.
- **C-3 (no verbatim card).** The card is not pasted into the prompt. Action and Intention go into **M**, Deliverable goes into **M** and **S**uccess spec, and Path decides whether **o** and **a** are included and what goes into **P**.
- **C-4 (path realism).** The efficient path must name what can be skipped (research, examples, steps) as well as what must be done.

#### o: order of operations (optional)

Include **only if** at least one of these holds:
1. **Sequence is a requirement**, for example "reproduce before fixing", "fix decision criteria before scoring options", or a compliance-mandated order.
2. **The target is a non-reasoning model on a multi-step reasoning task.** Decomposition methods (least-to-most, plan-and-solve) have evidence of benefit there.
3. **An agent needs checkpoints**, where progress must be reported or confirmed between phases.

Omit when the steps would merely describe *how to think* to a reasoning model (OpenAI guidance; Meincke et al., 2025).

#### M: Mission (mandatory)

One or two sentences stating the deliverable or decision and the intention behind it ("…so that…"). When C-2 applies, add an "Assumed intention:" line. Mission comes first among the prompt sections, so the model reads the purpose before the details.

#### P: Provisions (mandatory)

The smallest set of high-signal context a capable newcomer would need: facts, audience, materials (for agents, *pointers* such as file paths and commands, for just-in-time retrieval) and tool notes. **Persona rule:** no "You are a world-class X" line by default. If perspective or voice matters, add one *perspective line* and treat it as a style lever, not an accuracy lever (Section 2.3).

#### a: anchors (optional)

Include when **format, voice or labelling is easier to show than describe**, for fine-grained classification, or when the target vendor recommends examples by default (Gemini). Use 3–5 diverse examples as a few-shot set, or one clearly labelled *template* anchor as a format skeleton. For reasoning models, try without anchors first.

#### S: Scope (mandatory)

Constraints and boundaries: what is in and out, non-goals, prohibited shortcuts, length or budget limits, and the **assumption policy** (ask, or proceed and state assumptions). Phrase rules positively where possible, telling the model what to do rather than only what to avoid, as Anthropic's guidance recommends.\[44\]

#### S: Success spec (mandatory)

Two parts:
1. **Output shape:** format, sections, length, tone. For machine-consumed output, use the provider's schema enforcement (structured outputs or tool schemas) rather than prose instructions. For reasoning-heavy tasks that need structure, ask for reasoning first and formatting second, following Tam et al.
2. **Verification / acceptance checks:** concrete, checkable conditions the output must satisfy before it is returned. For agents, these are executable checks plus a report of what was and was not verified, following Shumer's template.

---

## 6. Step-by-step procedure (Proposal)

1. **Capture the raw requirement** verbatim, including any attached materials.
2. **Run C (Comprehend):** fill in Action, Intention, Deliverable/Decision and Efficient path. Record the strongest alternative reading of the intention.
3. **Set the tier.** If Tier 0, stop and ask directly (or use ART/RTF).
4. **Apply the ambiguity gate.** Low confidence: ask up to three clarifying questions, then restart at step 2. Medium: continue and plan an "Assumed intention" line.
5. **Write M (Mission):** what, and why, in one or two sentences.
6. **Assemble P (Provisions):** include only context that changes the output. Replace unknown facts with explicit placeholders rather than inventing them. For agents, prefer pointers over pasted content.
7. **Decide on o:** apply the three triggers in Section 5.3. If none fire, omit it.
8. **Decide on a:** apply the anchor triggers. If none fire, omit it.
9. **Write S (Scope):** constraints, non-goals and the assumption policy.
10. **Write S (Success spec):** output shape, plus verification checks. Move schema enforcement to the API layer when the output is machine-consumed.
11. **Delimit sections** with XML tags or Markdown headings, in the order Mission → Provisions → (order) → (anchors) → Scope → Success spec. Because format effects vary by model (Sclar et al.), treat this layout as a default, not a guarantee.
12. **Run the prompt, compare the output against the Success spec, and revise the component that failed.** Do not add components that did not address the failure. If a metric and data exist, hand the prompt to an automated optimizer (for example DSPy or GEPA).

---

## 7. Worked examples (Proposal; illustrative, not test results)

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

### Example 4 (counter-example): when not to use CoMPaSS

**User requirement:** "What's the default port for PostgreSQL?"
**C analysis:** Action = looking up a fact; Deliverable = one number; Path = ask directly. **Tier 0 → stop.** A full CoMPaSS prompt would cost more than the task is worth; the plain question is the correct choice.

---

## 8. Positioning relative to existing frameworks (Proposal, with verified definitions)

| Framework | Components | Analysis stage | Verification / done criteria | Optional-component rules | Best used when |
|---|---|---|---|---|---|
| **ART** (user's own) | Act As, Request, Terms | No | Not explicit | No | Quick, well-understood tasks where the user already knows the goal |
| **RTF** (origin unverified) | Role, Task, Format | No | No | No | Minimal default for simple single-turn requests |
| **CO-STAR** (GovTech; popularized by Teo) | Context, Objective, Style, Tone, Audience, Response\[45\] | No | No | No | Audience-facing writing where style and tone need separate control |
| **RISEN** (attributed to Balmer; secondary) | Role, Instructions, Steps, End goal, Narrowing\[36\] | Partial ("End goal") | No | No | Procedural content tasks with known steps |
| **CRISPE** (Nigh) | Capacity/Role, Insight, Statement, Personality, Experiment\[46\] | No | No | No | Creative generation with several variants ("Experiment") |
| **3 C's** (Shumer) | Context, Constraints, Composition (+ verification block)\[29\] | No | **Yes** | No | Agent briefs |
| **Context engineering** (Anthropic) | Curation of the whole context state: system prompt, tools, retrieval, history, memory\[27\] | System-level, not per request | Via evaluation | Principle-based | Production agents and long-horizon systems |
| **CoMPaSS** (this proposal) | Comprehend, order, Mission, Provisions, anchors, Scope, Success spec | **Yes, mandatory and gated** | **Yes, mandatory** | **Yes, explicit triggers** | Consequential deliverables, decisions and agent briefs where misreading intent is costly |

**What CoMPaSS adds:**
1. **Analysis before construction.** The Action/Intention/Deliverable/Path card, with tier and ambiguity gates, targets the failure in which a well-formed prompt solves the wrong problem. None of the frameworks above includes it.
2. **Evidence-driven optionality.** Persona becomes an optional perspective line; steps and examples are included only on stated triggers (Section 2).
3. **Mandatory definition of done.** Shumer's verification idea becomes a standing requirement for all non-trivial prompts.
4. **A per-request bridge to context engineering.** Provisions applies Anthropic's "smallest high-signal set" and just-in-time principles to a single prompt. It does not replace system-level compaction, memory or tool design.

**When a simpler framework is the better choice:** trivial or factual tasks (ask directly); requests that already state purpose, audience and format (ART or RTF); pure audience-facing copy with obvious intent (CO-STAR's separate Style/Tone/Audience fields); tasks with a metric and labelled data (DSPy/GEPA); and production agent systems (system-level context engineering).

---

## 9. Limitations, trade-offs and evaluation plan

### 9.1 Limitations and trade-offs

- **Untested.** No experiments were run. CoMPaSS has not been benchmarked against ART, RTF, CO-STAR, RISEN, CRISPE or unstructured prompting, and no claim of improvement is made.
- **Token and time cost.** The analysis stage costs author time, or extra model calls if a meta-prompter runs it. CoMPaSS prompts are longer than RTF or ART prompts. For reasoning models, longer prompts also interact with reasoning-time costs that are already high (Meincke et al. report 20–80% time increases from CoT prompting alone).\[42\]
- **Overhead on simple tasks.** The tier gate mitigates this, but only if the author applies it honestly. There is a risk of "framework creep," where every request receives a full brief.
- **Risk of misreading intention.** The analysis stage can infer the wrong "why." A wrong intention written confidently into Mission may steer the model *more* strongly than silence would. This is a new failure mode the technique introduces. The ambiguity gate and the visible "Assumed intention" line are mitigations, not guarantees.
- **Layout is not proven optimal.** Sclar et al. show that meaning-preserving layout changes can shift accuracy substantially and inconsistently across models.\[47\] The section order and tags here were chosen for readability, not measured performance.
- **Vendor guidance conflicts.** Vendors disagree on default examples, and Anthropic's endorsement of role prompting conflicts with independent persona studies. CoMPaSS takes positions that could be wrong for specific models.
- **Overlap with prior art.** Most CoMPaSS ingredients exist elsewhere (objective, context, constraints, format, verification). Its novelty lies in the mandatory analysis stage, the gating rules and the mandatory definition of done, not in new ingredients.

### 9.2 Proposed evaluation plan (future work)

1. **Task suite.** About 150 real requests across communication, analysis/decision and agentic coding, each paired with a hidden "true intention" written by the requester.
2. **Conditions.** Plain request; ART; RTF; CO-STAR; RISEN; CoMPaSS; and ablations removing the C stage, **o** and **a**.
3. **Models.** At least one reasoning and one non-reasoning model from each of three vendors.
4. **Metrics.** Blind rubric-graded task success; intention-match rate; Success-spec compliance; tokens and latency; clarifying-question rate; and, following Sclar et al., spread across at least three meaning-preserving layouts.
5. **Baseline ceiling.** A GEPA- or DSPy-optimized prompt for tasks with automatic metrics.
6. **Pre-registration.** The primary hypothesis is that CoMPaSS improves intention-match rate over RTF and ART on Tier 1–2 tasks, at a measurable token cost.

---

## 10. Conclusion

**Verified:** the evidence has moved away from wording tricks toward clear objectives, minimal high-signal context, examples where they help, API-level schema enforcement and explicit verification. Reasoning models reduce the value of telling a model how to think, and personas are not a reliable accuracy lever.

**Proposed:** CoMPaSS puts the most neglected step, understanding what the user is doing and why, at the front of prompt construction, then builds a prompt whose optional parts appear only when stated triggers fire. Whether this reduces well-formed prompts that solve the wrong problem is an open, testable question. Until Section 9 is run, treat CoMPaSS as a structured hypothesis: use it where intent is ambiguous and stakes are real, and use ART, RTF or a plain question elsewhere.

---

## References

*All sources below were consulted for this document. No source has been invented. Kyle Balmer's original RISEN post and an original source for RTF could not be located and are therefore not listed.*

1. Agrawal, L. A., Tan, S., Soylu, D., et al. (2025). *GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning.* arXiv:2507.19457. https://arxiv.org/abs/2507.19457
2. Anthropic Applied AI team (2025, September 29). *Effective context engineering for AI agents.* https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
3. Anthropic. *Prompting best practices* (Claude documentation). https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices
4. Anthropic. *Use XML tags to structure your prompts.* https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags
5. Anthropic. *Use examples (multishot prompting) to guide Claude's behavior.* https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/multishot-prompting
6. Anthropic. *Giving Claude a role with a system prompt.* https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts
7. Anthropic. *Extended thinking tips.* https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/extended-thinking-tips
8. Basil, S., Shapiro, I., Shapiro, D., Mollick, E., Mollick, L., & Meincke, L. (2025). *Prompting Science Report 4: Playing Pretend: Expert Personas Don't Improve Factual Accuracy.* arXiv:2512.05858. https://arxiv.org/abs/2512.05858
9. Google. *Prompt design strategies* (Gemini API documentation). https://ai.google.dev/gemini-api/docs/prompting-strategies
10. Khattab, O., et al. (2023). *DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines.* arXiv:2310.03714. https://arxiv.org/abs/2310.03714
11. Kojima, T., Gu, S. S., Reid, M., Matsuo, Y., & Iwasawa, Y. (2022). *Large Language Models are Zero-Shot Reasoners.* NeurIPS 2022. arXiv:2205.11916. https://arxiv.org/abs/2205.11916
12. Meincke, L., Mollick, E., Mollick, L., & Shapiro, D. (2025). *Prompting Science Report 1: Prompt Engineering is Complicated and Contingent.* arXiv:2503.04818. https://arxiv.org/abs/2503.04818
13. Meincke, L., Mollick, E., Mollick, L., & Shapiro, D. (2025). *Prompting Science Report 2: The Decreasing Value of Chain of Thought in Prompting.* arXiv:2506.07142. https://arxiv.org/abs/2506.07142
14. Nigh, M. (2023). *ChatGPT3-Free-Prompt-List* (CRISPE framework). GitHub. https://github.com/mattnigh/ChatGPT3-Free-Prompt-List
15. OpenAI (2024, August). *Introducing Structured Outputs in the API.* https://openai.com/index/introducing-structured-outputs-in-the-api/
16. OpenAI. *Reasoning best practices.* https://developers.openai.com/api/docs/guides/reasoning-best-practices
17. Sclar, M., Choi, Y., Tsvetkov, Y., & Suhr, A. (2024). *Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design or: How I learned to start worrying about prompt formatting.* ICLR 2024. arXiv:2310.11324. https://arxiv.org/abs/2310.11324
18. Shumer, M. *The Ultimate Guide to Prompting AI Agents.* https://shumer.dev/prompting-ai-agents
19. Tam, Z. R., Wu, C.-K., Tsai, Y.-L., Lin, C.-Y., Lee, H.-y., & Chen, Y.-N. (2024). *Let Me Speak Freely? A Study on the Impact of Format Restrictions on Performance of Large Language Models.* EMNLP 2024 Industry Track. arXiv:2408.02442. https://arxiv.org/abs/2408.02442
20. Teo, S. (2023, December). *How I Won Singapore's GPT-4 Prompt Engineering Competition.* Towards Data Science. https://towardsdatascience.com/how-i-won-singapores-gpt-4-prompt-engineering-competition-34c195a93d41
21. Wang, L., Xu, W., Lan, Y., Hu, Z., Lan, Y., Lee, R. K.-W., & Lim, E.-P. (2023). *Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models.* arXiv:2305.04091. https://arxiv.org/abs/2305.04091
22. Wang, X., Wei, J., Schuurmans, D., Le, Q., Chi, E., Narang, S., Chowdhery, A., & Zhou, D. (2023). *Self-Consistency Improves Chain of Thought Reasoning in Language Models.* ICLR 2023. arXiv:2203.11171. https://arxiv.org/abs/2203.11171
23. Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models.* NeurIPS 2022. arXiv:2201.11903. https://arxiv.org/abs/2201.11903
24. Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). *ReAct: Synergizing Reasoning and Acting in Language Models.* ICLR 2023. arXiv:2210.03629. https://arxiv.org/abs/2210.03629
25. Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T. L., Cao, Y., & Narasimhan, K. (2023). *Tree of Thoughts: Deliberate Problem Solving with Large Language Models.* arXiv:2305.10601. https://arxiv.org/abs/2305.10601
26. Zheng, H. S., Mishra, S., Chen, X., Cheng, H.-T., Chi, E. H., Le, Q. V., & Zhou, D. (2023). *Take a Step Back: Evoking Reasoning via Abstraction in Large Language Models.* arXiv:2310.06117. https://arxiv.org/abs/2310.06117
27. Zheng, M., Pei, J., Logeswaran, L., Lee, M., & Jurgens, D. (2024). *When "A Helpful Assistant" Is Not Really Helpful: Personas in System Prompts Do Not Improve Performances of Large Language Models.* Findings of EMNLP 2024. https://aclanthology.org/2024.findings-emnlp.888/
28. Zhou, D., Schärli, N., Hou, L., Wei, J., Scales, N., Wang, X., Schuurmans, D., Cui, C., Bousquet, O., Le, Q., & Chi, E. (2022). *Least-to-Most Prompting Enables Complex Reasoning in Large Language Models.* arXiv:2205.10625. https://arxiv.org/abs/2205.10625

*Publication note: this document could not be published as a GitHub gist from this session, so no gist URL exists. The Markdown above is the deliverable.*

## Sources

1. [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models Jason Wei](https://webdocs.cs.ualberta.ca/~daes/papers/neurips22a.pdf)
2. [Large Language Models are Zero-Shot Reasoners](https://openreview.net/forum?id=e2TBb5y0yFf)
3. [Large Language Models are Zero-Shot Reasoners - Paper Summary](https://papers.lunadong.com/paper/4427)
4. [Large Language Models are Zero-Shot Reasoners Takeshi Kojima](https://arxiv.org/pdf/2205.11916)
5. [Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171)
6. [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601)
7. [Least-to-Most Prompting Enables Complex Reasoning in Large Language Models](https://arxiv.org/abs/2205.10625)
8. [Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models](https://arxiv.org/abs/2305.04091)
9. [Take a Step Back: Evoking Reasoning via Abstraction in Large Language Models](https://arxiv.org/abs/2310.06117)
10. [REACT: SYNERGIZING REASONING AND ACTING IN LANGUAGE MODELS - Princeton University](https://collaborate.princeton.edu/en/publications/react-synergizing-reasoning-and-acting-in-language-models/)
11. [ReAct: Synergizing Reasoning and Acting in Language Models](https://research.google/blog/react-synergizing-reasoning-and-acting-in-language-models/)
12. [Reasoning best practices](https://developers.openai.com/api/docs/guides/reasoning-best-practices)
13. [A model guide for the GPT‑6 family](https://www.lotharschulz.info/2026/10/02/a-model-guide-for-the-gpt-6-family/)
14. [Prompting best practices - Claude Platform Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct)
15. [Extended thinking tips - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/extended-thinking-tips)
16. [When "A Helpful Assistant" Is Not Really Helpful: Personas in System Prompts Do Not Improve Performances of Large Language Models](https://arxiv.org/pdf/2311.10054)
17. [Sorry, Prompt Engineers: The Research Says Your “Magic Phrases” Don’t Work](https://medium.com/@march.for.koala/sorry-prompt-engineers-the-research-says-your-magic-phrases-dont-work-7c31622a6419)
18. [(PDF) Prompting Science Report 4: Playing Pretend: Expert Personas Don't Improve Factual Accuracy](https://www.researchgate.net/publication/398430225_Prompting_Science_Report_4_Playing_Pretend_Expert_Personas_Don't_Improve_Factual_Accuracy)
19. [Giving Claude a role with a system prompt - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts)
20. [Use examples (multishot prompting) to guide Claude's behavior - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/multishot-prompting)
21. [Prompt design strategies | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/prompting-strategies)
22. [Introducing Structured Outputs in the API](https://openai.com/index/introducing-structured-outputs-in-the-api/)
23. [Let Me Speak Freely? A Study on the Impact of Format Restrictions on Performance of Large Language Models](https://arxiv.org/html/2408.02442v1)
24. [Let Me Speak Freely? A Study on the Impact of Format Restrictions on Performance of Large Language Models](https://www.alphaxiv.org/overview/2408.02442v1)
25. [Let Me Speak Freely? A Study On The Impact Of Format Restrictions On Large Language Model Performance. - ACL Anthology](https://aclanthology.org/2024.emnlp-industry.91/)
26. [Use XML tags to structure your prompts - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags?amp=&amp=)
27. [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
28. [Matt Shumer on X: "https://t.co/Mo5n1KQ2KU" / X](https://x.com/mattshumer_/status/2046738742161949135)
29. [The Ultimate Guide to Prompting AI Agents — matt shumer](https://shumer.dev/prompting-ai-agents)
30. [Lennart Meincke - Google Scholar](https://scholar.google.com/citations?user=4IxcXWwAAAAJ&hl=en)
31. [Prompt Frameworks: CO-STAR, CRISPE, RTF, RACE, RISEN](https://verdeshell.com/ai/prompt-engineering/prompt-frameworks-co-star-crispe-rtf-race-risen)
32. [The CO-STAR Framework: Real Origin, Six Parts, 14 Prompts](https://prompt-architects.com/blog/196-the-co-star-prompt-framework)
33. [How I Won Singapore’s GPT-4 Prompt Engineering Competition](https://ntrendtech.com/2023/12/29/how-i-won-singapores-gpt-4-prompt-engineering-competition-by-sheila-teo-dec-2023/)
34. [PROMPT Engineering tecnhiques.md · GitHub](https://gist.github.com/YuniorGlez/0f30d27aa923f35aae8eeb0a39b7891c)
35. [Prompt Engineering, Explained](https://medium.com/electronic-life/prompt-engineering-explained-3b83ba347722)
36. [Applied LLMs: Prompt Design Framework for Great Results](https://datatoolspro.com/prompt-design-framework/)
37. [How the RISEN Framework Transforms AI Prompt Engineering \[With ChatGPT Prompts\]](https://easyaibeginner.com/risen-framework-ai-prompt-for-chatgpt/)
38. [Minstrel: Structural Prompt Generation with Multi-Agents Coordination for Non-AI Experts](https://arxiv.org/html/2409.13449v1)
39. [Improving ChatGPT’s Performance in Orthopedics: Opportunities Using the CRISPE Framework](https://www.jospt.org/doi/10.2519/josptmethods.2025.0151)
40. [The CRISPE Framework: What It Actually Stands For](https://prompt-architects.com/blog/195-the-crispe-prompt-framework)
41. [\[2408.02442\] Let Me Speak Freely? A Study on the Impact of Format Restrictions on Performance of Large Language Models](https://ar5iv.labs.arxiv.org/html/2408.02442)
42. [Technical Report: The Decreasing Value of Chain of Thought in Prompting - Wharton Generative AI Labs](https://gail.wharton.upenn.edu/research-and-insights/tech-report-chain-of-thought/)
43. [GitHub - gepa-ai/gepa: Optimize prompts, code, and more with AI-powered Reflective Optimization · GitHub](https://github.com/gepa-ai/gepa)
44. [Prompting best practices - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
45. [Prompts that Work: Prompt Advice from Data Scientist Sheila Teo, Winner of Singapore's 2023 GPT-4 Prompt Engineering Competition - Susan Mernit](https://susanmernit.com/2024/05/ai-prompt-engineering-nonprofit-strategies/)
46. [7 ChatGPT Prompt Frameworks for Better Output, Creativity and Productivity](https://datayon.substack.com/p/7-chatgpt-prompt-frameworks)
47. [Published as a conference paper at ICLR 2024](https://par.nsf.gov/servlets/purl/10520219)
