# Harmonie-dev — Frontend

TanStack Start / React app for the Harmonie-dev invoicing platform.

## Getting started (clone & run)

Requires [Bun](https://bun.sh). `.env` is already committed pointing at the backend on `http://localhost:8090` — start the backend first (see `new/back/README.md`), then:

```bash
git clone <this-repo-url>
cd new/front   # if cloning the monorepo — skip this line if this repo IS new/front
bun install
bun run dev
```

Opens on **http://localhost:5180** by default (see `.claude/launch.json` / Vite's own port auto-detection if that port is taken). Log in with the backend's seed Super Admin account (`admin@harmonie-dev.tn` / `HarmonieDev@2026`), or use `/rejoindre` to submit a join request and convert it from the Super Admin panel.

If the backend runs somewhere other than `localhost:8090`, change `VITE_API_URL` in `.env`.

### Build

```bash
bun run build
```

## Type-checking

```bash
bunx tsc --noEmit
```

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
