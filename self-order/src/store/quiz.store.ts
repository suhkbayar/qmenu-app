import create from 'zustand';

interface IQuizStore {
  visible: boolean;
  mounted: boolean;
  openQuiz: () => void;
  closeQuiz: () => void;
}

export const useQuizStore = create<IQuizStore>((set: any) => ({
  visible: false,
  mounted: false,
  openQuiz: () => set({ visible: true, mounted: true }),
  closeQuiz: () => set({ visible: false }),
}));
