const bcrypt = require('bcrypt');
const db = require('./database');

async function createAdmin() {
    const hashedPassword = await bcrypt.hash('@))%', 10);
    db.run(`INSERT INTO users (username, password_hash, balance, role) VALUES ('admin', ?, 0, 'admin')`, [hashedPassword], function(err) {
        if (err) console.log(err.message);
        else console.log('Admin created successfully.');
        process.exit();
    });
}
createAdmin();
