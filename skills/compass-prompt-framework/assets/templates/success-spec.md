# Success spec (S) template

Success spec is mandatory and has two parts: the output shape and the verification checks. Never collapse it into a vague instruction such as "make it good".

```xml
<success_spec>
Output: [format], [sections in order], [length], [tone].
Before returning, check: (1) [checkable condition], (2) [checkable condition],
(3) [checkable condition].
</success_spec>
```

For agents, make the checks executable and require a report:

```xml
<success_spec>
Done means all of the following are true and reported:
1. [Executable check, with the command or threshold]
2. [Executable check]
3. [Report of what was and was not verified]
Return: [the artifacts and evidence to hand back].
</success_spec>
```

Checklist:

- [ ] **Output shape:** format, sections, length, and tone are stated.
- [ ] **Machine-consumed output:** schema enforcement belongs at the API layer (structured outputs or tool schemas), not in prose.
- [ ] **Reasoning-heavy output that needs structure:** reasoning first, formatting second (Tam et al., 2024).
- [ ] **Verification checks:** concrete conditions that can be checked before returning, introduced with "Before returning, check:" or "Done means".
- [ ] **Agents:** executable checks plus a report of what was and was not verified.
- [ ] Every check traces back to the Mission or a Scope rule.
