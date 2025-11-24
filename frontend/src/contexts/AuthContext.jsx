import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

// Backend URL from Vite env with a sensible default for development.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

/*
 * This provider should export a `user` context state that is 
 * set (to non-null) when:
 *     1. a hard reload happens while a user is logged in.
 *     2. the user just logged in.
 * `user` should be set to null when:
 *     1. a hard reload happens when no users are logged in.
 *     2. the user just logged out.
 */
export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUser(null);
            return;
        }

        const fetchUserData = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/user/me`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json','Authorization': `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    console.error('Failed to fetch user data', err?.message || res.statusText);
                    localStorage.removeItem('token');
                    setUser(null);
                    return;
                }

                const data = await res.json();
                setUser(data.user || null);
            } catch (e) {
                console.error('Error fetching user data:', e);
                setUser(null);
            }
        };

        fetchUserData();
    }, []);

    /*
     * Logout the currently authenticated user.
     *
     * @remarks This function will always navigate to "/".
     */
    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate("/");
    };

    /**
     * Login a user with their credentials.
     *
     * @remarks Upon success, navigates to "/profile". 
     * @param {string} username - The username of the user.
     * @param {string} password - The password of the user.
     * @returns {string} - Upon failure, Returns an error message.
     */
    const login = async (username, password) => {
        try {

            const res = await fetch(`${BACKEND_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                return data?.message || 'login failed';
            }
            const data = await res.json();
            if (!data || !data.token) {
                return 'no token';
            }
            localStorage.setItem('token', data.token);

            try {
                const profileRes = await fetch(`${BACKEND_URL}/user/me`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${data.token}`,
                    },
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setUser(profileData.user || null);
                } else {
                    setUser(null);
                }
            } catch {
                setUser(null);
            }

            navigate('/profile');
            return "";
        } catch (e) {
            console.error('Login error:', e);
            return 'unable to login';
        }
    };

    /**
     * Registers a new user. 
     * 
     * @remarks Upon success, navigates to "/".
     * @param {Object} userData - The data of the user to register.
     * @returns {string} - Upon failure, returns an error message.
     */
    const register = async (userData) => {
        try {
            const res = await fetch(`${BACKEND_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                return data?.message || 'registration failed';
            }

            navigate('/success');
            return "";
        } catch (e) {
            console.error('Register error:', e);
            return 'unable to register';
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
