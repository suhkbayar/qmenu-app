import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface DrawerContextType {
  drawerVisible: boolean;
  setDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);

  const value = useMemo(() => ({ drawerVisible, setDrawerVisible }), [drawerVisible]);

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
};

export const useDraw = () => {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useDraw must be used within a DrawerProvider');
  }
  return context;
};
