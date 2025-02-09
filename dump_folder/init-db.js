import { createClient } from '@libsql/client';
import fs from 'fs';

const client = createClient({
    url: 'file:./data.db',  // Local SQLite file
  //   syncUrl: process.env.TURSO_SYNC_URL  // For cloud sync (optional)
  });
  console.log("setup complete")

  // Function to run SQL statements from schema.sql
async function runSchema() {
    const schema = fs.readFileSync('schema.sql', 'utf-8');
    const statements = schema
      .split(';')  // Split statements by semicolon
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
  
    try {
      await client.batch(statements.map(stmt => ({ sql: stmt })));
      console.log('Schema applied successfully.');
    } catch (e) {
      console.error('Error applying schema:', e);
    }
  }

runSchema();

