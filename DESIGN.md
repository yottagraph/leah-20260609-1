# leah-20260609-1

## Vision

A simple database search app. A user can search for an entity, see it
resolved, then see a graph of its relationships with connected entities one
hop away. A user can click on one of those other entities to refocus the
graph on it. A user can click on the focus entity to see its properties and
property values.

## Status

Initial app built by `/build_my_app`. Single-page entity explorer wired to
the Lovelace Query Server.

## How it works

The app is a single page (`pages/index.vue`) with three concerns layered
on top of each other:

1. **Search** — the `EntitySearch` component is a debounced type-ahead that
   posts to `GET /api/entity/search`, which calls the Query Server's
   `entities/search` endpoint via `qsFetch` (server-side, so it works on
   both proxy and in-cluster `enable_lovelace_apps` tenants). Results show
   the resolved name, `flavor`, and NEID. Pressing Enter selects the top
   match.
2. **Graph** — when an entity is selected it becomes the **focus**. The
   `EntityGraph` component renders the focus at the center and one-hop
   neighbors radially around it (SVG, no extra deps). Edges are drawn
   incoming (dashed) or outgoing (solid arrow). Clicking a neighbor
   refocuses the graph on it (the previous focus is pushed onto a back
   stack — there's a "Back" button). Neighbors come from
   `GET /api/entity/[neid]/neighbors`, which runs two `linked` find
   expressions (incoming + outgoing, capped at 25 each), de-duplicates,
   and batch-resolves names via `POST /entities/names`.
3. **Properties** — clicking the focus node opens a right-side
   `v-navigation-drawer` with the `EntityProperties` panel. That panel
   loads `GET /api/entity/[neid]/properties`, which calls
   `elemental/entities/properties` with an empty `pids` array (= all
   properties), groups rows by PID, dedupes by value with most-recent
   `recorded_at` first, resolves the schema-cached property names, and
   resolves any `data_nindex` reference values to the linked entity's
   display name. Reference values are clickable and navigate the graph
   to that entity.

## Modules

- `pages/index.vue` — main single-page experience (search bar, graph,
  history back stack, properties drawer).
- `components/EntitySearch.vue` — debounced type-ahead with flavor chips.
- `components/EntityGraph.vue` — SVG radial graph of focus + neighbors.
- `components/EntityProperties.vue` — grouped property list with clickable
  reference values.
- `server/api/entity/search.get.ts` — `entities/search` proxy.
- `server/api/entity/[neid]/neighbors.get.ts` — bidirectional one-hop
  neighbors with batched name resolution.
- `server/api/entity/[neid]/properties.get.ts` — full property dump,
  deduped, with nindex references resolved to names.

## Notes / known limitations

- Neighbors are returned without flavor labels — the QS REST surface
  doesn't have a batch flavor endpoint, and re-issuing `entities/search`
  per name is too expensive. Names alone are enough for the click-to-
  refocus UX. If we later want flavor chips on the graph, we'd need to
  call the elemental MCP `get_related` flavor-aware tool from a server
  route.
- Highly-connected entities can have far more than 25 neighbors per
  direction; the cap keeps the radial layout legible. The neighbor
  endpoint accepts `?limit=N` (max 50) if a denser view is wanted later.
- The properties panel caps each property to 10 most-recent values to
  keep the list scannable on entities with long historical series (e.g.
  quarterly fundamentals).
