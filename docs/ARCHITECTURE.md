# Skill architecture and design decisions

Each section states a decision, the alternative it was weighed against, and the cost it accepts.

## Why SKILL.md is the core artifact

SKILL.md encodes the whole teach-by-example approach: when to use the method, the seven components and their rules, the procedure, and the paper's examples. Unlike a textbook, it is discoverable by agents (its description decides when it loads), version-controlled, and directly usable.

**Trade-off.** Including all four worked examples brings SKILL.md to about 450 lines, close to the 500-line guideline for progressive disclosure, and every activation pays for them in tokens. Examples were kept because they teach the inclusion rules better than any description; methodological depth moved to `references/` instead.

## Why separate references/ and not one huge SKILL.md

- **Context efficiency:** agents load only what a task needs. SKILL.md teaches the method; references hold the evidence, the per-component depth, positioning, limitations, and the evaluation plan.
- **Maintenance:** sections of the paper are *generated* extracts, not hand copies, so they cannot drift (CI runs the generator with `--check`).
- **Community:** external teams can contribute evaluation runs and examples without touching SKILL.md.

**Trade-off.** The generator is extra machinery, and generated files must never be hand-edited. The alternative, hand-copied extracts, is simpler but drifts silently.

## Why the paper copy is immutable

`references/compass-paper.md` is the research document byte for byte, under a revision note, and a test pins its SHA-256. Every claim in the skill can be traced to a fixed source, and the "verbatim" extracts are checkably verbatim. Revisions go in new files.

**Trade-off.** Typos in the paper stay in the paper. That is accepted: a reference that changes under its citations is worse than a typo.

## Why the C (Comprehend) stage is mandatory

The paper's problem statement (Section 4) is that existing frameworks begin at prompt-writing and assume the author knows the real objective; a well-structured prompt aimed at the wrong intention still fails. C gates that failure mode. It is the one component that cannot be skipped: even "Tier 0, stop" is an output of C.

**Trade-off.** C costs author time or extra model calls, and it introduces a new failure mode: a confidently wrong intention in Mission may steer the model more strongly than silence would. The ambiguity gate and the visible "Assumed intention" line mitigate this; they do not guarantee against it (paper Section 9.1).

## Why optional components have explicit triggers

CoMPaSS risks framework creep: overthinking trivial tasks and giving every prompt every section. Explicit triggers (o-1 to o-3, a-1 to a-3) make inclusion rules visible and testable, so optional components cannot become required by default. The evidence behind them is in Section 2 of the paper: decomposition helps non-reasoning models, explicit reasoning steps add little for reasoning models, and examples help when a format is easier to show than describe.

**Trade-off.** Triggers depend on context the request text rarely shows, such as the target model or a team's fixed format. The helper scripts take those as options (`--target-model`, `--vendor`, `--fixed-format`) rather than guess.

## Trade-off: overhead on simple tasks

CoMPaSS adds analysis time. The Tier 0 gate filters trivial requests, and the skill's description tells hosts not to load it for them. For requests that survive the gate, the overhead is the price of a mandatory definition of done (paper Section 9.1).

## Why the rules exist as data

`assets/component-table.json` holds the components, rules, triggers, tiers, and default section order. The helper scripts read it, the package validator checks its structure (C, o, M, P, a, S, S; uppercase letters mandatory), and tests compare its rule text with the paper. Documentation and tooling therefore share one source of rules.

## Why zero-dependency TypeScript helpers

The plan's stack is TypeScript on Node.js. Node.js 22.18+ runs TypeScript directly through type stripping, so the scripts run from an installed skill with no `npm install`: a skill should not need a build step to work. Development tooling (ESLint, Prettier, the TypeScript compiler) lives in the repository-root `package.json`, outside the skill folder, so it never ships with the skill. The scripts use only erasable syntax and `.ts` import paths to stay runnable that way.

The reference generator is Python (standard library only, 3.9+) as the plan specified; it is a maintainer tool, and Python's text handling suits section extraction.

**Trade-off.** Hosts without Node.js 22.18 cannot run the helpers. The method does not depend on them: SKILL.md says so, and every helper is optional.

## Why the helpers are heuristic, and say so

`analyze-requirement.ts` drafts an analysis card from keyword signals. Judging intention requires understanding, which a regular expression lacks; the helper surfaces signals (hedging, competing goals, decision questions, code context) and labels every field a draft to confirm. `validate-prompt.ts` checks structure only and prints that it cannot verify intention. Presenting either as more would contradict the skill's own rule against unverified claims.

## Why the evaluation harness never calls a model

`evaluate-skill.ts` validates suites and results against the pre-registered plan and computes its metrics, but runs are produced elsewhere. Model calls would tie the harness to vendors, credentials, and cost, while the plan requires three vendors. Separating execution from scoring keeps the scoring shared and reproducible (fixed-seed bootstrap) whichever tools teams use to run the models. The tests use clearly labelled synthetic data generated in memory, so no file in the repository can be mistaken for results.

## Repository layout versus skill layout

The skill lives at `skills/compass-prompt-framework/`, the default location Claude Code plugins and the Skills CLI scan. Repository-level files (README, docs, `.github`, plugin manifests, development tooling) stay outside it, so the skill folder can be zipped and uploaded as is. The release workflow does exactly that. Tests ship inside the skill, as the implementation plan specified, so an installed copy can verify itself.

## Deviations from the implementation plan

Where the plan's samples conflicted with current conventions, the conventions won:

| Plan sample | Implemented | Reason |
| :--- | :--- | :--- |
| `version`, `author`, `source`, `keywords`, `tags` as top-level frontmatter | Under `metadata`, plus `license` | The Agent Skills specification defines `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools`; unknown top-level fields can be rejected by hosts. |
| `plugin.json` with `type` and a `skills` array of objects | Standard manifest fields only, plus `marketplace.json` | Claude Code discovers `skills/` by default and strips unknown fields; the marketplace file enables `/plugin install`. |
| `actions/create-release@v1`, Node 18 | `gh release create`, Node 22/24 | The action is archived and Node 18 is end-of-life. |
| Jest-style tests | `node:test` with `node:assert` | No test-framework dependency; the same `describe`/`test` structure. |
| `@compass-prompt-framework` invocation in Claude Code | `/compass-prompt-framework` | Skills are invoked as slash commands. |
| Dual MIT/Apache wording in CONTRIBUTING | MIT only | The repository is licensed MIT; contributions follow the license. |
| `README.md` and `CONTRIBUTING.md` at the root, `bug_report.md` template | README at the root; CONTRIBUTING, SUPPORT, and YAML issue forms in `.github/` | Follows the structure of the author's earlier skill repository; YAML forms validate required fields. |
| Paper's counter-example numbered "Example 4" | "Counter-example", with the custom example as Example 4 | Avoids two Example 4s; the content is unchanged. |
