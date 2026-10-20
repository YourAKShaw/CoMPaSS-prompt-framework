# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The `metadata.version` field in [`SKILL.md`](skills/compass-prompt-framework/SKILL.md) is the source of truth; [`plugin.json`](.claude-plugin/plugin.json) and [`package.json`](package.json) must match it, and a test enforces that.

CoMPaSS is a research-grade proposal. No release reports benchmark results until the [pre-registered evaluation plan](skills/compass-prompt-framework/references/evaluation-plan.md) has been run.

## [Unreleased]

## [0.1.0-alpha] - 2026-10-20

Initial research-grade release.

### Added

- `compass-prompt-framework` Agent Skill: `SKILL.md` with the seven CoMPaSS components, the C-1 to C-4 rules, the o and a inclusion triggers, the 12-step procedure, paper Examples 1–3 verbatim, a custom Example 4, and the Tier 0 counter-example.
- References: the immutable CoMPaSS paper, a per-component reference, and generated, self-contained extracts (literature summary, positioning versus other frameworks, limitations, pre-registered evaluation plan, consolidated worked examples).
- Assets: a machine-readable component table, the tier decision tree, the Comprehend analysis card, Mission, Provisions, Scope, and Success spec templates, a full prompt skeleton, and four example walkthroughs.
- Zero-dependency TypeScript helpers for Node.js 22.18+: analysis-card drafting, prompt scaffolding, prompt structure validation, an evaluation-plan harness, and a package validator; a Python reference generator with a drift check.
- Tests for the C stage, prompt validity, end-to-end application, paper consistency, the evaluation harness, and the package validator.
- Claude Code plugin and marketplace manifests, CI, release, and documentation-site workflows, issue forms, a pull request template, and contributor documentation.

[Unreleased]: https://github.com/YourAKShaw/CoMPaSS-prompt-framework/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/YourAKShaw/CoMPaSS-prompt-framework/releases/tag/v0.1.0-alpha
