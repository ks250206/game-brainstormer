# Game Brainstormer — contributor instructions

Use Node 26, pnpm 12, Vite Plus, React 19, Meta Astryx and @xyflow/react 12.
Do not replace the requested main stack with a different framework.

1. Read README.md, DATA_SOURCES.md and docs/VERIFICATION.md before changing scope.
2. Preserve all 429 tag IDs, 203 mechanic IDs and their provenance. Do not invent tags
   to reach 500; 500 is the number of prior fusion examples.
3. Keep src/core independent of React/browser rendering. Test model changes with
   `pnpm test`. A renderer must not generate different game-design semantics.
4. Before using an unfamiliar Astryx component, use the installed scoped CLI:
   `pnpm exec astryx component Button` / `pnpm exec astryx component --list`.
   Use the built theme and prebuilt CSS; do not guess component props.
5. Run `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.
   The initial handoff did not execute dependency-backed builds; fix actual failures
   before claiming the React application is verified.
6. `pnpm build` includes prerendering. `vp build` alone is not the full SSG pipeline.
7. Keep docs/images/workspace.png labelled as a portable-renderer screenshot. Put
   verified main-renderer images under docs/images/react-*.png and update captions.
8. Imports must validate and merge, never silently overwrite an existing workspace.
   Keep user strings as text; never eval or inject unescaped imported markup.
9. No cloud API/telemetry/LLM calls without explicit user opt-in. Do not present
   heuristic prompt generation or manual ratings as AI evaluation or market evidence.
10. Generate data through scripts/prepare-data.py. Check counts/references afterward.
11. Commit the genuine generated pnpm lockfile on the first successful install.
12. License: MIT, Copyright (c) 2026 ks250206. Preserve third-party attribution boundaries.
