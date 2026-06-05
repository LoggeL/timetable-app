# Timetable

Private festival timetable voting app for small groups.

## Run

```bash
npm run dev -- --hostname 0.0.0.0 --port 3028
```

Open `http://localhost:3028` locally, or `https://timetable.logge.top` in production.

Votes are stored in `data/votes.json`. There is intentionally no auth and no room code.

## Production

Production is deployed by Dokploy from GitHub:

- Repository: `https://github.com/LoggeL/timetable-app`
- Branch: `main`
- Dokploy project: `timetable`
- Dokploy service: `timetable`
- Runtime Swarm service: `timetable-mloipe`
- Build type: Dockerfile
- Persistent vote volume: host bind mount `data/` -> `/app/data`
- Public URL: `https://timetable.logge.top`

## Data

- Rock am Ring 2026 uses official timetable data from `https://www.rock-am-ring.com/timetable`, checked on 2026-06-05.
- Southside 2026 uses official lineup-by-day data from `https://southside.de/line-up/`, checked on 2026-05-28. Times are marked `TBA` until the official timetable is published.
- Stagetopia 2026 uses official timetable data from `https://stagetopia.de/`, checked on 2026-06-01.
- Highfield 2026 uses official lineup-by-day data from `https://highfield.de/line-up/`, checked on 2026-05-28. Times are marked `TBA`.

## Assets

- `public/images/rock-am-ring-bg.png` and `public/images/southside-bg.png` were generated with the built-in Codex imagegen tool.
