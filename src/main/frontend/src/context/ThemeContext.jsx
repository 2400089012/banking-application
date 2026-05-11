import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [theme, setTheme] = useState(user?.theme || 'dark');

    useEffect(() => {
        if (user?.theme) {
            setTheme(user.theme);
        }
    }, [user]);

    useEffect(() => {
        document.body.className = theme === 'light' ? 'light-theme' : '';
    }, [theme]);

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        try {
            await api.put('/account/theme', { theme: newTheme });
        } catch (err) {
            console.error("Failed to save theme preference");
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
