import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { qmenuConfigs } from '@/src/constants';
import { IConfig, ICustomerTable, IParticipant } from '@/src/types';

/** A config value from the server: JSON when it parses, the raw string otherwise. */
const parseConfig = (value: string): any | null => {
  try {
    return value === undefined ? null : JSON.parse(value);
  } catch (error) {
    return value;
  }
};

interface SessionState {
  /** The logged-in table: branch, table, menu, payment methods and settings */
  participant: IParticipant | null;
  /** Branch settings (gift orders, sit together, …) parsed from participant.configs */
  config: IConfig | null;
  /** Tables this tablet has logged into, listed on the table-code screen */
  tables: ICustomerTable[];

  setParticipant: (participant: IParticipant) => void;
  /** Adds tables to the saved list, replacing any with the same code. */
  setTables: (tables: ICustomerTable[]) => void;
  deleteTable: (code: string) => void;
}

// participant.configs is a list of { name, value }; keep the ones the app knows, under their app-side names
const parseConfigs = (participant: IParticipant): Record<string, unknown> => {
  const config: Record<string, unknown> = {};
  for (const { name, value } of participant.configs ?? []) {
    const known = qmenuConfigs.find((c) => c.value === name);
    if (known) config[known.name] = parseConfig(value);
  }
  return config;
};

const sameConfig = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => a[key] === b[key]);

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      participant: null,
      config: null,
      tables: [],

      setParticipant: (participant) => {
        const next = parseConfigs(participant);
        const previous = get().config as Record<string, unknown> | null;
        // Keep the same config object when nothing changed, so screens reading it don't re-render
        set({ participant, config: (previous && sameConfig(previous, next) ? previous : next) as IConfig });
      },

      setTables: (tables) =>
        set((state) => {
          const merged = [...state.tables];
          for (const table of tables) {
            const index = merged.findIndex((t) => t.code === table.code);
            if (index > -1) merged[index] = table;
            else merged.push(table);
          }
          return { tables: merged };
        }),

      deleteTable: (code) => set((state) => ({ tables: state.tables.filter((t) => t.code !== code) })),
    }),
    {
      // Same key as the old store, so tablets keep their saved tables after the update
      name: 'call-storage-array',
      storage: createJSONStorage(() => AsyncStorage),
      // The menu is large and always refetched, so it isn't saved
      partialize: (state) => ({
        tables: state.tables,
        config: state.config,
        participant: state.participant ? ({ ...state.participant, menu: undefined } as unknown as IParticipant) : null,
      }),
    },
  ),
);
