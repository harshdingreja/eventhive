import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

// Holds "who is logged in" for the whole app, so any component can call useAuth()
// instead of passing the user down through props on every level.
const AuthContext = createContext(null);
const TOKEN_KEY = 'eventhive.token';

// localStorage can throw (private windows, blocked storage); the app must still work.
function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Not fatal: the user just has to log in again after a reload.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True while we check a token saved from an earlier visit, so protected pages
  // wait instead of bouncing to the login screen for a split second.
  const [checking, setChecking] = useState(() => Boolean(readToken()));

  const logout = useCallback(() => {
    writeToken(null);
    api.setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    api.onUnauthorized = logout;
    const savedToken = readToken();
    if (!savedToken) return;

    api.setToken(savedToken);
    api
      .get('/auth/me')
      .then(({ user: me }) => setUser(me))
      .catch((err) => {
        if (err.status === 401) logout(); // expired token; network errors keep it for next time
      })
      .finally(() => setChecking(false));
  }, [logout]);

  const value = useMemo(() => {
    const finishLogin = ({ token, user: loggedIn }) => {
      writeToken(token);
      api.setToken(token);
      setUser(loggedIn);
      return loggedIn;
    };
    return {
      user,
      checking,
      logout,
      login: async (email, password) => finishLogin(await api.post('/auth/login', { email, password })),
      signup: async (fields) => finishLogin(await api.post('/auth/signup', fields)),
    };
  }, [user, checking, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
