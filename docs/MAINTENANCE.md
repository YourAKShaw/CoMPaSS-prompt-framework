# Maintenance roadmap

## Ownership

The skill is owned and maintained by its author, Ayush Kumar Shaw ([@YourAKShaw](https://github.com/YourAKShaw)). There is no team handoff; this document is the maintainer's working plan, kept public so contributors know what to expect.

## Current status

- **Version:** 0.1.0-alpha
- **Status:** research-grade and untested. Not recommended for production use until the [evaluation plan](EVALUATION.md) (paper Section 9.2) has been run.
- **Source of truth:** `metadata.version` in [SKILL.md](../skills/compass-prompt-framework/SKILL.md). [`plugin.json`](../.claude-plugin/plugin.json) and [`package.json`](../package.json) must match it; a test enforces this.

## Release plan

| Version | Target | Scope |
| :--- | :--- | :--- |
| **0.1.0-alpha** | October 2026 | Initial package: skill, references, assets, helpers, tests, distribution. |
| **0.1.0** | November 2026 | Initial release after validation with the first 5–10 users; fixes from their feedback. |
| **0.2.0** | Q1 2027 | First evaluation-plan runs; guidance changes driven by observed failures; community examples. |
| **1.0.0** | June 2027 | Evaluation complete and published; production-ready status only if the results support it. |

Dates are targets, not commitments. If the evaluation does not support the primary hypothesis, 1.0.0 will say so and reposition the technique rather than claim production readiness.

## Known gaps

- [ ] The evaluation plan (paper Section 9.2) has not been run.
- [ ] Layout optimization is not benchmarked; Sclar et al. show format sensitivity across models, so the section order is a default.
- [ ] Persona guidance conflicts with vendor guidance: independent studies (Zheng et al., Basil et al.) versus Anthropic's role-prompting advice. See the paper's [verification table](../skills/compass-prompt-framework/references/compass-paper.md#3-verification-of-the-starting-claims).
- [ ] The helper scripts use keyword heuristics for tier, confidence, and trigger detection; they are drafting aids, not classifiers.
- [ ] Positioning for agent engineering is an assumption; validate it with the first users before 1.0.0.

## Maintenance plan (first 12 months)

**Months 0–2 (launch):** monitor for bugs and fix them quickly; respond to issues and pull requests within 48 hours; gather feedback from early users, especially requests where the tier or ambiguity gate misfired.

**Months 3–6 (stabilization):** fold user feedback into the documentation and the component reference; run the evaluation plan internally if resources allow; plan 0.2.0 from what was learned.

**Months 7–12 (roadmap execution):** release 0.2.0 with any evaluation results and community examples; plan the 1.0.0 release; coordinate with other YourAKShaw products (NayaManas, Tantrav) for cross-promotion.

## Success metrics

- The skill is discoverable and installable in Claude Code, the Claude apps, and through the API.
- At least 50 external uses documented (issues, pull requests, stars, or reported installations).
- At least one external team has run the evaluation plan.
- 1.0.0 is released with a clearly stated, evidence-based status.
- Zero false claims about testing or performance in any documentation.

## Routine tasks

| When | Task |
| :--- | :--- |
| Every change | `npm run check`; keep SKILL.md, the component table, and the component reference consistent. |
| A rule changes | Update all three, the templates, and any example that demonstrates the rule; re-run the paper-consistency tests. |
| The paper is revised | Add the revision as a new file; never edit `compass-paper.md` (its SHA-256 is pinned). Update the generator if extracts should change source. |
| Weekly | Review Dependabot updates for the pinned GitHub Actions. |
| Monthly | Review Dependabot updates for dev tooling. |
| Agent Skills specification changes | Check the [specification](https://agentskills.io/specification) and update the manifest and `validate-skill.ts` deliberately. |
| A release | Follow the release steps in [CONTRIBUTING.md](../.github/CONTRIBUTING.md#-releases-maintainers). |

## Versioning

- Semantic versioning: MAJOR.MINOR.PATCH, with pre-release suffixes such as `-alpha` while the technique is untested.
- Breaking changes include renaming a component, a section tag, a trigger id, or a helper script flag, and removing a template or reference.
- Releases are tagged `vX.Y.Z` (for example `v0.1.0-alpha`, `v1.0.0`); the release workflow refuses a tag that does not match SKILL.md.

## Distribution channels

- **GitHub:** clone, download, or the release archives.
- **Claude Code:** `/plugin marketplace add YourAKShaw/CoMPaSS-prompt-framework`, or a personal or project skill installation.
- **Claude apps:** upload the release ZIP under **Customize → Skills**.
- **Claude API:** upload to `/v1/skills`; see the [usage guide](SKILL-USAGE.md#claude-api).
- **Mirrors:** if GitHub is unreachable in a region, publish a GitLab mirror and list it here.

See [CONTRIBUTING.md](../.github/CONTRIBUTING.md) for the pull request process.
