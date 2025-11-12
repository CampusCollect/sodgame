# Limitations & Risk Register

| Risk | Impact | Likelihood | Mitigation Now | Owner / Next Step |
|------|--------|------------|----------------|-------------------|
| Systems beyond the scaffold are stubbed | High | High | Ship modular placeholders with clear TODOs | Expand each director per roadmap |
| Research documentation incomplete | Medium | High | Create section headers + backlog | Fill out studies before implementing each system |
| No automated gameplay tests yet | Medium | Medium | Maintain manual smoke steps, plan Vitest harness | Add integration tests when mechanics land |
| npm registry access restricted in container | Medium | High | Document issue, rely on cached deps/CI mirror | Configure private registry or vendored tarballs |

## Known Gaps
- Mega-spec mechanics (crafting, advanced AI, factions, etc.) are not yet ported – this milestone focuses on architecture reset.
- Asset pipeline (sprites, audio) not wired; demo uses simple vector rendering.
- Save/load, networking, and persistence are unimplemented.

Each milestone must update this register with fresh risks and mitigation status.
