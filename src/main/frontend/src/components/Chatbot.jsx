import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hello! I am your Professional Bank Assistant. How can I help you today?", isBot: true }
    ]);
    const [input, setInput] = useState('');

    const faqs = {
        "balance": "You can view your total balance at the top of your dashboard. It updates in real-time after every transaction.",
        "transfer": "To transfer money, click the 'Transfer' button, enter the recipient's username, amount, and category.",
        "withdraw": "Withdrawals can be made by clicking the 'Withdraw' button. Please ensure you have sufficient funds.",
        "deposit": "Deposits are instant! Just click the 'Deposit' button and enter the amount.",
        "budget": "You can set a monthly spending limit in the 'Monthly Budget' section to track your expenses.",
        "help": "I can help you with balance queries, transfers, withdrawals, deposits, and budget tracking. Just ask!"
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.toLowerCase();
        setMessages([...messages, { text: input, isBot: false }]);
        setInput('');

        setTimeout(() => {
            let reply = "I'm sorry, I didn't understand that. You can ask about 'balance', 'transfer', 'deposit', or 'budget'.";
            for (let key in faqs) {
                if (userMsg.includes(key)) {
                    reply = faqs[key];
                    break;
                }
            }
            setMessages(prev => [...prev, { text: reply, isBot: true }]);
        }, 600);
    };

    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
            {isOpen ? (
                <div className="glass-panel" style={{ width: '300px', height: '400px', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageCircle size={20} />
                            <span style={{ fontWeight: 600 }}>Bank Assistant</span>
                        </div>
                        <X size={20} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
                    </div>
                    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {messages.map((m, i) => (
                            <div key={i} style={{ 
                                alignSelf: m.isBot ? 'flex-start' : 'flex-end',
                                background: m.isBot ? 'var(--input-bg)' : 'var(--primary)',
                                color: m.isBot ? 'var(--text-main)' : 'white',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                borderBottomLeftRadius: m.isBot ? '0' : '12px',
                                borderBottomRightRadius: m.isBot ? '12px' : '0',
                                maxWidth: '80%',
                                fontSize: '14px'
                            }}>
                                {m.text}
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                        <input 
                            type="text" 
                            placeholder="Ask a question..." 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)}
                            style={{ padding: '8px' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '8px' }}>
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            ) : (
                <button 
                    className="btn btn-primary" 
                    style={{ borderRadius: '50%', width: '60px', height: '60px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                    onClick={() => setIsOpen(true)}
                >
                    <MessageCircle size={24} />
                </button>
            )}
        </div>
    );
}
