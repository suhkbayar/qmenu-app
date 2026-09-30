import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { isValidToken } from '@/src/providers/auth';
import { getStorage } from '@/src/store/storage';

interface ValidContextType {
  valid: boolean | null;
  setValid: (valid: boolean) => void;
}

const ValidContext = createContext<ValidContextType | null>(null);

export const useValid = () => {
  const context = useContext(ValidContext);
  if (context === null) {
    throw new Error('useValid must be used within a ValidProvider');
  }
  return context;
};

interface ValidProviderProps {
  children: ReactNode;
}

export const ValidProvider = ({ children }: ValidProviderProps) => {
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([isValidToken(), getStorage('participantId')])
      .then(([tokenOk, participantId]) => setValid((v) => v ?? (tokenOk && !!participantId)))
      .catch(() => setValid((v) => v ?? false));
  }, []);

  const value = useMemo(() => ({ valid, setValid }), [valid]);
  return <ValidContext.Provider value={value}>{children}</ValidContext.Provider>;
};
