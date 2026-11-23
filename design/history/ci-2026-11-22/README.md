# CI evidence, 20 to 22 November 2026

The raw tables behind `design/decisions/CI-integration.md`.

- `ci.tsv` lists every `ci` run in the window.
- `jobs.tsv.gz` lists every job in those runs. Run `gunzip` on it before the scripts read it.
- `heads.tsv` maps each head branch to its pull request.

Run `python3 ci_an.py <dir>` and then `python3 ci_an2.py <dir>`, where `<dir>` holds `ci.tsv` and `jobs.tsv`. They print the numbers the decision quotes.
