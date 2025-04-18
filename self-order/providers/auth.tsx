import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getStorage, removeStorage, setStorage } from '@/cache';
import { isEmpty } from 'lodash';
import { DEFAULT_TOKEN } from '@/constants/token';
import jwtDecode from 'jwt-decode';

export type Payload = {
  branch: string;
  role: string;
  exp: number;
  features: string[];
  sub: string;
};

const getAccessToken = async () => {
  return await getStorage('token');
};

export const isValidToken = async () => {
  const token = await getAccessToken();
  if (isEmpty(token)) return false;
  try {
    const { exp }: Payload = jwtDecode(token as string);
    if (exp * 1000 < new Date().getTime()) return false;
    return true;
  } catch (e) {
    return false;
  }
};

export const getToken = async () => {
  let validToken = await isValidToken();

  if (validToken) return getAccessToken();

  return DEFAULT_TOKEN;
};

export const setAccessToken = (token: string) => setStorage('token', token);

export const setParticipantId = (id: string) => setStorage('participantId', id);

export const getPayload = async (): Promise<Payload | null> => {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const payload: Payload = jwtDecode(token as string);
    return payload;
  } catch (e) {
    return null;
  }
};

interface AuthContextType {
  isAuthenticated: boolean;
  authenticate: (token: string, cb: Function) => void;
  signOut: () => void;
}

export const AuthContext = createContext({} as AuthContextType);

export const AuthProvider = ({ children }: any) => {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = async () => {
      const validToken = await isValidToken();
      setAuthenticated(validToken);
    };
    checkAuth();
  }, []);

  const authenticate = useCallback((token: string, cb: Function) => {
    setAccessToken(token);
    setAuthenticated(true);
    if (cb) setTimeout(cb, 100);
  }, []);

  const signOut = useCallback(() => {
    removeStorage('token');
    setAuthenticated(false);
  }, []);

  const defaultContext = useMemo<AuthContextType>(() => {
    return { isAuthenticated, authenticate, signOut };
  }, [isAuthenticated, authenticate, signOut]);

  return <AuthContext.Provider value={defaultContext}>{children}</AuthContext.Provider>;
};
