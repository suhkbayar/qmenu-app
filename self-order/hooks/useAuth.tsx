import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextProps {
  user: any; // Or the actual type of your user
  login: (userData: any) => void;
  logout: () => void;
  loading: boolean;
}

// Provide an empty object or default implementation
const AuthContext = createContext<AuthContextProps>({
  user: null,
  login: () => {},
  logout: () => {},
  loading: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const login = (userData: any) => {
    setLoading(true);
    setUser(userData);
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
