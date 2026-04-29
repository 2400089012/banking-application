const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'supersecretjwtkeyforbanking';

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: 'Token missing' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Helper: Log Notification
const logNotification = (userId, message, type = 'info') => {
    db.run(`INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`, [userId, message, type]);
};

// Helper: Log Suspicious Activity
const logSuspicious = (userId, type, description) => {
    db.run(`INSERT INTO suspicious_activity (user_id, activity_type, description) VALUES (?, ?, ?)`, [userId, type, description]);
};

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';
        
        db.run(`INSERT INTO users (username, password_hash, balance, role) VALUES (?, ?, 0, ?)`, [username, hashedPassword, role], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ message: 'User created successfully' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        if (user.status === 'BLOCKED') return res.status(403).json({ error: 'Your account has been blocked by admin' });
        if (user.status === 'DELETED') return res.status(403).json({ error: 'Your account has been deleted by admin' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });

        // Verify captcha
        const captchaToken = req.body.captchaToken;
        const captchaAnswer = req.body.captchaAnswer;
        try {
            const decoded = jwt.verify(captchaToken, JWT_SECRET);
            if (parseInt(captchaAnswer) !== decoded.answer) {
                return res.status(400).json({ error: 'Incorrect CAPTCHA answer' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid or missing CAPTCHA' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        logNotification(user.id, `Successful login from new session.`, 'security');
        res.json({ token, user: { id: user.id, username: user.username, balance: user.balance, role: user.role, theme: user.theme, monthly_limit: user.monthly_limit } });
    });
});

app.get('/api/auth/captcha', (req, res) => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    const token = jwt.sign({ answer }, JWT_SECRET, { expiresIn: '5m' });
    res.json({ question: `What is ${num1} + ${num2}?`, token });
});

app.post('/api/auth/request-otp', (req, res) => {
    const { username } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND status != 'DELETED'`, [username], (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        if (user.status === 'BLOCKED') return res.status(403).json({ error: 'Your account is blocked' });
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        db.run(`UPDATE users SET reset_otp = ? WHERE id = ?`, [otp, user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'OTP Generated successfully!', otp }); 
        });
    });
});

app.post('/api/auth/change-password', async (req, res) => {
    const { username, newPassword, oldPassword, otp } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND status != 'DELETED'`, [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        
        let valid = false;
        if (oldPassword) {
            valid = await bcrypt.compare(oldPassword, user.password_hash);
        } else if (otp) {
            valid = (user.reset_otp === otp);
        }

        if (!valid) return res.status(400).json({ error: 'Invalid credentials or OTP' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.run(`UPDATE users SET password_hash = ?, reset_otp = NULL WHERE id = ?`, [hashedPassword, user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Password changed successfully' });
        });
    });
});

// --- ADMIN ROUTES ---

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT id, username, balance, role, status, created_at FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error fetching users' });
        res.json({ users: rows });
    });
});

app.put('/api/admin/users/:id/block', authenticateToken, requireAdmin, (req, res) => {
    db.get(`SELECT status FROM users WHERE id = ?`, [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
        db.run(`UPDATE users SET status = ? WHERE id = ?`, [newStatus, req.params.id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: `User status changed to ${newStatus}`, status: newStatus });
        });
    });
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run(`UPDATE users SET status = 'DELETED' WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'User deleted successfully' });
    });
});

app.get('/api/admin/users/:id/transactions', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error fetching transactions' });
        res.json({ transactions: rows });
    });
});

app.get('/api/admin/suspicious', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT s.*, u.username FROM suspicious_activity s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error fetching activity' });
        res.json({ activities: rows });
    });
});

// --- ACCOUNT ROUTES ---

app.get('/api/account/balance', authenticateToken, (req, res) => {
    db.get(`SELECT balance FROM users WHERE id = ?`, [req.user.id], (err, row) => {
        if (err || !row) return res.status(500).json({ error: 'Error fetching balance' });
        res.json({ balance: row.balance });
    });
});

app.post('/api/account/deposit', authenticateToken, (req, res) => {
    const { amount, category = 'Salary' } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [amount, req.user.id]);
        db.run(`INSERT INTO transactions (user_id, type, amount, category, description) VALUES (?, 'DEPOSIT', ?, ?, 'Deposit to account')`, [req.user.id, amount, category]);
        
        if (amount > 50000) {
            logSuspicious(req.user.id, 'LARGE_DEPOSIT', `User deposited ₹${amount}`);
        }
        logNotification(req.user.id, `₹${amount} deposited to your account.`, 'transaction');

        db.run('COMMIT', (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Transaction failed' });
            }
            res.json({ message: 'Deposit successful' });
        });
    });
});

app.post('/api/account/withdraw', authenticateToken, (req, res) => {
    const { amount, category = 'General' } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    db.get(`SELECT balance, monthly_limit FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Error fetching account' });
        if (user.balance < amount) return res.status(400).json({ error: 'Insufficient funds' });

        // Check Monthly Limit
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        const isoMonth = startOfMonth.toISOString();

        db.get(`SELECT SUM(amount) as spent FROM transactions WHERE user_id = ? AND (type = 'WITHDRAW' OR type = 'TRANSFER_OUT') AND created_at >= ?`, [req.user.id, isoMonth], (err, row) => {
            const currentSpent = row.spent || 0;
            if (user.monthly_limit > 0 && (currentSpent + amount) > user.monthly_limit) {
                logNotification(req.user.id, `Warning: You have exceeded your monthly budget of ₹${user.monthly_limit}!`, 'warning');
            }

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [amount, req.user.id]);
                db.run(`INSERT INTO transactions (user_id, type, amount, category, description) VALUES (?, 'WITHDRAW', ?, ?, 'Withdrawal from account')`, [req.user.id, amount, category]);
                
                if (amount > 50000) {
                    logSuspicious(req.user.id, 'LARGE_WITHDRAWAL', `User withdrew ₹${amount}`);
                }
                logNotification(req.user.id, `₹${amount} withdrawn from your account.`, 'transaction');

                db.run('COMMIT', (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Transaction failed' });
                    }
                    res.json({ message: 'Withdrawal successful' });
                });
            });
        });
    });
});

