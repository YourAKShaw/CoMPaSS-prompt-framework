# Using the CoMPaSS skill

How to invoke the skill on each platform, the patterns it handles well, and what to do when it misbehaves. For the method itself, read [SKILL.md](../skills/compass-prompt-framework/SKILL.md).

## When to use it

| Use CoMPaSS | Use something simpler |
| :--- | :--- |
| A prompt or brief whose output is consequential: a decision memo, an announcement, a spec, a go-to-market brief | A factual question or a one-line task (Tier 0): ask directly |
| An agent or subagent brief for multi-step work, where shortcuts could hide the real problem | A request that already states purpose, audience, and format: ART or RTF |
| A request whose real purpose is implicit or ambiguous | Pure audience-facing copy with obvious intent: CO-STAR's separate style, tone, and audience fields |
| A prompt that needs an explicit definition of done | A task with a metric and labelled data: an automated optimizer such as DSPy or GEPA |
| Reviewing or restructuring an existing high-stakes prompt | A production agent system: system-level context engineering |

## Claude Code

After installation (see the [README](../README.md#-get-started)), invoke the skill directly:

```text
/compass-prompt-framework Write a brief for a subagent that will migrate our billing tables to the new schema.
```

Or describe the work and let Claude select the skill from its description:

```text
Use CoMPaSS to turn this request into an agent brief: "The checkout-service CI keeps failing on test_apply_discount at random. Fix it."
```

When installed as a plugin, the skill is namespaced: `/compass-prompt-framework:compass-prompt-framework`.

The optional helper scripts run where Node.js 22.18 or later is available. Claude can call them from the skill directory, or you can run them yourself:

```sh
node ~/.claude/skills/compass-prompt-framework/scripts/scaffold-prompt.ts "Should we move to ClickHouse?"
node ~/.claude/skills/compass-prompt-framework/scripts/validate-prompt.ts prompt.md
```

## Claude apps (claude.ai and desktop)

1. Download `compass-prompt-framework-<version>.zip` from the [latest release](https://github.com/YourAKShaw/CoMPaSS-prompt-framework/releases), or build it as the README describes. It contains one top-level `compass-prompt-framework/` folder with `SKILL.md` inside.
2. Enable **Code execution and file creation** under **Settings → Capabilities**. Organization accounts also need Skills enabled by an administrator.
3. Open **Customize → Skills**, select **+ → Create skill → Upload a skill**, and upload the ZIP.
4. Switch the skill on, then ask, for example: "Use CoMPaSS to write the prompt for our quarterly pricing decision memo."

## Claude API

Upload the skill folder once with the Skills API, then reference it in Messages API requests. Skills run inside the code execution container, so the request must include the code execution tool. See Anthropic's [Skills guide](https://platform.claude.com/docs/en/build-with-claude/skills-guide) for the current request shapes.

Upload with bash from the repository root (each file keeps its path under the skill folder):

```bash
cd skills
args=()
while IFS= read -r file; do
  args+=(-F "files[]=@${file};filename=${file}")
done < <(find compass-prompt-framework -type f -not -path '*/node_modules/*')
curl -X POST "https://api.anthropic.com/v1/skills" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  "${args[@]}"
```

Or with the TypeScript SDK, from the release ZIP:

```typescript
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import fs from "node:fs";

const client = new Anthropic();
const skill = await client.skills.create({
  files: [await toFile(fs.createReadStream("compass-prompt-framework-0.1.0-alpha.zip"), "compass-prompt-framework.zip")],
});
console.log(skill.id);
```

Use it in a request:

```json
{
  "model": "claude-opus-5-5",
  "max_tokens": 16000,
  "container": {
    "skills": [{ "type": "custom", "skill_id": "skill_...", "version": "latest" }]
  },
  "tools": [{ "type": "code_execution_20250825", "name": "code_execution" }],
  "messages": [
    { "role": "user", "content": "Use CoMPaSS to write an agent brief for: ..." }
  ]
}
```

Upload a new version with `POST /v1/skills/{skill_id}/versions` after each release; a version is a complete snapshot of the skill's files. Custom skills are visible to the whole workspace.

## Skills CLI and other agents

```sh
npx skills add YourAKShaw/CoMPaSS-prompt-framework
```

The CLI finds `skills/compass-prompt-framework/SKILL.md` and installs it for the agents you select. The method is model-agnostic; any agent that reads Agent Skills can follow it.

## Common patterns

**Agent brief.** Give the raw request and where the agent will work: "Use CoMPaSS to brief a subagent: [request]. The repo is at [path]; tests run with [command]." Expect pointers instead of pasted code, an order of operations with checkpoints when the work needs them, prohibited shortcuts in Scope, and executable checks plus a "not verified" report in the Success spec.

**Decision prompt.** Paste the data and state the decision. Expect criteria fixed before options are scored, an "Assumed intention" line if the decision might already be made, and a memo structure with consistency checks.

**Deliverable.** Name the audience and any known facts. Expect placeholders for unknowns rather than invented details, and a Success spec with length, tone, and checks before returning.

**Improve an existing prompt.** Paste the prompt and say what it is for. Expect a rewrite organised by component and a short list of what changed and why.

**Review a prompt.** Ask "Review this prompt against CoMPaSS." Expect mandatory gaps first, then optional-component and style findings, each with a fix. `validate-prompt.ts` gives the same structural checks offline.

## Troubleshooting

| Symptom | Likely cause | What to do |
| :--- | :--- | :--- |
| The skill does not activate | Not installed where the host looks, or the request did not match the description | Check the path ends in `compass-prompt-framework/SKILL.md`; invoke it by name |
| A trivial question got a full brief | The tier gate was not applied | Say "this is Tier 0", or ask directly; report it as a bug with the request |
| It asked questions when you expected a prompt | Intention confidence was rated low (rule C-2) | Answer the questions, or state the purpose up front ("…so that…") |
| The Mission states the wrong purpose | Misread intention, the failure mode CoMPaSS introduces | Correct the "Assumed intention" line; it is there to be corrected |
| Every prompt has steps and examples | Optional components included without triggers | Ask which trigger fired; remove sections whose trigger is "none" |
| `node: bad option` or a syntax error from a script | Node.js older than 22.18 | Upgrade Node.js; the scripts rely on built-in type stripping |
| `validate-prompt.ts` passes a poor prompt | It checks structure, not intent | Compare the Mission with the user's real goal yourself |

Still stuck? See the [support guide](../.github/SUPPORT.md).
