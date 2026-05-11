import React, { useContext, useEffect, useState, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import api from '../services/api';
import { 
    LogOut, PlusCircle, MinusCircle, Send, Wallet, Activity, 
    Download, Search, Filter, PieChart as PieIcon, BarChart as BarIcon,
    Bell, Moon, Sun, Settings, MessageCircle, TrendingDown, TrendingUp,
    CreditCard, Landmark
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Chatbot from '../components/Chatbot';

export default function Dashboard() {
    const { user, logout, updateBalance } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    
    const [transactions, setTransactions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [analytics, setAnalytics] = useState({ categories: [], months: [] });
    
    const [action, setAction] = useState(null);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('General');
    const [toUsername, setToUsername] = useState('');
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [budgetLimit, setBudgetLimit] = useState(user?.monthly_limit || 0);

    useEffect(() => {
        if (user?.monthly_limit !== undefined) {
            setBudgetLimit(user.monthly_limit);
        }
    }, [user?.monthly_limit]);

    const categories = ['General', 'Food', 'Rent', 'Salary', 'Shopping', 'Entertainment', 'Transfer'];
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [txRes, balRes, notifyRes, analyticsRes] = await Promise.all([
                api.get('/account/transactions'),
                api.get('/account/balance'),
                api.get('/account/notifications'),
                api.get('/account/analytics')
            ]);
            setTransactions(txRes.data.transactions);
            updateBalance(balRes.data.balance);
            setNotifications(notifyRes.data.notifications);
            setAnalytics(analyticsRes.data);
        } catch (err) {
            console.error("Failed to fetch dashboard data");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (e) => {
        e.preventDefault();
        setError('');
        try {
            let res;
            const payload = { amount: parseFloat(amount), category };
            if (action === 'deposit') res = await api.post('/account/deposit', payload);
            else if (action === 'withdraw') res = await api.post('/account/withdraw', payload);
            else if (action === 'transfer') {
                res = await api.post('/account/transfer', { ...payload, toUsername });
            }
            setMessage(res.data.message);
            setAmount('');
            setAction(null);
            fetchData();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Transaction failed');
        }
    };

    const updateBudget = async () => {
        try {
            await api.post('/account/budget', { limit: parseFloat(budgetLimit) });
            setMessage('Monthly budget updated');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError('Failed to update budget');
        }
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Professional BANK OF INDIA - Mini Statement', 14, 22);
        doc.setFontSize(11);
        doc.text(`Account Holder: ${user?.username || 'N/A'}`, 14, 30);
        doc.text(`Account No: ${user?.account_no || 'N/A'}`, 14, 35);
        doc.text(`Current Balance: ₹${user?.balance || 0}`, 14, 40);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 45);

        const tableData = transactions.map(t => [
            new Date(t.created_at).toLocaleDateString(),
            t.description,
            t.category,
            t.type,
            `₹${t.amount}`,
            t.transaction_id || 'N/A'
        ]);

        doc.autoTable({
            startY: 55,
            head: [['Date', 'Description', 'Category', 'Type', 'Amount', 'Reference']],
            body: tableData,
        });

        doc.save('mini-statement.pdf');
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'ALL' || t.type === filterType;
            const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
            return matchesSearch && matchesType && matchesCategory;
        });
    }, [transactions, searchTerm, filterType, filterCategory]);

    const currentMonthSpent = useMemo(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return transactions
            .filter(t => new Date(t.created_at) >= firstDay && (t.type === 'WITHDRAW' || t.type === 'TRANSFER_OUT'))
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

    const budgetPercent = user?.monthly_limit > 0 ? Math.min((currentMonthSpent / user.monthly_limit) * 100, 100) : 0;

    return (
        <div className="app-container">
            {/* Navbar */}
            <nav className="navbar glass-panel">
                <div className="navbar-brand">
                    <Wallet className="text-primary" />
                    <span>Professional BANK OF INDIA</span>
                </div>
                <div className="navbar-links">
                    <Link to="/loans" className="btn btn-outline" style={{ padding: '0.5rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Landmark size={16} /> Loans
                    </Link>
                    <Link to="/cards" className="btn btn-outline" style={{ padding: '0.5rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={16} /> Cards
                    </Link>
                    <button onClick={toggleTheme} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <div style={{ position: 'relative' }}>
                        <Bell size={18} className="text-muted" />
                        {notifications.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', borderRadius: '50%', width: 10, height: 10 }}></span>}
                    </div>
                    <span className="text-muted">Welcome, <strong className="text-main">{user?.username}</strong></span>
                    <button onClick={logout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </nav>

            {message && <div className="toast success">{message}</div>}
            {error && <div className="toast error">{error}</div>}

            <div className="dashboard-grid">
                <div className="main-content">
                    {/* Top Row: Balance and Budget */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        <div className="glass-panel balance-card">
                            <p className="text-muted" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>Total Balance</p>
                            <h1 className="balance-amount text-gradient">{formatCurrency(user?.balance || 0)}</h1>
                            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Account No: <strong className="text-main">{user?.account_no}</strong></p>
                            <div className="quick-actions">
                                <button className="btn btn-success" onClick={() => setAction('deposit')}><PlusCircle size={18} /> Deposit</button>
                                <button className="btn btn-danger" onClick={() => setAction('withdraw')}><MinusCircle size={18} /> Withdraw</button>
                                <button className="btn btn-primary" onClick={() => setAction('transfer')}><Send size={18} /> Transfer</button>
                            </div>
                        </div>

                        <div className="glass-panel">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3>Monthly Budget</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input 
                                        type="number" 
                                        value={budgetLimit} 
                                        onChange={(e) => setBudgetLimit(e.target.value)}
                                        style={{ width: '100px', padding: '0.25rem' }} 
                                    />
                                    <button onClick={updateBudget} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}><Settings size={14} /></button>
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                    <span>Spent: {formatCurrency(currentMonthSpent)}</span>
                                    <span>Limit: {formatCurrency(user?.monthly_limit || 0)}</span>
                                </div>
                                <div style={{ width: '100%', height: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                                    <div style={{ width: `${budgetPercent}%`, height: '100%', background: budgetPercent > 90 ? 'var(--danger)' : 'var(--success)', transition: 'width 0.5s ease' }}></div>
                                </div>
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                {budgetPercent >= 100 ? "Budget exceeded!" : `You have ${formatCurrency(Math.max((user?.monthly_limit || 0) - currentMonthSpent, 0))} remaining.`}
                            </p>
                        </div>
                    </div>

                    {/* Transaction Form */}
                    {action && (
                        <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                            <h3>{action.charAt(0).toUpperCase() + action.slice(1)} Funds</h3>
                            <form onSubmit={handleAction} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                                <div className="input-group">
                                    <label>Amount (INR)</label>
                                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                                </div>
                                <div className="input-group">
                                    <label>Category</label>
                                    <select 
                                        value={category} 
                                        onChange={(e) => setCategory(e.target.value)}
                                        style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                {action === 'transfer' ? (
                                    <div className="input-group">
                                        <label>Recipient</label>
                                        <input type="text" value={toUsername} onChange={(e) => setToUsername(e.target.value)} required />
                                    </div>
                                ) : <div />}
                                <div style={{ gridColumn: 'span 3', display: 'flex', gap: '1rem' }}>
                                    <button type="submit" className={`btn btn-${action === 'withdraw' ? 'danger' : action === 'deposit' ? 'success' : 'primary'}`} style={{ flex: 1 }}>Confirm</button>
                                    <button type="button" className="btn btn-outline" onClick={() => setAction(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Analytics Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        <div className="glass-panel">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <BarIcon size={18} className="text-primary" />
                                <h3>Spending Trend (Last 6 Months)</h3>
                            </div>
                            <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.months}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                            itemStyle={{ color: 'var(--text-main)' }}
                                        />
                                        <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="glass-panel">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <PieIcon size={18} className="text-primary" />
                                <h3>Category Split</h3>
                            </div>
                            <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={analytics.categories} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                            {(analytics.categories || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                            itemStyle={{ color: 'var(--text-main)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Explorer */}
                    <div className="glass-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity className="text-primary" />
                                <h3>Transaction Explorer</h3>
                            </div>
                            <button onClick={downloadPDF} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                                <Download size={16} /> Mini Statement
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search transactions..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: '2.5rem' }}
                                />
                            </div>
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                <option value="ALL">All Types</option>
                                <option value="DEPOSIT">Deposits</option>
                                <option value="WITHDRAW">Withdrawals</option>
                                <option value="TRANSFER_OUT">Transfers Out</option>
                                <option value="TRANSFER_IN">Transfers In</option>
                            </select>
                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                <option value="ALL">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="transaction-list">
                            {filteredTransactions.length === 0 ? (
                                <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>No transactions match your search.</p>
                            ) : (
                                filteredTransactions.map(t => (
                                    <div key={t.id} className="transaction-item">
                                        <div className="transaction-info">
                                            <div className={`transaction-icon ${t.type.toLowerCase().includes('withdraw') || t.type === 'TRANSFER_OUT' ? 'withdraw' : 'deposit'}`}>
                                                {t.type === 'DEPOSIT' && <TrendingUp size={20} />}
                                                {t.type === 'WITHDRAW' && <TrendingDown size={20} />}
                                                {(t.type === 'TRANSFER_IN' || t.type === 'TRANSFER_OUT') && <Send size={20} />}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 600 }}>{t.description}</p>
                                                <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                    {formatDate(t.created_at)} • <span style={{ color: 'var(--primary)' }}>{t.category}</span> • Ref: <span className="text-main">{t.transaction_id || 'N/A'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, color: (t.type === 'WITHDRAW' || t.type === 'TRANSFER_OUT') ? 'var(--danger)' : 'var(--success)' }}>
                                            {(t.type === 'WITHDRAW' || t.type === 'TRANSFER_OUT') ? '-' : '+'}{formatCurrency(t.amount)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Notifications */}
                <div className="sidebar">
                    <div className="glass-panel" style={{ height: '100%', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <Bell className="text-primary" />
                            <h3>Notifications</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {notifications.length === 0 ? (
                                <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.875rem' }}>No alerts.</p>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.1)', borderLeft: `4px solid ${n.type === 'warning' ? 'var(--danger)' : 'var(--primary)'}` }}>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{n.message}</p>
                                        <p className="text-muted" style={{ fontSize: '0.7rem', marginTop: '4px' }}>{formatDate(n.created_at)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chatbot */}
            <Chatbot />
        </div>
    );
}
