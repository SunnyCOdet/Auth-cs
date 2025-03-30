import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'sqlite.db');
const SCHEMA_PATH = path.join(process.cwd(), 'app', 'db', 'schema.sql');

let db: Database.Database;

function initializeDatabase() {
  const dbExists = fs.existsSync(DB_PATH);
  db = new Database(DB_PATH, { verbose: console.log });

  if (!dbExists) {
    console.log('Database does not exist, initializing schema...');
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
      db.exec(schema);
      console.log('Database schema initialized successfully.');
    } catch (error) {
      console.error('Error initializing database schema:', error);
      throw error; // Rethrow to prevent app start with bad DB state
    }
  } else {
    console.log('Database already exists.');
    // Optional: Add migration logic here if schema changes
  }

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Close the database connection gracefully on exit
  process.on('exit', () => db.close());
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    db.close();
    process.exit(0);
  });
  // Handle SIGTERM (kill)
  process.on('SIGTERM', () => {
    db.close();
    process.exit(0);
  });

  return db;
}

// Initialize and export the database connection
export const dbConnection = db || initializeDatabase();

// Ensure the directory exists (needed for WebContainer)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
