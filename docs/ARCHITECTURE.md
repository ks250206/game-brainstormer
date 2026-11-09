# Architecture

## Shared model, two honest renderers

The canonical document is `Workspace` (schemaVersion 1): boards, cards, relationships,
viewports, favorites and saved recipes. There is no server-side state.

`src/core` knows nothing about React, Astryx, DOM layout or network services. The
`WorkbenchStore` exposes immutable workspace updates and a stable external-store
snapshot. The React implementation consumes it through `useSyncExternalStore`;
the portable renderer uses the same subscription API.

### Main renderer

- React 19, Astryx Theme/neutral/Button, prebuilt Astryx styles.
- React Flow 12: custom typed cards, connection handles, selection, pan/zoom and minimap.
- Generated HTML contains the full application chrome and an escaped SVG board.
- Client hydration initially renders the identical static tree, then mounts React Flow.
- `base: './'` makes emitted asset URLs relative. There is one route, so no rewrite rule is needed.

### Portable renderer

- Native DOM and SVG. No React, Astryx or React Flow runtime is included.
- Uses the same catalog, pure engine, store and visual stylesheet.
- Build-time TypeScript transpilation of our own four modules only; not a general JS bundler.
- Entire catalog and implementation inline in one HTML, no fetch/import/CDN/font request.
- Used to provide a runnable artifact and inspect the UX in the restricted build environment.

The second renderer is an explicit fallback, not a claim that the requested stack
was installed or its browser tests executed.

## Design catalog

Eleven clusters, each answering one design question (verbs, decisions, puzzles, systems,
progression, structure, feeling, players, setting, presentation, format). Every tag
receives one explicit primary category and subgroup, plus optional secondary facets.
Materials retain original IDs and rank. Mechanics retain the original chapter and
also participate in semantic clusters. Search is Unicode-normalized lexical AND
search across labels, aliases, IDs and category names, not vector similarity.

The taxonomy is encoded in `scripts/prepare-data.py`. Generation validates unique
coverage of all 429 tags and emits the same JSON to `src/data` and `public`.
Editorial notes in `data/editorial/*.psv` add a summary, illustrative works and Caillois
weights (`play`: agon/alea/mimicry/ilinx, 0-3) to every material; generation fails if any
tag or mechanic is missing or malformed.

## Two separate map components

They answer different questions and share no position data.

**1. Caillois map (`src/core/caillois.ts`, `PlayMap.tsx`).** Agon, alea, mimicry and ilinx
are treated as four independent 0-3 intensities, not exclusive classes or opposite poles:
every card is drawn on all four scales at once, plus a separate paidia ↔ ludus scale
(`ludus`, `data/editorial/ludus.psv`). A hypothesis averages its materials. The core
computes per-element board averages, how many cards clearly contain each element, the
six pairwise co-occurrences (with Caillois' own notes on each pairing), weak elements
(average < 1) and deterministic suggestions that add an element without requiring it to
be the only one. Positions come from catalog data only; nothing is stored.

**2. Two-axis, four-quadrant map (`src/core/quadrant.ts`, `QuadrantMap.tsx`).** A
general positioning map shown in place of the whiteboard (`UIState.view`). The designer
picks axis labels and quadrant names (presets or custom) and places cards by hand.
Stored per board as optional `board.quadrant` (`preset`, `x`, `y`, `names[4]`,
`positions{nodeId: {x,y}}` in [-1, 1]); additive to schemaVersion 1, validated on import
(known non-frame cards only, finite ranges, four names), pruned when cards are deleted,
undoable, and listed per quadrant in the Markdown export. Nothing is inferred from data.

## Cascade layers

Astryx ships its CSS in `@layer reset, astryx-base, astryx-theme`. Unlayered rules beat
every layer, so the app's element resets (`button`, `input`, `a`…) live in
`@layer reset`; app-specific classes stay unlayered. Without this, an unlayered
`button{background:none}` erased Astryx's primary Button fill and SegmentedControl
selection.

## Theme

Every literal colour in `src/styles.css` is a `light-dark(light, dark)` pair. Astryx
`Theme mode` syncs `<html data-theme>` (light | dark, absent = system); an inline script
in `index.html` applies a stored choice before first paint. React Flow receives the same
`colorMode`. The preference is a renderer setting in localStorage, not workspace data.

## Reactions

Five deterministic operators: translate, constrain, invert, delay, exchange roles.
Detailed rules exist for selected mechanics; other mechanics use chapter-level
prompts. Relevant curated examples are only offered for a platformer base.
A result is a working hypothesis with rule, example, minimum experiment, risk,
question and provenance. No model inference and no automatic quality scoring.

## Interaction and history

Content mutations take workspace snapshots (up to 50); a drag is one transaction.
Viewport updates do not create undo entries. Import adds boards instead of replacing
the document. Duplicated cards get new IDs and internal connections are remapped.
Deleting nodes removes incident connections. Frames are visual outlines, not parents.

## Storage and safety

JSON imports are limited to 5 MB, 40 boards, 1,000 cards per board and 2,000 connections
per board. Types, finite numeric ranges, enums, catalog references and edge endpoints
are validated against a whitelist. Prototype fields and foreign renderer state are
not adopted. Text is rendered by React or escaped before DOM/SVG serialization.

Persistence uses one versioned localStorage key. A failed restore never overwrites
unreadable existing data. Download/export remains available if storage is blocked.
No telemetry, online collaboration, external API keys or cloud synchronization.

## Extension points

- Replace the discovery heuristic with a precomputed embedding-derived secondary facet
  map, retaining transparent labels and a manual override layer.
- Add a model adapter behind an explicit opt-in; never send boards silently.
- Add real group parenting/movement separately from visual comparison frames.
- Extend schema versions with migration tests before persisting new structures.
