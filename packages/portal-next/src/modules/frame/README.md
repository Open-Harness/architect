# frame

The frame every page sits in (`design/portal.md`, "The frame"), drawn on UI SDK and the Orthograph theme and keeping the `data-portal` hooks
check 21 reads:

| Part | Hook | From |
|---|---|---|
| top bar | `top-bar` (`data-environment`, `data-window-ms`), `env-picker` > `env-option`, `search-trigger` | the snapshot's telemetry; the model's environments |
| ⌘K | `search-trigger`, `search-index` (a JSON script), `search-box` | `panels`: the model's declarations |
| icon rail | `icon-rail`, `rail-icon` (`data-panel`), `panel`, `panel-page` (`data-title`, `data-href`) | the map's navigation groups (`generated/app/navigation.json`) and the model |
| tree | `tree`, `tree-item` (`data-kind`, `data-name`) | the model's things and operations |
| live rail | `rail` (`data-scope`), `stat`, `last-call`, `not-yet` | `live`: the window's counts and calls |

`Frame.Page` is the page's one root (`data-portal="page"`, `data-ready`, `data-status`) and, when it has data, the frame around its children.
Every link is a typed link of `generated/app/links.ts` or an address of `navigation.json`; moving goes through the shell's router (`FrameEnv.go`).
⌘K is the shell's palette: the portal hands it the model's rows as `extra` (`panels`), and the top bar's trigger sends its key (see `search.tsx`).
Test: `frame.test.ts`, which renders the frame on the server and reads the hooks.
