import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool;
let db: ReturnType<typeof drizzle>;

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  DATABASE_URL not set - database features disabled, using in-memory storage"
  );
  // Create a mock pool that won't try to connect
  pool = null as any;
  db = null as any;
} else {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { pool, db };