app.post('/api/account/transfer', authenticateToken, (req, res) => {
    const { amount, toUsername, category = 'Transfer' } = req.body;
    if (!amount || amount <= 0 || !toUsername) return res.status(400).json({ error: 'Invalid parameters' });
    if (toUsername === req.user.username) return res.status(400).json({ error: 'Cannot transfer to yourself' });

    db.get(`SELECT id FROM users WHERE username = ?`, [toUsername], (err, toUser) => {
        if (err || !toUser) return res.status(404).json({ error: 'Recipient not found' });

        db.get(`SELECT balance, monthly_limit FROM users WHERE id = ?`, [req.user.id], (err, fromUser) => {
            if (err || !fromUser) return res.status(500).json({ error: 'Error fetching account' });
            if (fromUser.balance < amount) return res.status(400).json({ error: 'Insufficient funds' });

            // Check Budget
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0,0,0,0);
            const isoMonth = startOfMonth.toISOString();

            db.get(`SELECT SUM(amount) as spent FROM transactions WHERE user_id = ? AND (type = 'WITHDRAW' OR type = 'TRANSFER_OUT') AND created_at >= ?`, [req.user.id, isoMonth], (err, budgetRow) => {
                const currentSpent = budgetRow.spent || 0;
                if (fromUser.monthly_limit > 0 && (currentSpent + amount) > fromUser.monthly_limit) {
                    logNotification(req.user.id, `Warning: You have exceeded your monthly budget of ₹${fromUser.monthly_limit}!`, 'warning');
                }

                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');
                    db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [amount, req.user.id]);
                    db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [amount, toUser.id]);
                    
                    db.run(`INSERT INTO transactions (user_id, type, amount, category, description, related_user_id) VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?)`, 
                        [req.user.id, amount, category, `Transfer to ${toUsername}`, toUser.id]);
                    db.run(`INSERT INTO transactions (user_id, type, amount, category, description, related_user_id) VALUES (?, 'TRANSFER_IN', ?, ?, ?, ?)`, 
                        [toUser.id, amount, category, `Transfer from ${req.user.username}`, req.user.id]);
                    
                    if (amount > 50000) {
                        logSuspicious(req.user.id, 'LARGE_TRANSFER', `User transferred ₹${amount} to ${toUsername}`);
                    }
                    logNotification(req.user.id, `₹${amount} transferred to ${toUsername}.`, 'transaction');
                    logNotification(toUser.id, `You received ₹${amount} from ${req.user.username}.`, 'transaction');

                    db.run('COMMIT', (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Transaction failed' });
                        }
                        res.json({ message: 'Transfer successful' });
                    });
                });
            });
        });
    });
});

app.get('/api/account/transactions', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error fetching transactions' });
        res.json({ transactions: rows });
    });
});

app.get('/api/account/notifications', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error fetching notifications' });
        res.json({ notifications: rows });
    });
});

app.post('/api/account/budget', authenticateToken, (req, res) => {
    const { limit } = req.body;
    db.run(`UPDATE users SET monthly_limit = ? WHERE id = ?`, [limit, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Monthly limit updated' });
    });
});

app.put('/api/account/theme', authenticateToken, (req, res) => {
    const { theme } = req.body;
    db.run(`UPDATE users SET theme = ? WHERE id = ?`, [theme, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Theme updated' });
    });
});

app.get('/api/account/analytics', authenticateToken, (req, res) => {
    const userId = req.user.id;
    // Category-wise spending (last 30 days)
    const categoryQuery = `SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND (type = 'WITHDRAW' OR type = 'TRANSFER_OUT') AND created_at > date('now', '-30 days') GROUP BY category`;
    // Monthly spending (last 6 months)
    const monthlyQuery = `SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total FROM transactions WHERE user_id = ? AND (type = 'WITHDRAW' OR type = 'TRANSFER_OUT') GROUP BY month ORDER BY month DESC LIMIT 6`;

    db.all(categoryQuery, [userId], (err, categories) => {
        db.all(monthlyQuery, [userId], (err, months) => {
            res.json({ 
                categories: categories || [], 
                months: (months || []).reverse() 
            });
        });
    });
});

app.get('/api/users/search', authenticateToken, (req, res) => {
    const query = req.query.q || '';
    db.all(`SELECT username FROM users WHERE username LIKE ? AND id != ? LIMIT 10`, [`%${query}%`, req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error fetching users' });
        res.json({ users: rows.map(r => r.username) });
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
