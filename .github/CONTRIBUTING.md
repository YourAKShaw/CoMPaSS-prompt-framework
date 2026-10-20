<div align="center">

# 🤝 Contributing to CoMPaSS

**Help make analysis-first prompting clearer, more honest, and easier to test.**

[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-2563EB?style=flat-square)](https://github.com/YourAKShaw/CoMPaSS-prompt-framework/pulls)
[![Node.js 22.18+](https://img.shields.io/badge/Helpers-Node.js%2022.18%2B-334155?style=flat-square)](../skills/compass-prompt-framework/scripts/validate-skill.ts)
[![Conventional Commits](https://img.shields.io/badge/Conventional-Commits-334155?style=flat-square)](https://www.conventionalcommits.org/en/v1.0.0/)
[![License: MIT](https://img.shields.io/badge/License-MIT-2563EB?style=flat-square)](../LICENSE)

[Project overview](../README.md) · [Skill entry point](../skills/compass-prompt-framework/SKILL.md) · [Get help](SUPPORT.md)

</div>

---

## Start with the prompting problem

CoMPaSS is an Agent Skill that teaches and applies an analysis-first prompting technique. The package contains the skill entry point, the immutable research paper and its generated extracts, a component reference, templates and examples, zero-dependency helper scripts, and tests. Contributions should improve the prompts an agent builds and the honesty of what the project claims.

We welcome:

- A real requirement where CoMPaSS misread the user's intention, or added overhead a simpler framework would have avoided.
- A clearer rule, trigger, template, or common-mistake entry, grounded in the paper or a primary source.
- Better examples, including examples in your own domain.
- Fixes to the helper scripts, validators, generator, or tests.
- **Runs of the [pre-registered evaluation plan](../skills/compass-prompt-framework/references/evaluation-plan.md)**, with results reported as observed, whichever way they point.

Read [SKILL.md](../skills/compass-prompt-framework/SKILL.md), the [component reference](../skills/compass-prompt-framework/references/component-reference.md), and the affected files before changing guidance.

## 🧭 Choose the right starting point

| Contribution | Where to begin |
| :--- | :--- |
| Small correction or focused fix | Open a pull request with the problem and your verification. |
| Bug, missing guidance, or documentation issue | Search existing issues, then use the matching [issue form](https://github.com/YourAKShaw/CoMPaSS-prompt-framework/issues/new/choose). |
| A change to a rule, trigger, or the component architecture | Open an improvement issue first with the use case, trade-offs, and proposed scope. |
| An evaluation run | Follow [docs/EVALUATION.md](../docs/EVALUATION.md) and use the evaluation-run form. |
| Usage question | Follow the [support guide](SUPPORT.md). |

Use sanitized examples. Remove credentials, private prompts, customer data, and personal information before posting publicly.

## Make a focused change

1. Fork the repository and create a branch from `main`: `feat/…`, `fix/…`, `docs/…`, or `test/…`.
2. Install the development tooling with Node.js 22.18 or later: `npm ci`.
3. Make the smallest coherent update that addresses the problem.
4. Run `npm run check` and inspect the complete diff.
5. Open a pull request against `main` describing the final change and its evidence.

`main` stays releasable. Pull requests need review before merge, and each commit should be one logical change.

### Keep the package coherent

| Principle | What to preserve |
| :--- | :--- |
| **The paper is immutable** | Never edit [`references/compass-paper.md`](../skills/compass-prompt-framework/references/compass-paper.md); a test pins its SHA-256. Publish a revision as a new file. |
| **Generated files are generated** | The literature summary, positioning, limitations, evaluation plan, paper examples, and worked examples come from [`generate-references.py`](../skills/compass-prompt-framework/scripts/generate-references.py). Change the generator or the custom example, then run `npm run references:generate`. |
| **One set of rules** | A rule lives in SKILL.md, the [component table](../skills/compass-prompt-framework/assets/component-table.json), and the component reference. Change them together; tests compare them with the paper. |
| **No invented evidence** | CoMPaSS is untested. Do not claim it beats another framework, and do not add benchmark numbers that did not come from a documented run. |
| **Method, not tricks** | Keep guidance model-agnostic. Model or vendor specifics belong only in the o and a triggers that already name them. |
| **Proportional process** | New rules need a concrete failure they prevent. Guard against framework creep: Tier 0 must stay cheap. |
| **Progressive disclosure** | Keep SKILL.md under 500 lines; put depth in `references/` and link it so the validator can reach it. |

## 🔍 Validate your change

From the repository root:

```sh
npm run check
```

That runs, in order:

| Command | What it checks |
| :--- | :--- |
| `npm run validate` | The package validator: manifest fields, required files, the component table, local links and anchors, reachability from SKILL.md, symlinks, empty or unfinished files. |
| `npm run references:check` | Generated extracts match the paper and the custom example (Python 3.9+, standard library only). |
| `npm test` | The C stage, prompt validity, end-to-end application, paper consistency, the evaluation harness, the package validator, and version agreement. |
| `npm run lint` | ESLint, Prettier for code and configuration, and the TypeScript typecheck. |

To check the plugin manifest with Claude Code installed, also run `claude plugin validate .`.

**Package checks and behavioral evidence answer different questions.** Passing them shows the package is well-formed and consistent with the paper. It does not show that CoMPaSS prompts work better. The validators do not check GitHub form schemas or workflow behavior; inspect `.github` changes separately.

### When you change guidance

Describe a representative requirement, the host and model, the prompt the skill produced, and what you observed. Good scenarios exercise the gates: a Tier 0 question that must stay cheap, a medium-confidence request that needs an "Assumed intention" line, a low-confidence request that must trigger questions, and an agentic task that needs checkpoints. Compare against a baseline before making any comparative claim, and report only what you observed.

## ✍️ Code and documentation style

- **TypeScript:** erasable syntax only (Node.js runs it through type stripping), `.ts` import extensions, no runtime dependencies. `npm run format` applies Prettier.
- **Python:** standard library only, Python 3.9 compatible.
- **Markdown:** hand-authored and not reformatted by Prettier. Use clear headings, inline relative links (reference-style links fail validation), and sentence-case headings.
- **Claims:** label proposals as proposals, keep citations, and prefer primary sources.

## 📝 Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), one logical change each:

```text
<type>(<scope>): <lower-case imperative subject, 10–50 characters>

<Why the change was needed, then what changed; 2–6 lines wrapped at 72.>

Breaking: none
Co-Authored-By: Claude Code <noreply@anthropic.com>
```

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Scopes:** `skill`, `references`, `assets`, `examples`, `scripts`, `tests`, `docs`, `plugin`, `github`, `tooling`, `git`, `license`, `changelog`, `release`.
- **Breaking changes:** replace `Breaking: none` with a `BREAKING-CHANGE:` trailer and add `!` to the header. Renaming a component, tag, or script flag is breaking.
- **AI-assisted commits** end with exactly the trailer above. It is this repository's one recorded agent trailer: keep it byte for byte, and omit it only for commits with no AI involvement.

Examples:

```text
feat(examples): add worked example for API design briefs
fix(references): correct citation number in literature extract
docs(docs): explain the Comprehend mandate
test(tests): cover Tier 2 checkpoint scaffolding
```

## 🚀 Releases (maintainers)

1. Update `metadata.version` in SKILL.md, `version` in [`plugin.json`](../.claude-plugin/plugin.json) and `package.json` (a test requires them to match).
2. Move the `Unreleased` notes in [CHANGELOG.md](../CHANGELOG.md) under the new version and date.
3. Commit with `chore(release): prepare vX.Y.Z`, merge to `main`, then tag: `git tag -a vX.Y.Z -m "Release X.Y.Z"` and `git push origin vX.Y.Z`.
4. The [release workflow](workflows/release.yml) runs every check, verifies the tag matches SKILL.md, and publishes the CHANGELOG section with a skill zip, tarball, and checksums. Versions with a pre-release suffix are marked as pre-releases.

## 📊 Evaluation contributions

If you run the evaluation plan:

1. Follow the pre-registered protocol exactly, or document every deviation.
2. Validate your data with `evaluate-skill.ts validate-results` and generate the report with `evaluate-skill.ts report`.
3. Open an evaluation-run issue with the output; maintainers will add accepted runs to `docs/EVALUATION_RESULTS.md` with the date, models, metrics, and your attribution.

## 📬 Open a reviewable pull request

Use the [pull request template](pull_request_template.md) to explain:

- **Problem and outcome:** what failed or was unclear, and what the change improves.
- **Scope:** affected components, files, and related issues.
- **Verification:** exact commands and results, plus scenario observations for guidance changes.
- **Risks and limits:** trade-offs, compatibility implications, and checks not run.

Keep the discussion respectful. Address the change rather than the contributor, and use concrete requirements and prompts when explaining a disagreement.

## Licensing

By contributing, you agree that your contributions are licensed under the repository's [MIT License](../LICENSE).
