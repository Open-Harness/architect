# MAP-screens: the app's map and the agent's view on screen

Decided 23 November 2026 by Aaron, on the 📐 designer's grill of 22 November
(`design/goals/06-portal/screens/grill.md`, pull request #590). Aaron's words, relayed by the conductor: "Mostly yes to
all of that. So if I don't mention anything, then just go with yes." He named none of the four, so every recommendation
stands.

## What was decided

| # | Joint | Decided | Built in |
|---|---|---|---|
| Q1 | Where the map sits | A · a **Map** tab on the app's own page, beside **Things**; the live rail stays as it is | slice 7 |
| Q2 | How pages are listed | A · a tree by `parent`, the navigation's groups beside it, the selected page's detail (route, who may open it, what it shows and offers, its components) on the right | slice 7 |
| Q3 | An app with no declared map | A · show the derived map, marked "derived, not declared", with how to declare one (`blueprint/app/`) | slice 7 |
| Q4 | The agent's view | C · an **As an agent** drawer on every page, listing that page's `snapshot()` by name | slice 11 |

## Why

- Q1: the style guide's page shape (tabs above the title), the rail keeps its live numbers, and the tree gets room.
- Q2: only UI SDK parts, both structures (parent and groups) shown, and components have a place (K36).
- Q3: the map exists so the person and the agent see the same thing; an app that declares none still has one (K31
  section 5), and the mark keeps it honest that nobody wrote it.
- Q4: the snapshot is per page, so it lives on its page; a separate screen would repeat the Map tab.

## What stays open

The grill's "What could not be drawn": UI SDK has no `Widget`, `KPI` or chip yet (the screens draw them on the theme's
tokens), and K31's sketch does not state the `edit` and `account` pages' words, routes or who may open them. The
builder of slice 7 takes these from the code and the generated map, never from the mock.
