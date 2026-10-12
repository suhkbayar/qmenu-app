import { create } from 'zustand';

export const MBANK_QUIZ_URL = 'https://quiz.m-bank.mn/';

// Temporary: branches that show the Mbank quiz. Add branch IDs here and publish with eas update
export const MBANK_QUIZ_BRANCHES: string[] = [
  '4b563574-b2eb-45a2-9eee-5b26a4bf334f',
  'e50fb5e4-92bd-419e-acc1-fc16a755f376',
  'e2b644ff-a6a3-4db1-8935-14be83618e7c',
  '23e7fbd9-67a5-4f4f-b296-6019ac93d1f8',
  '8536b7ec-cd14-44d7-9884-43b9ee5979f9',
];

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
