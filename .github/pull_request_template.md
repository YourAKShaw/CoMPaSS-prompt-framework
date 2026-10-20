## What changed and why?

<!-- Describe the problem and the resulting behavior. Link related issues; use "Closes #123" only when this PR resolves the issue. -->

## Verification

<!-- List the commands or scenarios you actually ran and their results. Explain any check not run. For guidance changes, include a representative requirement, the prompt the skill produced, and what you observed. -->

## Risks or compatibility

<!-- Note changed rules or triggers, host or model assumptions, and limitations. Write "None identified" when appropriate. -->

## Checklist

- [ ] The change is focused, and SKILL.md, the component table, the component reference, templates, and examples remain consistent.
- [ ] I ran `npm run check` (package validator, reference drift check, tests, and lint) and recorded the result above.
- [ ] I did not edit `references/compass-paper.md`; generated files were regenerated with `npm run references:generate`, not edited by hand.
- [ ] Commits follow Conventional Commits with the recorded `Co-Authored-By` trailer where an agent contributed.
- [ ] Examples contain no secrets or private information, and no claim of measured CoMPaSS performance appears without a run of the evaluation plan.
