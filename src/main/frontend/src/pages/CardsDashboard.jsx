import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import api from '../services/api';
import { Wallet, Sun, Moon, LogOut, ArrowLeft, CreditCard, PlusCircle, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CardsDashboard() {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const [showForm, setShowForm] = useState(false);
    const [cardType, setCardType] = useState('Debit');

    const fetchCards = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await api.get(`/cards/user/${user.id}`);
            setCards(res.data);
        } catch (err) {
            console.error("Failed to fetch cards", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCards();
    }, [user]);

    const handleIssueCard = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/cards/issue', { userId: user.id, cardType });
            setMessage(`${cardType} Card issued successfully.`);
            setShowForm(false);
            fetchCards();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to issue card');
        }
    };

    const handleBlockCard = async (cardId) => {
        if (!window.confirm("Are you sure you want to block this card? This action cannot be undone.")) return;
        setError('');
        try {
            await api.put(`/cards/${cardId}/block`);
            setMessage('Card blocked successfully.');
            fetchCards();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to block card');
        }
    };

    const formatCardNumber = (num) => {
        return num ? num.replace(/(\d{4})/g, '$1 ').trim() : '';
    };

    return (
        <div className="app-container">
            <nav className="navbar glass-panel">
                <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/dashboard" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}><ArrowLeft size={20} /></Link>
                    <Wallet className="text-primary" />
                    <span>Card Services</span>
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
                    <h2>Your Cards</h2>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        <PlusCircle size={18} style={{ marginRight: '0.5rem' }} /> Request New Card
                    </button>
                </div>

                {showForm && (
                    <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                        <h3>Issue New Card</h3>
                        <form onSubmit={handleIssueCard} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Card Type</label>
                                <select value={cardType} onChange={(e) => setCardType(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                    <option value="Debit">Debit Card</option>
                                    <option value="Credit">Credit Card</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Confirm Request</button>
                            <button type="button" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }} onClick={() => setShowForm(false)}>Cancel</button>
                        </form>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                    {loading ? <p>Loading cards...</p> : cards.length === 0 ? (
                        <p className="text-muted" style={{ gridColumn: '1 / -1' }}>You don't have any active cards.</p>
                    ) : (
                        cards.map(card => (
                            <div key={card.id} className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: card.status === 'BLOCKED' ? 0.6 : 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <CreditCard size={32} className="text-primary" />
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', textTransform: 'uppercase', color: card.cardType === 'Credit' ? '#f59e0b' : '#10b981' }}>{card.cardType}</span>
                                </div>
                                <div style={{ fontSize: '1.4rem', letterSpacing: '2px', fontFamily: 'monospace', margin: '1rem 0' }}>
                                    {formatCardNumber(card.cardNumber)}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <div>
                                        <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Valid Thru</p>
                                        <p>{card.expiryDate}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>CVV</p>
                                        <p>***</p>
                                    </div>
                                    {card.cardType === 'Credit' && (
                                        <div>
                                            <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Limit</p>
                                            <p>₹{card.creditLimit}</p>
                                        </div>
                                    )}
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ 
                                        padding: '0.25rem 0.5rem', 
                                        borderRadius: '4px', 
                                        fontSize: '0.75rem',
                                        background: card.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)',
                                        color: '#fff'
                                    }}>
                                        {card.status}
                                    </span>
                                    {card.status === 'ACTIVE' && (
                                        <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleBlockCard(card.id)}>
                                            <ShieldAlert size={14} style={{ marginRight: '0.3rem' }} /> Block
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
