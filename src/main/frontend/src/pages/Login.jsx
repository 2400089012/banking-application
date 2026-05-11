import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Wallet, LogIn, UserPlus, Key, RefreshCw } from 'lucide-react';

export default function Login() {
    const [view, setView] = useState('login'); // login, register, reset
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    // Captcha
    const [captchaToken, setCaptchaToken] = useState('');
    const [captchaQuestion, setCaptchaQuestion] = useState('');
    const [captchaAnswer, setCaptchaAnswer] = useState('');

    // Reset Password
    const [resetMethod, setResetMethod] = useState('old'); // old, otp
    const [oldPassword, setOldPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const getPasswordStrength = (pwd) => {
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;
        return strength;
    };

    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const strengthColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'];

    const fetchCaptcha = async () => {
        try {
            const res = await api.get('/auth/captcha');
            setCaptchaQuestion(res.data.question);
            setCaptchaToken(res.data.token);
            setCaptchaAnswer('');
        } catch (err) {
            console.error("Failed to fetch captcha");
        }
    };

    useEffect(() => {
        if (view !== 'reset') fetchCaptcha();
    }, [view]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!username || !password || !captchaAnswer) {
            setError('Please fill in all fields including CAPTCHA');
            return;
        }

        try {
            if (view === 'login') {
                const res = await api.post('/auth/login', { username, password, captchaToken, captchaAnswer: parseInt(captchaAnswer, 10) });
                login(res.data.token, res.data.user);
                if (res.data.user.role === 'admin') navigate('/admin');
                else navigate('/');
            } else if (view === 'register') {
                await api.post('/auth/register', { username, password });
                setView('login');
                setUsername('');
                setPassword('');
                alert("Registration successful! Please wait for admin approval before logging in.");
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
            if (err.response?.status === 400 && err.response?.data?.error?.includes('CAPTCHA')) {
                fetchCaptcha(); // reload captcha if it was wrong
            }
        }
    };

    const handleRequestOtp = async () => {
        if (!username) return setError('Enter username first');
        try {
            const res = await api.post('/auth/request-otp', { username });
            alert(res.data.message + " OTP: " + res.data.otp);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to request OTP');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/auth/change-password', {
                username,
                newPassword,
                oldPassword: resetMethod === 'old' ? oldPassword : null,
                otp: resetMethod === 'otp' ? otp : null
            });
            alert('Password changed successfully! Please login.');
            setView('login');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change password');
        }
    };

    return (
        <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', marginTop: '-2rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <Wallet size={48} className="text-primary" style={{ margin: '0 auto 1rem' }} />
                    <h2>{view === 'login' ? 'Welcome Back' : view === 'register' ? 'Create Account' : 'Reset Password'}</h2>
                    <p className="text-muted">Professional BANK OF INDIA</p>
                </div>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

                {view === 'reset' ? (
                    <form onSubmit={handlePasswordChange}>
                        <div className="input-group">
                            <label>Username</label>
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <button type="button" className={`btn ${resetMethod === 'old' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setResetMethod('old')} style={{ flex: 1, padding: '0.5rem' }}>Old Password</button>
                            <button type="button" className={`btn ${resetMethod === 'otp' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setResetMethod('otp')} style={{ flex: 1, padding: '0.5rem' }}>OTP</button>
                        </div>

                        {resetMethod === 'old' ? (
                            <div className="input-group">
                                <label>Old Password</label>
                                <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
                            </div>
                        ) : (
                            <div className="input-group">
                                <label>OTP</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                                    <button type="button" className="btn btn-outline" onClick={handleRequestOtp}>Get OTP</button>
                                </div>
                            </div>
                        )}

                        <div className="input-group">
                            <label>New Password</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                            {newPassword && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} style={{ flex: 1, background: i <= getPasswordStrength(newPassword) ? strengthColors[getPasswordStrength(newPassword)] : 'rgba(0,0,0,0.1)', borderRadius: '2px' }}></div>
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '10px', color: strengthColors[getPasswordStrength(newPassword)] }}>{strengthLabels[getPasswordStrength(newPassword)]}</span>
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                            <Key size={18} /> Change Password
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Username</label>
                            <input type="text" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>Password</label>
                            <input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
                            {view === 'register' && password && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} style={{ flex: 1, background: i <= getPasswordStrength(password) ? strengthColors[getPasswordStrength(password)] : 'rgba(0,0,0,0.1)', borderRadius: '2px' }}></div>
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '10px', color: strengthColors[getPasswordStrength(password)] }}>{strengthLabels[getPasswordStrength(password)]}</span>
                                </div>
                            )}
                        </div>

                        <div className="input-group">
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                Security Question
                                <button type="button" onClick={fetchCaptcha} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', minWidth: '100px', textAlign: 'center' }}>{captchaQuestion}</span>
                                <input type="number" placeholder="Answer" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} style={{ flex: 1 }} />
                            </div>
                        </div>
                        
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                            {view === 'login' ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Register</>}
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {view !== 'reset' && (
                        <div>
                            <span className="text-muted">{view === 'login' ? "Don't have an account? " : "Already have an account? "}</span>
                            <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                                {view === 'login' ? 'Register now' : 'Sign in'}
                            </button>
                        </div>
                    )}
                    {view === 'login' && (
                        <button onClick={() => { setView('reset'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
                            Forgot or Change Password?
                        </button>
                    )}
                    {view === 'reset' && (
                        <button onClick={() => { setView('login'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
                            Back to Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
