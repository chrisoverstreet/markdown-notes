import type { SessionData } from 'express-session';
import { Store } from 'express-session';
import { sql } from './db.js';

export class NeonSessionStore extends Store {
  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    sql`
      SELECT sess FROM session
      WHERE sid = ${sid} AND expire > NOW()
    `
      .then((rows) => {
        if (rows.length === 0) return callback(null, null);
        const row = rows[0] as { sess: unknown };
        try {
          const sess = typeof row.sess === 'string' ? JSON.parse(row.sess) : row.sess;
          callback(null, sess as SessionData);
        } catch (e) {
          callback(e, null);
        }
      })
      .catch((err) => callback(err, null));
  }

  set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const sess = JSON.stringify(session);
    const maxAge = session.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000;
    const expire = new Date(Date.now() + maxAge);

    sql`
      INSERT INTO session (sid, sess, expire)
      VALUES (${sid}, ${sess}, ${expire})
      ON CONFLICT (sid) DO UPDATE SET sess = ${sess}, expire = ${expire}
    `
      .then(() => callback?.())
      .catch((err) => {
        callback?.(err);
      });
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    sql`DELETE FROM session WHERE sid = ${sid}`
      .then(() => callback?.())
      .catch((err) => {
        callback?.(err);
      });
  }

  touch(sid: string, session: SessionData, callback?: () => void): void {
    const maxAge = session.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000;
    const expire = new Date(Date.now() + maxAge);

    sql`UPDATE session SET expire = ${expire} WHERE sid = ${sid}`
      .then(() => callback?.())
      .catch(() => callback?.());
  }
}
