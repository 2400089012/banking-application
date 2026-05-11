import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import api from '../services/api';
import { Wallet, Bell, Sun, Moon, LogOut, ArrowLeft, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LoansDashboard() {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    // Form state
    const [showForm, setShowForm] = useState(false);
    const [loanType, setLoanType] = useState('Personal');
    const [amount, setAmount] = useState('');
    const [durationMonths, setDurationMonths] = useState(12);

    const fetchLoans = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await api.get(`/loans/user/${user.id}`);
            setLoans(res.data);
        } catch (err) {
            console.error("Failed to fetch loans", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLoans();
    }, [user]);

    const handleApply = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const payload = {
                userId: user.id,
                loanType,
                amount: parseFloat(amount),
                durationMonths: parseInt(durationMonths)
            };
            await api.post('/loans/apply', payload);
            setMessage('Loan application submitted successfully and is pending approval.');
            setShowForm(false);
            setAmount('');
            setDurationMonths(12);
            fetchLoans();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to apply for loan');
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    return (
        <div className="app-container">
            <nav className="navbar glass-panel">
                <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/dashboard" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}><ArrowLeft size={20} /></Link>
                    <Wallet className="text-primary" />
                    <span>Loan Services</span>
                </div>
                <div className="navbar-links">
                    <button onClick={toggleTheme} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <span className="text-muted">Welcome, <strong className="text-main">{user?.username}</strong></span>
                    <button onClick={logout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </nav>

            {message && <div className="toast success">{message}</div>}
            {error && <div className="toast error">{error}</div>}

            <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2>Your Active & Pending Loans</h2>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        <PlusCircle size={18} style={{ marginRight: '0.5rem' }} /> Apply for New Loan
                    </button>
                </div>

                {showForm && (
                    <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                        <h3>Loan Application Form</h3>
                        <form onSubmit={handleApply} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                            <div className="input-group">
                                <label>Loan Type</label>
                                <select value={loanType} onChange={(e) => setLoanType(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                    <option value="Personal">Personal Loan (12%)</option>
                                    <option value="Home">Home Loan (7.5%)</option>
                                    <option value="Auto">Auto Loan (8.5%)</option>
                                    <option value="Education">Education Loan (12%)</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Amount (INR)</label>
                                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                            </div>
                            <div className="input-group">
                                <label>Duration (Months)</label>
                                <input type="number" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} required />
                            </div>
                            <div style={{ gridColumn: 'span 3', display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary">Submit Application</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="glass-panel">
                    {loading ? <p>Loading loans...</p> : loans.length === 0 ? (
                        <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>You have no loan history.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem' }}>Type</th>
                                    <th style={{ padding: '1rem' }}>Amount</th>
                                    <th style={{ padding: '1rem' }}>Interest Rate</th>
                                    <th style={{ padding: '1rem' }}>Duration</th>
                                    <th style={{ padding: '1rem' }}>Status</th>
                                    <th style={{ padding: '1rem' }}>Applied On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loans.map(loan => (
                                    <tr key={loan.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>{loan.loanType}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatCurrency(loan.amount)}</td>
                                        <td style={{ padding: '1rem' }}>{loan.interestRate}%</td>
                                        <td style={{ padding: '1rem' }}>{loan.durationMonths} Months</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ 
                                                padding: '0.25rem 0.5rem', 
                                                borderRadius: '4px', 
                                                fontSize: '0.8rem',
                                                background: loan.status === 'APPROVED' ? 'var(--success)' : loan.status === 'REJECTED' ? 'var(--danger)' : 'var(--primary)',
                                                color: '#fff'
                                            }}>
                                                {loan.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{new Date(loan.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
