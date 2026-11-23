# data

The components the portal shows data with, each HeroUI Pro's own under our name (F7): `Board` (`Kanban`), `Grid` (`DataGrid`),
`Stat`, `StatGroup`, `StatValue` and `StatTrend` (`KPI`, `KPIGroup`, `NumberValue`, `TrendChip`), `Widget`, `Timeline`, and `Chart`
with `Area`, `Bar` and `Line`. `service.ts` and `internal/chart.ts` are the only files that name Pro.

`Board` is Pro's Kanban as is; the server-owned hook that keeps the machine's rules on the client is M3.17's
(`spikes/kanban-components` shows it).

Tests: `data.test.ts` reads the sources (Pro is not needed to run it); the declared names and the exported ones must agree.
