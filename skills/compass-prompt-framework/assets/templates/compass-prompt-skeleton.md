# CoMPaSS prompt skeleton

Assemble sections in this default order (CoMPaSS step 11). Delete `<order_of_operations>` and `<anchors>` unless an inclusion trigger fired on the analysis card; do not leave them empty. XML tags are a convention, not a requirement: Markdown headings in the same order work too, and no layout is proven optimal across models.

```xml
<mission>
[What to produce or decide], so that [why].
Assumed intention: [only when intention confidence is medium]
</mission>

<provisions>
- [Minimal high-signal facts, audience, materials or pointers, tool notes]
- [Unknowns as explicit [PLACEHOLDERS]]
- [Optional single perspective line]
</provisions>

<order_of_operations>
1. [Only when o-1, o-2, or o-3 fires]
2. [Checkpoint or pause condition, for agents]
</order_of_operations>

<anchors>
<template note="Format only. Do not reuse its content.">
[Only when a-1, a-2, or a-3 fires: one labelled template, or 3–5 diverse examples]
</template>
</anchors>

<scope>
- [Boundaries, non-goals, prohibited shortcuts, limits]
- [Assumption policy]
</scope>

<success_spec>
Output: [format, sections, length, tone].
Before returning, check: (1) [...], (2) [...], (3) [...].
</success_spec>
```

Run the prompt, compare the output against the Success spec, and revise only the component that failed (CoMPaSS step 12).
