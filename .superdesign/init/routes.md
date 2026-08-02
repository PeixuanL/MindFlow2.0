# Routes

## Routing Model

- Routing style: client-side hash routing in `src/prototype/app.js`.
- Server: `src/prototype/server.mjs` serves static files from `src/prototype/`.
- Default page: `src/prototype/index.html`.

## Route Map

| Route | View | Source | Layout |
| --- | --- | --- | --- |
| `/` with no session | Login | `#login-view` in `src/prototype/index.html` | `main.app-shell` |
| `/#home` | Home capture and recommendation | `#home-view` in `src/prototype/index.html` | `main.app-shell` |
| `/#items` | Task lists | `#items-view` in `src/prototype/index.html` | `main.app-shell` |
| `/#detail/:id` | Task detail editor | `#detail-view` in `src/prototype/index.html` | `main.app-shell` |
| `/mobile-ui-draft.html` | Prior mobile visual draft | `src/prototype/mobile-ui-draft.html` | Standalone draft |
| `/ui-reference-prototype.html` | Prior reviewed reference prototype | `src/prototype/ui-reference-prototype.html` | Standalone reference |

## Key Render Branches

### Home

`renderHome()` shows one of these states:

- completion state via `#done-section`.
- current focus via `#focus-section`.
- recommended active item via `#suggestion-section`.
- parked candidate via `#candidate-section`.
- default capture-only state.

### Items

`renderItems()` shows the tabbed `Active`, `Parking`, and `Done` lists. Item cards are created dynamically by `createItemCard()`.

### Detail

`renderDetail(itemId)` populates the detail editor with title, priority, status, recommendation reason, parking reason, and editable steps.

