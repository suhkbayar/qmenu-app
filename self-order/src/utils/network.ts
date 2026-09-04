type Listener = (offline: boolean) => void;

let offline = false;
const listeners = new Set<Listener>();

export const isOffline = () => offline;

export const setOffline = (next: boolean) => {
  if (offline === next) return;

  offline = next;
  listeners.forEach((listener) => listener(offline));
};

export const subscribeNetwork = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
