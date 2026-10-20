# Security policy

## Supported versions

CoMPaSS is pre-1.0 and research-grade. Security fixes land on `main` and ship in the next tagged release; only the latest release receives them.

| Version | Supported |
| :--- | :--- |
| Latest release (`0.1.x`) | ✅ |
| Older releases | ❌ |

## Scope

The package is an Agent Skill: instructions in `SKILL.md`, reference material, and small TypeScript and Python helpers with no runtime dependencies. In scope:

- Guidance that could lead an agent to leak secrets, credentials, or private files, or to run unsafe commands.
- Guidance that makes prompt injection easier or makes an agent ignore the user's intent.
- Flaws in the helper, validator, evaluation, or generator scripts, such as unsafe file handling or command execution.
- Weaknesses in this repository's workflows, release packaging, or plugin manifests.

Out of scope: vulnerabilities in Claude or other models, agent hosts, the Skills CLI, or third-party dependencies. Report those to their maintainers. Prompt-quality problems that carry no security impact belong in a regular [issue](https://github.com/YourAKShaw/CoMPaSS-prompt-framework/issues/new/choose).

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report it privately through GitHub's [private vulnerability reporting](https://github.com/YourAKShaw/CoMPaSS-prompt-framework/security/advisories/new). Include:

1. A description of the issue and its impact.
2. Steps, a prompt, or a file that reproduces it, sanitized of personal data.
3. The release or commit you tested, plus your host, model, and Node.js or Python version where relevant.

## Response times

- **Acknowledgement:** within 3 business days.
- **Initial assessment:** within 7 days.
- **Fix or mitigation:** as soon as practical, usually within 30 days for confirmed issues.

You will be kept informed of progress and credited in the release notes unless you prefer to stay anonymous.
