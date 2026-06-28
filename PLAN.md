# BoardHub - Master Plan

BoardHub is a free, self-hostable board game platform for Vietnamese players. It is
architected as a hub: a shared platform (accounts, lobby, real-time tables, chat,
profiles) plus a pluggable game SDK so new games drop in over time. Launch games:
Oxono and Collect.

## Product principles

- Minimalist visual language. No gradients. No drop-shadow "glow". Flat surfaces,
  honest borders, generous spacing, one restrained accent color.
- No em dash or en dash in any copy or UI text. Use commas, parentheses, or rewrite.
- Vietnamese-first copy, clean and direct.
- Responsive from 320px phones up to wide desktops. Touch and mouse both first class.
- Hand-built rendering. SVG and CSS only. No 3D engines, no heavy canvas frameworks.
- Local-first. Runs fully offline on a LAN or Tailscale IP with zero cloud services.

## Tech stack

- Monorepo with pnpm workspaces. TypeScript everywhere. ESM.
- packages/shared: protocol types, constants, pure utilities.
- packages/engine: game SDK (GameDefinition contract) plus Oxono and Collect, with
  deterministic, unit-tested reducers and hidden-information player views.
- apps/server: Fastify 5 REST API plus Socket.IO real-time. Authoritative game host,
  room/table manager, lightweight auth (guest + account), pluggable persistence
  (file-backed JSON by default, Postgres/Supabase adapter via DATABASE_URL).
- apps/web: React 18 + Vite + React Router + React Bootstrap + Bootstrap 5. No Tailwind.
  Socket.IO client. Custom flat theme. SVG board renderer.
- Tooling: Vitest for engine tests, tsx for server dev/run, ESLint optional.

## Architecture

```
apps/web  <--- HTTP (REST: auth, profile, tables) --->  apps/server
   |                                                          |
   |  <--------- Socket.IO (real-time game + chat) ---------> |
   |                                                          |
   '------ imports types only -----.            .--- imports ----> packages/engine
                                   v            v                       |
                            packages/shared (protocol, types) <---------'
```

- The server is the single source of truth for live game state. Clients send actions,
  server validates with the engine, mutates state, and broadcasts per-player views.
- Each game is a GameDefinition: meta, setup, validate, reduce, isTerminal, getResult,
  view (per-player visibility), and an optional bot for fill-in opponents.

## Game rules

### Oxono (2 players, faithful clone)
- 6x6 board. Two shared totems: Totem-X and Totem-O, starting near the center.
- Turn: pick a totem, slide it any distance orthogonally along its row or column over
  empty cells. Then place one of your pieces of the totem's symbol on a free cell
  orthogonally adjacent to the totem.
- If the chosen totem cannot slide (all four neighbors occupied) it may jump in a
  straight line over contiguous occupied cells to the first free cell.
- If after moving there is no free orthogonal neighbor, place your piece on any free cell.
- Win: align 4 in a row (horizontal or vertical, never diagonal) of the same color
  OR the same symbol. Opponent pieces may complete a symbol line. Board full with no
  line is a draw.

### Collect (2 to 6 players, BoardHub original animal set-collection)
- Deck of animal cards across 8 species, each species worth a base value.
- Shared face-up Meadow of 5 cards. Each player has a private Hand and a public Collection.
- Turn: one action. Gather (take a Meadow card, refill), Collect (lock a set of 3+ same
  species from hand into Collection), or Forage (discard 2 to draw 2 from deck).
- End when the deck is exhausted and the Meadow empties, or a player locks their 4th set.
- Score: each locked set scores baseValue(species) * setSizeBonus. Highest total wins.

## Pages and features

- Landing: what BoardHub is, game catalog, how to connect over LAN/Tailscale, CTA.
- Auth: guest play and registered accounts (username + password). JWT cookie session.
- Lobby: list of open tables, quick join by code, create table modal, filters.
- Game catalog: per game cards with rules and "create table".
- Table room: pre-game seats, ready toggles, options, chat, then live board + move log.
- Live game: SVG board (Oxono) or card table (Collect), legal-move hints, turn timer,
  rematch, spectators, in-game chat.
- Profile: avatar, stats, match history, per-game records.
- Settings: display name, theme (light/dark), sound toggle.
- Connect help: how to reach the host over LAN/Tailscale IP from phone or PC.

## Delivery phases

0. Scaffold workspace, configs, plan, repo, CI-less local toolchain.
1. shared protocol + engine SDK + Oxono engine + tests.
2. server: REST auth/profile/tables + Socket.IO rooms + persistence + bots.
3. web shell: routing, theme, layout, auth, landing.
4. lobby + table room + Oxono board UI (online + hotseat).
5. Collect engine + UI.
6. profile, settings, responsive polish, connect help.
7. tests green, browser verification, fixes, docs.

Commit to GitHub in batches after each phase. Add leminhkhoa117 as a collaborator.

## Quality gates (review loops)

After build, run review passes (parallel subagents) covering: rule correctness vs the
engine tests, type/build integrity, security (authz on socket actions, input validation),
responsive/design-slop audit (no gradients, no dashes), and accessibility. Fix findings
each pass, re-run, repeat until clean.
