import create from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/src/constants/Colors';

const storage: StateStorage = {
  getItem: async (name) => (await AsyncStorage.getItem(name)) ?? null,
  setItem: async (name, value) => AsyncStorage.setItem(name, value),
  removeItem: async (name) => AsyncStorage.removeItem(name),
};

interface IThemeStore {
  isDark: boolean;
  toggleTheme: () => void;
  theme: typeof Colors.light;
}

export const useThemeStore = create<IThemeStore>(
  persist(
    (set, get) => ({
      isDark: false,
      theme: Colors.light,
      toggleTheme: () => {
        const next = !get().isDark;
        set({ isDark: next, theme: next ? Colors.dark : Colors.light });
      },
    }),
    {
      name: 'theme-storage',
      getStorage: () => storage,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.theme = state.isDark ? Colors.dark : Colors.light;
        }
      },
    },
  ),
);
