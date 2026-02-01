import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { initDb } from './lib/db.js';
import { NeonSessionStore } from './lib/session-store.js';
import { authRouter } from './routes/auth.js';
import { notesRouter } from './routes/notes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;
const sessionSecret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production';

async function main() {
  await initDb();

  const app = express();

  app.use(
    cors({
      origin: isProd ? undefined : 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(
    session({
      store: new NeonSessionStore(),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use('/api/auth', authRouter);
  app.use('/api/notes', notesRouter);

  if (isProd) {
    const distPath = path.join(__dirname, '..', '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
