# Timetable

Private festival timetable voting app for small groups.

## Run

```bash
npm run dev -- --hostname 0.0.0.0 --port 3028
```

Open `http://localhost:3028` locally, or `https://timetable.logge.top` in production.

Votes are stored in `data/votes.json`. There is intentionally no auth and no room code.

## Production

The production deployment is a Docker Swarm service:

- Service: `timetable-app`
- Image: `timetable-app:latest`
- Network: `dokploy-network`
- Traefik config: `/etc/dokploy/traefik/dynamic/timetable.yml`
- Public URL: `https://timetable.logge.top`

## Data

- Rock am Ring 2026 uses official timetable data from `https://www.rock-am-ring.com/timetable`, checked on 2026-05-28.
- Southside 2026 uses official lineup-by-day data from `https://southside.de/line-up/`, checked on 2026-05-28. Times are marked `TBA` until the official timetable is published.
- Stagetopia 2026 uses lineup data from `https://www.festivalplaner.de/festival/stagetopia-festival/`, checked on 2026-05-28, plus the 2026 poster screenshot supplied by Logge for the later additions. Times are marked `TBA`.
- Highfield 2026 uses official lineup-by-day data from `https://highfield.de/line-up/`, checked on 2026-05-28. Times are marked `TBA`.

## Assets

- `public/images/rock-am-ring-bg.png` and `public/images/southside-bg.png` were generated with the built-in Codex imagegen tool.
