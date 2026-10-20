# Mission (M) template

Mission is mandatory and comes first among the prompt sections, so the model reads the purpose before the details. Write one or two sentences: the deliverable or decision, and the intention behind it.

```xml
<mission>
[Produce / Decide] [the deliverable or decision from the analysis card], so that
[the intention: the outcome in the world the user wants].
Assumed intention: [only when intention confidence is medium (rule C-2): the reading
you are acting on, and what to do if the evidence contradicts it].
</mission>
```

Checklist:

- [ ] States *what* to produce or decide, taken from the card's Deliverable / Decision field.
- [ ] States *why*, taken from the card's Intention field, not only the Action.
- [ ] One or two sentences, plus an "Assumed intention:" line only when rule C-2 requires it.
- [ ] Names a failure the user would reject when that sharpens the goal, for example "A fix that only hides the flakiness is a failure."
- [ ] Contains no persona line and no pasted analysis card (rule C-3).
