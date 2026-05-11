import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import api from '../services/api';
import { LogOut, Users, FileText, ArrowLeft, Wallet, Ban, CheckCircle, Trash2, AlertTriangle, ShieldCheck, Sun, Moon } from 'lucide-react';

export default function AdminDashboard() {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [users, setUsers] = useState([]);
    const [suspicious, setSuspicious] = useState([]);
    const [view, setView] = useState('users'); // users, transactions, activity
    const [selectedUser, setSelectedUser] = useState(null);
    const [userTransactions, setUserTransactions] = useState([]);
    const [pendingLoans, setPendingLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingLoans = async () => {
        try {
            const res = await api.get('/loans/pending');
            setPendingLoans(res.data);
        } catch (err) {
            console.error("Failed to fetch pending loans", err);
        }
    };

    const fetchData = async () => {
        try {
            const [userRes, activityRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/suspicious')
            ]);
            setUsers(userRes.data.users);
            setSuspicious(activityRes.data.activities);
            fetchPendingLoans();
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch admin data");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchUserTransactions = async (userId) => {
        try {
            const res = await api.get(`/admin/users/${userId}/transactions`);
            setUserTransactions(res.data.transactions);
            setSelectedUser(users.find(u => u.id === userId));
            setView('transactions');
        } catch (err) {
            console.error("Failed to fetch transactions");
        }
    };

    const toggleBlockUser = async (userId) => {
        try {
            await api.put(`/admin/users/${userId}/block`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to change user status");
        }
    };

    const approveUser = async (userId) => {
        try {
            await api.put(`/admin/users/${userId}/approve`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to approve user");
        }
    };

    const deleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            fetchData();
        } catch (err) {
            alert("Failed to delete user");
        }
    };

    const handleLoanAction = async (loanId, action) => {
        try {
            await api.put(`/loans/${loanId}/${action}`);
            fetchPendingLoans();
        } catch (err) {
            alert(`Failed to ${action} loan: ` + (err.response?.data?.error || ""));
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

    const activeAccounts = users.filter(u => u.role !== 'admin' && u.status !== 'DELETED');
    const totalBalance = activeAccounts.reduce((acc, u) => acc + u.balance, 0);

    return (
        <div className="app-container">
            <nav className="navbar glass-panel">
                <div className="navbar-brand">
                    <Wallet className="text-primary" />
                    <span>Professional BANK OF INDIA - <span className="text-danger">ADMIN</span></span>
                </div>
                <div className="navbar-links">
                    <button className={`btn ${view === 'users' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('users')}>Users</button>
                    <button className={`btn ${view === 'loans' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('loans')}>
                        Loans {pendingLoans.length > 0 && <span style={{ background: 'var(--primary)', borderRadius: '50%', padding: '0 5px', fontSize: '10px', marginLeft: '5px' }}>{pendingLoans.length}</span>}
                    </button>
                    <button className={`btn ${view === 'activity' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('activity')}>
                        Suspicious {suspicious.length > 0 && <span style={{ background: 'var(--danger)', borderRadius: '50%', padding: '0 5px', fontSize: '10px', marginLeft: '5px' }}>{suspicious.length}</span>}
                    </button>
                    <button onClick={toggleTheme} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button onClick={logout} className="btn btn-outline"><LogOut size={16} /> Logout</button>
                </div>
            </nav>

            {view === 'users' && (
                <>
                    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '2rem' }}>
                        <div className="glass-panel balance-card">
                            <p className="text-muted">Registered Accounts</p>
                            <h1 className="balance-amount text-gradient">{activeAccounts.length}</h1>
                        </div>
                        <div className="glass-panel balance-card">
                            <p className="text-muted">System Liquidity</p>
                            <h1 className="balance-amount text-success">{formatCurrency(totalBalance)}</h1>
                        </div>
                    </div>

                    <div className="glass-panel">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <Users className="text-primary" />
                            <h3>User Management</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem' }}>Username</th>
                                    <th style={{ padding: '1rem' }}>Account No</th>
                                    <th style={{ padding: '1rem' }}>Status</th>
                                    <th style={{ padding: '1rem' }}>Balance</th>
                                    <th style={{ padding: '1rem' }}>Joined</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.filter(u => u.role !== 'admin').map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', opacity: u.status === 'DELETED' ? 0.5 : 1 }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{u.username}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '13px' }}>{u.account_no || 'N/A'}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ 
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px', 
                                                background: u.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : u.status === 'PENDING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                                color: u.status === 'ACTIVE' ? 'var(--success)' : u.status === 'PENDING' ? 'var(--warning)' : 'var(--danger)' 
                                            }}>
                                                {u.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{formatCurrency(u.balance)}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => fetchUserTransactions(u.id)} className="btn btn-outline" style={{ padding: '5px' }} title="Transactions"><FileText size={16} /></button>
                                            {u.status === 'PENDING' && (
                                                <button onClick={() => approveUser(u.id)} className="btn btn-outline" style={{ padding: '5px', color: 'var(--success)' }} title="Approve User"><CheckCircle size={16} /></button>
                                            )}
                                            {u.status !== 'DELETED' && u.status !== 'PENDING' && (
                                                <>
                                                    <button onClick={() => toggleBlockUser(u.id)} className="btn btn-outline" style={{ padding: '5px', color: u.status === 'BLOCKED' ? 'var(--success)' : 'var(--danger)' }} title={u.status === 'BLOCKED' ? 'Unblock' : 'Block'}>{u.status === 'BLOCKED' ? <CheckCircle size={16} /> : <Ban size={16} />}</button>
                                                    <button onClick={() => deleteUser(u.id)} className="btn btn-outline" style={{ padding: '5px', color: 'var(--danger)' }} title="Delete"><Trash2 size={16} /></button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {view === 'activity' && (
                <div className="glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <AlertTriangle className="text-danger" />
                        <h3>Suspicious Activity Monitor</h3>
                    </div>
                    {suspicious.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}>
                            <ShieldCheck size={48} className="text-success" style={{ marginBottom: '1rem' }} />
                            <p>No suspicious activities flagged.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {suspicious.map(s => (
                                <div key={s.id} style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ fontWeight: 700, color: 'var(--danger)' }}>{s.activity_type.replace('_', ' ')}</p>
                                        <p style={{ fontSize: '14px', margin: '4px 0' }}>{s.description} by <strong>{s.username}</strong></p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(s.created_at)}</p>
                                    </div>
                                    <button onClick={() => fetchUserTransactions(s.user_id)} className="btn btn-primary" style={{ padding: '8px 16px' }}>Investigate</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'transactions' && (
                <div className="glass-panel">
                    <button onClick={() => setView('users')} className="btn btn-outline" style={{ marginBottom: '1rem' }}><ArrowLeft size={16} /> Back</button>
                    <h3>Transactions for {selectedUser?.username}</h3>
                    <div className="transaction-list" style={{ marginTop: '1rem' }}>
                        {userTransactions.map(t => (
                            <div key={t.id} className="transaction-item">
                                <div>
                                    <p style={{ fontWeight: 600 }}>{t.description}</p>
                                    <p className="text-muted" style={{ fontSize: '12px' }}>{formatDate(t.created_at)} • {t.category} • Ref: {t.transaction_id || 'N/A'}</p>
                                </div>
                                <div style={{ fontWeight: 700, color: t.type.includes('OUT') || t.type === 'WITHDRAW' ? 'var(--danger)' : 'var(--success)' }}>
                                    {t.type.includes('OUT') || t.type === 'WITHDRAW' ? '-' : '+'}{formatCurrency(t.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'loans' && (
                <div className="glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Wallet className="text-primary" />
                        <h3>Pending Loan Applications</h3>
                    </div>
                    {pendingLoans.length === 0 ? (
                        <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No pending loan applications.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem' }}>User ID</th>
                                    <th style={{ padding: '1rem' }}>Loan Type</th>
                                    <th style={{ padding: '1rem' }}>Amount</th>
                                    <th style={{ padding: '1rem' }}>Duration</th>
                                    <th style={{ padding: '1rem' }}>Applied On</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingLoans.map(loan => (
                                    <tr key={loan.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>{loan.userId}</td>
                                        <td style={{ padding: '1rem' }}>{loan.loanType}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatCurrency(loan.amount)}</td>
                                        <td style={{ padding: '1rem' }}>{loan.durationMonths} Months</td>
                                        <td style={{ padding: '1rem' }}>{new Date(loan.createdAt).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleLoanAction(loan.id, 'approve')} className="btn btn-outline" style={{ padding: '5px', color: 'var(--success)' }} title="Approve Loan"><CheckCircle size={16} /></button>
                                            <button onClick={() => handleLoanAction(loan.id, 'reject')} className="btn btn-outline" style={{ padding: '5px', color: 'var(--danger)' }} title="Reject Loan"><Ban size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
