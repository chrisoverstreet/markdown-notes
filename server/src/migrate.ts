import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}
const url: string = databaseUrl;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, 'db', 'migrations');

async function main() {
  const sql = neon(url);
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder });
  console.log('Migrations complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
