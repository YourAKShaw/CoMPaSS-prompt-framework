# CoMPaSS: Analysis-First Prompting Framework

Welcome. This skill teaches CoMPaSS, a structured prompting technique for building consequential AI prompts: agent briefs, decision prompts, and deliverables where misreading what the user wants is costly.

## In 30 seconds

1. **Use CoMPaSS for:** consequential deliverables, decisions, and agent briefs where misreading intent is costly.
2. **Don't use CoMPaSS for:** trivial or factual questions ("What's the capital of France?") or requests that already state purpose, audience, and format. Ask directly, or use ART or RTF.
3. **The technique:** analyze the user's Action, Intention, Deliverable/Decision, and Efficient path *before* writing the prompt. Then assemble Mission, Provisions, Scope, and Success spec, adding order of operations or anchors only when a stated trigger fires, and always define how the result is verified.

CoMPaSS is a **research-grade proposal**. It has not been benchmarked, and no part of this project claims that it outperforms other frameworks.

## Quick start

Install the skill (see the [repository README](../README.md#-get-started) for every option), then invoke it:

- **Claude Code:** type `/compass-prompt-framework`, followed by your requirement, or describe a high-stakes prompt or agent brief and let Claude select the skill.
- **Claude apps:** upload the skill ZIP under **Customize → Skills**, switch it on, then ask Claude to "use CoMPaSS" for a decision memo, brief, or prompt.
- **Claude API:** upload the skill folder to `/v1/skills` and reference it in `container.skills` together with the code execution tool. See [SKILL-USAGE.md](SKILL-USAGE.md#claude-api).

## Main sections

- [SKILL.md](../skills/compass-prompt-framework/SKILL.md): how to use CoMPaSS step by step.
- [Full research paper](../skills/compass-prompt-framework/references/compass-paper.md): literature review, verification of claims, the proposal, limitations, and the evaluation plan.
- [Worked examples](../skills/compass-prompt-framework/references/worked-examples.md): four complete walkthroughs plus a counter-example.
- [Component reference](../skills/compass-prompt-framework/references/component-reference.md): each component in depth.
- [Usage guide](SKILL-USAGE.md), [architecture](ARCHITECTURE.md), [evaluation](EVALUATION.md), and [maintenance](MAINTENANCE.md).

## Common questions

**Q: Is CoMPaSS better than ART, RTF, or CO-STAR?**
A: Nobody knows yet: CoMPaSS has not been tested. It adds overhead on trivial tasks, and it targets one specific failure mode: a well-formed prompt that solves the wrong problem. See the [positioning](../skills/compass-prompt-framework/references/vs-frameworks.md) for when each framework fits.

**Q: Why is Comprehend mandatory?**
A: The paper's problem statement is that existing frameworks begin at prompt-writing and assume the author already knows the real objective. Requests usually state an action and leave the intention implicit, and a well-structured prompt aimed at the wrong intention still fails. C makes understanding the intention a required step.

**Q: Why no "You are a world-class expert" line?**
A: Independent studies found personas do not reliably improve factual accuracy. CoMPaSS allows one optional perspective line, used for voice, not accuracy. The [literature summary](../skills/compass-prompt-framework/references/literature-summary.md#23-role-and-persona-prompting) gives the evidence and the vendor guidance that disagrees.

**Q: Can I contribute to the evaluation plan?**
A: Yes. See [EVALUATION.md](EVALUATION.md) for how to run the pre-registered benchmark and submit results.
