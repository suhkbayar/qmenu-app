import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DrawerContextType {
  drawerVisible: boolean;
  setDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);

  return <DrawerContext.Provider value={{ drawerVisible, setDrawerVisible }}>{children}</DrawerContext.Provider>;
};

export const useDraw = () => {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
