# Provisions (P) checklist

Provisions is mandatory. It holds the smallest set of high-signal context a capable newcomer would need. Include only context that changes the output.

```xml
<provisions>
- Audience: [who reads or uses the output]
- Facts: [what is known and relevant]
- Materials: [pasted data, or for agents pointers: file paths, commands, links]
- Tools: [tool notes, if the model or agent has tools]
- Perspective: [optional one line, when voice or perspective matters]
</provisions>
```

Checklist:

- [ ] **Facts:** only facts that change the output; nothing included merely because it is available.
- [ ] **Audience:** who will read or act on the output, when that shapes it.
- [ ] **Materials:** pasted data in its own nested tag (for example `<workload_data>`); for agents, *pointers* such as file paths and commands, for just-in-time retrieval, instead of pasted content.
- [ ] **Tool notes:** what the agent may run and how, when tools are available.
- [ ] **Unknowns:** every unknown fact is an explicit `[PLACEHOLDER]`, never an invented value.
- [ ] **Persona rule:** no "You are a world-class X" line. If perspective or voice matters, one *perspective line*, treated as a style lever, not an accuracy lever.
- [ ] **No overlap:** nothing here repeats Scope or Success spec.
