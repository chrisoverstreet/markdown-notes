# Markdown Notes

A minimalistic web app for recording notes in markdown. Built with TypeScript, React (Vite), Express, Neon Postgres, and Tailwind CSS. Environment variables are managed with [Doppler](https://www.doppler.com/).

## Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, react-markdown
- **Backend:** Express (Node.js), TypeScript
- **Database:** Neon (serverless Postgres), schema and migrations via [Drizzle ORM](https://orm.drizzle.team/)
- **Auth:** Username/password with JWTs (bcrypt)
- **Privacy:** End-to-end encryption (E2EE): note data is encrypted in the browser with a key derived from the user’s password. The server only stores ciphertext; developers and the server cannot decrypt user data.
- **Env:** Doppler (no `.env` files in repo)

## Prerequisites

- Node.js 18+
- pnpm
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) (for local env)

## Doppler setup

1. Install the Doppler CLI and log in: `doppler login`
2. Create a Doppler project (or use an existing one) and link this repo: `doppler setup`
3. In your Doppler config, add these variables:

| Variable         | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`   | Neon Postgres connection string                                             |
| `PORT`           | Server port (default 3000)                                                  |
| `JWT_SECRET`     | Secret for signing JWTs                                                     |

Do not commit `.env` or `.env.local`; all secrets live in Doppler.

**E2EE:** New notes are encrypted in the browser; the server never sees the decryption key. After a page refresh, users must enter their password again to unlock notes (the key is not stored). Set `ENCRYPTION_KEY` only if you have existing notes that were encrypted with the previous server-side scheme and you need to read them.

## Local development

Run all commands that need env through Doppler:

```bash
# Install dependencies
pnpm install

# Run client (Vite) and server (Express) in parallel
doppler run -- pnpm dev
```

- Client: http://localhost:5173 (Vite dev server, proxies `/api` to the server)
- Server: http://localhost:3000

## Build and production

```bash
# Run migrations, then build client and server (migrations run automatically during build)
doppler run -- pnpm build

# Run production server (serves API + static client from dist)
doppler run -- pnpm start
```

Set `NODE_ENV=production` in production. The server serves the built Vite app from `dist/` and mounts the API at `/api`.

## Deploy (Render or Railway)

1. Connect your repo to Render or Railway.
2. **Build:** `pnpm install && pnpm build`
3. **Start:** `doppler run -- pnpm start` (or use the platform’s Doppler integration to inject env; then use `pnpm start`).
4. Ensure `DATABASE_URL`, `PORT`, and `JWT_SECRET` are set in the host (or via Doppler). `ENCRYPTION_KEY` is optional (see E2EE note above).

## Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Client + server (use with Doppler)       |
| `pnpm build`        | Run migrations, then build client + server (use with Doppler) |
| `pnpm start`        | Run production server (use with Doppler) |
| `pnpm db:generate`  | Generate a new migration from schema (use with Doppler) |
| `pnpm db:migrate`   | Run pending migrations (use with Doppler) |
| `pnpm db:studio`    | Open Drizzle Studio (use with Doppler)   |
| `pnpm lint`         | Run ESLint                               |
| `pnpm format`       | Format with Prettier                     |
| `pnpm format:check` | Check Prettier                           |

## License

MIT
