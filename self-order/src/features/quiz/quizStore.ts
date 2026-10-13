import { create } from 'zustand';

export const MBANK_QUIZ_URL = 'https://quiz.m-bank.mn/';

// A closed quiz stays loaded this long (a guest coming straight back keeps their progress),
// then the page is unloaded so it doesn't hold memory and keep running all day
const UNLOAD_AFTER_MS = 5 * 60 * 1000;

type QuizState = {
  visible: boolean;
  /** The quiz page is loaded (shown, or closed less than 5 minutes ago) */
  mounted: boolean;
  openQuiz: () => void;
  closeQuiz: () => void;
};

let unloadTimer: ReturnType<typeof setTimeout> | undefined;

export const useQuizStore = create<QuizState>()((set) => ({
  visible: false,
  mounted: false,
  openQuiz: () => {
    clearTimeout(unloadTimer);
    set({ visible: true, mounted: true });
  },
  closeQuiz: () => {
    set({ visible: false });
    clearTimeout(unloadTimer);
    unloadTimer = setTimeout(() => set({ mounted: false }), UNLOAD_AFTER_MS);
  },
}));
