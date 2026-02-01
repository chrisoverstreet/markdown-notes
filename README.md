# Markdown Notes

A minimalistic web app for recording notes in markdown. Built with TypeScript, React (Vite), Express, Neon Postgres, and Tailwind CSS. Environment variables are loaded from `.env` or `.env.local`. Do not commit these files; use `.env.example` (or `.env.local.example`) as a template.

## Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, react-markdown
- **Backend:** Express (Node.js), TypeScript
- **Database:** Neon (serverless Postgres), schema and migrations via [Drizzle ORM](https://orm.drizzle.team/)
- **Auth:** Username/password with JWTs (bcrypt)
- **Privacy:** End-to-end encryption (E2EE): note data is encrypted in the browser with a key derived from the user’s password. The server only stores ciphertext; developers and the server cannot decrypt user data.
- **Env:** `.env` / `.env.local` (do not commit; use `.env.example` as a template)

## Prerequisites

- Node.js 18+
- pnpm

## Environment setup

1. Copy `.env.example` to `.env` (or `.env.local`): `cp .env.example .env`
2. Edit `.env` and set:

| Variable       | Description                     |
| -------------- | ------------------------------- |
| `DATABASE_URL` | Neon Postgres connection string |
| `PORT`         | Server port (default 3000)      |
| `JWT_SECRET`   | Secret for signing JWTs         |

Do not commit `.env` or `.env.local`; they are listed in `.gitignore`.

**E2EE:** New notes are encrypted in the browser; the server never sees the decryption key. After a page refresh, users must enter their password again to unlock notes (the key is not stored).

## Local development

```bash
# Install dependencies
pnpm install

# Run client (Vite) and server (Express) in parallel
pnpm dev
```

- Client: http://localhost:5173 (Vite dev server, proxies `/api` to the server)
- Server: http://localhost:3000

## Build and production

```bash
# Run migrations, then build client and server (migrations run automatically during build)
pnpm build

# Run production server (serves API + static client from dist)
pnpm start
```

Set `NODE_ENV=production` in production. The server serves the built Vite app from `dist/` and mounts the API at `/api`.

## Deploy (Render or Railway)

1. Connect your repo to Render or Railway.
2. **Build:** `pnpm install && pnpm build`
3. **Start:** `pnpm start` — Configure `DATABASE_URL`, `PORT`, and `JWT_SECRET` in the host's environment (dashboard or env vars).

## Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Client + server                          |
| `pnpm build`        | Run migrations, then build client + server |
| `pnpm start`        | Run production server                    |
| `pnpm db:generate`  | Generate a new migration from schema     |
| `pnpm db:migrate`   | Run pending migrations                   |
| `pnpm db:studio`    | Open Drizzle Studio                      |
| `pnpm lint`         | Run ESLint                               |
| `pnpm format`       | Format with Prettier                     |
| `pnpm format:check` | Check Prettier                           |

## License

MIT
