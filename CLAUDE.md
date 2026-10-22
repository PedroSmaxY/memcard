# Claude Code Instructions

Please refer to [AGENTS.md](./AGENTS.md) for the complete operational manual, architecture guidelines, and engineering invariants of the **MemCard** project.

Key rules to follow at all times:
- Spec-First Development (check `/specs` before modifying features).
- Never overwrite active saves without creating a verified local snapshot.
- Respect the Game Running Guard and Zero-Byte Shield.
- Maintain 100% English across all code, tests, and documentation.
- Add `Co-authored-by: Claude <noreply@anthropic.com>` to git commit trailers.
