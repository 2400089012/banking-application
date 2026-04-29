const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'banking.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            // Create Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password_hash TEXT,
                balance REAL DEFAULT 0,
                role TEXT DEFAULT 'user',
                status TEXT DEFAULT 'ACTIVE',
                reset_otp TEXT,
                monthly_limit REAL DEFAULT 0,
                theme TEXT DEFAULT 'dark',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, () => {
                db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, () => {});
                db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'ACTIVE'`, () => {});
                db.run(`ALTER TABLE users ADD COLUMN reset_otp TEXT`, () => {});
                db.run(`ALTER TABLE users ADD COLUMN monthly_limit REAL DEFAULT 0`, () => {});
                db.run(`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark'`, () => {});
            });

            db.run(`CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT,
                amount REAL,
                category TEXT DEFAULT 'General',
                description TEXT,
                related_user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (related_user_id) REFERENCES users (id)
            )`, () => {
                db.run(`ALTER TABLE transactions ADD COLUMN category TEXT DEFAULT 'General'`, () => {});
            });

            db.run(`CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                message TEXT,
                type TEXT,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS suspicious_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                activity_type TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
        });
    }
});

module.exports = db;
