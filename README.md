# Peepin

A three-mode social app that blends professional networking, public social sharing, and private circles. The app ships with:

- Three modes: Pro (LinkedIn vibes), Social (Insta vibes), and Private (close friends)
- Feed, post composer, connections, and lightweight messaging
- API + Web app in a single Docker Compose

## Quick start

### Docker

```
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:4000

### Local dev (without Docker)

```
cd apps/api
npm install
npm run dev
```

```
cd apps/web
npm install
npm run dev
```

## Notes

- Data persists in `apps/api/data/db.json`.
- No authentication yet; the UI uses a seeded current user.
