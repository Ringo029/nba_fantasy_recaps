# Public site

This repository is the static site. The private `nba_fb` repository builds a validated export and copies only these paths:

- `data/hub/`
- `data/seasons/`
- `seasons/`

`python sync_to_public.py` in the private repo checks the export first. If a required field is missing, a private field is present, or the season does not match, it exits without changing this repository.

Existing files in `recaps/week-XX.html` stay where they are. `seasons/2025-26/recaps/` contains compatibility pages that link back to those files. Do not delete the original recap pages.

GitHub Pages was not enabled when this change was prepared (`pages` API returned 404). After the first reviewed publish, turn on Settings → Pages → Deploy from branch `main`, folder `/`. A push to `main` from a destination token is what starts that deploy. Setup steps, secrets, and the disabled schedule live in the private repo at `docs/SETUP.md`.

Team pages remember a team id in the browser. That choice is not an account. Everything published here is public.
