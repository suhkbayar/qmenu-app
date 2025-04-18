import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ValidContextType {
  valid: boolean;
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
  const [valid, setValid] = useState(false);

  return <ValidContext.Provider value={{ valid, setValid }}>{children}</ValidContext.Provider>;
};
