# Evaluating CoMPaSS

CoMPaSS has not been tested. This guide explains how to run the pre-registered evaluation plan from the paper, record results in a shared format, and contribute them. Nothing here reports results: none exist yet.

## The pre-registered plan (paper Section 9.2, verbatim)

1. **Task suite.** About 150 real requests across communication, analysis/decision and agentic coding, each paired with a hidden "true intention" written by the requester.
2. **Conditions.** Plain request; ART; RTF; CO-STAR; RISEN; CoMPaSS; and ablations removing the C stage, **o** and **a**.
3. **Models.** At least one reasoning and one non-reasoning model from each of three vendors.
4. **Metrics.** Blind rubric-graded task success; intention-match rate; Success-spec compliance; tokens and latency; clarifying-question rate; and, following Sclar et al., spread across at least three meaning-preserving layouts.
5. **Baseline ceiling.** A GEPA- or DSPy-optimized prompt for tasks with automatic metrics.
6. **Pre-registration.** The primary hypothesis is that CoMPaSS improves intention-match rate over RTF and ART on Tier 1–2 tasks, at a measurable token cost.

The same text, with its sources, is packaged in the skill as [`references/evaluation-plan.md`](../skills/compass-prompt-framework/references/evaluation-plan.md).

## How to run it

1. **Collect the task suite.** Gather about 150 real requests, roughly balanced across `communication`, `analysis_decision`, and `agentic_coding`. Before anyone builds a prompt, each requester writes the *true intention* in one or two sentences. Keep it hidden from every condition and from the people writing prompts. Mark tasks that have an automatic metric (`automatic_metric: true`); they also need the optimized baseline. Keep the suite to Tier 1–2 requests: the hypothesis concerns them.
2. **Build one prompt per task and condition.** Write the plain, ART, RTF, CO-STAR, RISEN, and CoMPaSS prompts. For the ablations, take the CoMPaSS prompt and remove the C-stage influence (`compass-no-c`: build from the literal request without the analysis card), `<order_of_operations>` (`compass-no-o`), or `<anchors>` (`compass-no-a`). For tasks with automatic metrics, optimize a baseline prompt with GEPA or DSPy (`optimized-baseline`).
3. **Create at least three meaning-preserving layouts** per prompt (for example XML tags, Markdown headings, and plain paragraphs, with identical content).
4. **Run every task × condition × model × layout.** Use at least one reasoning and one non-reasoning model from each of three vendors. Record tokens and latency from the API responses, and whether the model asked a clarifying question.
5. **Grade blind.** Graders see the request, the true intention, and the output, never the condition. Grade task success on a rubric normalized to 0–1, intention match (did the output serve the true intention?) as true or false, and Success-spec compliance as true or false, or `null` for conditions that have no Success spec.
6. **Validate and report** with the harness, below.

## Data format

The harness prints empty templates:

```sh
node skills/compass-prompt-framework/scripts/evaluate-skill.ts template
```

**Suite file:**

```json
{
  "name": "acme-2027-q1",
  "tasks": [
    {
      "id": "c-001",
      "category": "communication",
      "tier": 1,
      "request": "The real request, verbatim.",
      "true_intention": "Written by the requester; hidden from every condition.",
      "automatic_metric": false
    }
  ]
}
```

**Results file:** one record per run.

```json
{
  "suite": "acme-2027-q1",
  "runs": [
    {
      "task_id": "c-001",
      "condition": "compass",
      "model": "vendor-model-id",
      "vendor": "vendor-name",
      "model_type": "reasoning",
      "layout": "xml",
      "task_success": 0.75,
      "intention_match": true,
      "success_spec_compliance": true,
      "input_tokens": 1830,
      "output_tokens": 640,
      "latency_ms": 9120,
      "asked_clarifying_question": false
    }
  ]
}
```

`condition` is one of `plain`, `art`, `rtf`, `co-star`, `risen`, `compass`, `compass-no-c`, `compass-no-o`, `compass-no-a`, or `optimized-baseline`. The numbers above illustrate the format only.

## Validate and report

With Node.js 22.18 or later, from the repository root:

```sh
node skills/compass-prompt-framework/scripts/evaluate-skill.ts plan
node skills/compass-prompt-framework/scripts/evaluate-skill.ts validate-suite suite.json
node skills/compass-prompt-framework/scripts/evaluate-skill.ts validate-results suite.json results.json
node skills/compass-prompt-framework/scripts/evaluate-skill.ts report suite.json results.json
```

`validate-results` checks the plan's coverage: every task × condition × model cell, the optimized baseline for tasks with automatic metrics, three vendors each with a reasoning and a non-reasoning model, and at least three layouts per condition. `report` refuses incomplete results unless you pass `--allow-incomplete`, which labels the report exploratory.

The report gives, per condition, task success, intention-match rate, Success-spec compliance, mean input and output tokens, latency, clarifying-question rate, layout spread (the gap between the best and worst layout's mean task success), and a breakdown by model type. For the primary hypothesis it reports CoMPaSS's intention-match difference against RTF and against ART on Tier 1–2 tasks, with a 95% paired bootstrap interval over tasks (2,000 resamples, fixed seed) and the mean token difference.

## Hypothesis and success criteria

The primary hypothesis is **supported** on a suite when, for both RTF and ART, the 95% interval for CoMPaSS's intention-match difference lies entirely above zero, and the token cost is reported. It is **not supported** when an interval includes or lies below zero. Report a measurable token cost either way: the hypothesis predicts one. Secondary metrics (task success, compliance, clarifying-question rate, layout spread, and the ablations) are descriptive and should be reported in full, including where they disagree with the primary result.

A supported hypothesis on one suite is evidence for that suite and those models, not proof that CoMPaSS is better in general.

## Submit results

1. Open an [evaluation-run issue](https://github.com/YourAKShaw/CoMPaSS-prompt-framework/issues/new?template=04-evaluation-run.yml) with the harness validation output, the report, your setup, and every deviation from the plan.
2. Link the raw suite and results files if you have the right to publish them; otherwise describe the suite.
3. Accepted runs are added to `docs/EVALUATION_RESULTS.md` with the date, models, metrics, deviations, and attribution to your team. Results are published whichever way they point.
