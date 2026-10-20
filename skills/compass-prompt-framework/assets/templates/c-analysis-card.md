# Comprehend: User Requirement Analysis

Fill this card before writing any prompt (CoMPaSS step 2). It is a working note for the prompt author, person or model. **Do not paste it into the prompt** (rule C-3); the section map at the bottom says where each answer goes.

**Raw requirement (verbatim):**
[Paste exactly what the user said, including any attached materials.]

**Analysis:**

| Field | Answer |
|---|---|
| **Action** | What is the user doing right now? |
| **Intention** | Why are they doing it? What outcome in the world do they want? |
| **Deliverable / Decision** | What artifact or decision must exist at the end? |
| **Efficient path** | What is the cheapest route that reliably gets there? Name what can be skipped (research, examples, steps) as well as what must be done (rule C-4). |

**Control fields:**

- **Tier:** 0 = trivial | 1 = single-turn artifact or decision | 2 = multi-step / agentic
- **Intention confidence:** High / Medium / Low
  - **Strongest alternative reading:** [State it, and why it was rejected or kept open.]
  - **If Low:** Clarifying questions [list up to 3]
  - **If Medium:** Assumed intention: [state it; it goes into Mission as an "Assumed intention:" line]

**Optional components:**

- **o (order of operations):** Include / Omit. Trigger: [o-1 sequence is a requirement | o-2 non-reasoning model on a multi-step reasoning task | o-3 agent needs checkpoints | none]
- **a (anchors):** Include / Omit. Trigger: [a-1 format, voice or labelling easier to show than describe | a-2 fine-grained classification | a-3 vendor recommends examples by default | none]

**Decision:** [Proceed / Ask clarifications / Stop (Tier 0)]

## Where each answer goes (rule C-3)

| Card field | Prompt section |
|---|---|
| Action, Intention | Mission |
| Deliverable / Decision | Mission and Success spec |
| Efficient path | Whether o and a are included, and what goes into Provisions |
| Assumed intention (medium confidence) | Mission, as an explicit "Assumed intention:" line |
